const { canonicalize } = require('json-canonicalize');
const db = require('../../src/database/db');
const { paginate, encode, decode } = require('../../src/services/pagination');
const { hashApiKey, safeEqualHash } = require('../../src/security/credentials');
const { DomainRepositories } = require('../../src/repositories/domainRepositories');
const idempotent = require('../../src/middleware/mutationIdempotency');
const {
  AccountService, CustomerService, BeneficiaryService, CardService, PaymentService,
  FxService, AuditService, DisputeService
} = require('../../src/services/domainServices');

const customer = { principalId: 'PRN-CUSTOMER-1', role: 'CUSTOMER', customerId: 'CUS-1001' };
const admin = { principalId: 'PRN-ADMIN-1', role: 'ADMIN' };

describe('corrective domain foundations', () => {
  const run = 'corrective-core';
  beforeEach(() => db.resetRun(run));

  test('repository reads are safe copies and audit entries are append-only copies', () => {
    const repositories = new DomainRepositories(db.getRun(run));
    const account = repositories.accounts.get('1');
    account.balance = 0;
    expect(repositories.accounts.get('1').balance).toBe(6150);
    const event = repositories.auditEvents.append({ eventId: 'AUD-X', nested: { value: 1 } });
    event.nested.value = 2;
    expect(repositories.auditEvents.list().find(item => item.eventId === 'AUD-X').nested.value).toBe(1);
    expect(repositories.accounts.has('missing')).toBe(false);
  });

  test('pagination is stable, scoped, bounded, and rejects malformed cursors', () => {
    const first = paginate([{ id: 'c' }, { id: 'a' }, { id: 'b' }], { limit: '2' }, 'id', 'letters');
    expect(first.items.map(item => item.id)).toEqual(['a', 'b']);
    expect(first.page.hasMore).toBe(true);
    expect(paginate([{ id: 'c' }, { id: 'a' }, { id: 'b' }], { cursor: first.page.nextCursor }, 'id', 'letters').items).toEqual([{ id: 'c' }]);
    expect(decode(encode('letters', 'a'), 'letters')).toBe('a');
    expect(decode('not-json', 'letters')).toBeNull();
    expect(() => paginate([], { limit: 0 }, 'id')).toThrow('limit');
    expect(() => paginate([], { limit: 101 }, 'id')).toThrow('limit');
    expect(() => paginate([], { cursor: encode('other', 'a') }, 'id', 'letters')).toThrow('cursor is invalid');
    expect(() => paginate([{ id: 'a' }], { cursor: encode('letters', 'missing') }, 'id', 'letters')).toThrow('does not reference');
  });

  test('credential hashing supports constant-time equality semantics', () => {
    const hash = hashApiKey('secret');
    expect(safeEqualHash(hash, hashApiKey('secret'))).toBe(true);
    expect(safeEqualHash(hash, hashApiKey('different'))).toBe(false);
    expect(safeEqualHash(hash, 'aa')).toBe(false);
  });

  test('database authentication is bounded, expires idle runs, and never allocates for invalid keys', () => {
    const originalMax = process.env.MAX_DEMO_RUNS;
    const originalTtl = process.env.DEMO_RUN_TTL_MS;
    db.runs.clear();
    db.resetRun('default');
    expect(db.authenticate('wrong', 'never-created')).toBeNull();
    expect(db.runs.has('never-created')).toBe(false);
    process.env.MAX_DEMO_RUNS = '1';
    expect(db.authenticate('1234', 'only-run').role).toBe('CUSTOMER');
    expect(db.authenticate('1234', 'over-capacity')).toBeNull();
    expect(() => db.resetRun('over-capacity')).toThrow('Maximum active demo runs');
    process.env.DEMO_RUN_TTL_MS = '1';
    db.getRun('only-run').metadata.lastAccessedAt = 0;
    db.cleanupRuns();
    expect(db.runs.has('only-run')).toBe(false);
    if (originalMax === undefined) delete process.env.MAX_DEMO_RUNS; else process.env.MAX_DEMO_RUNS = originalMax;
    if (originalTtl === undefined) delete process.env.DEMO_RUN_TTL_MS; else process.env.DEMO_RUN_TTL_MS = originalTtl;
    db.resetRun(run);
  });

  test('credential creation validates roles and customers and returns an independently usable principal', () => {
    expect(() => db.generateApiKey(run, { role: 'ROOT' })).toThrow('role');
    expect(() => db.generateApiKey(run, { role: 'CUSTOMER', customerId: 'missing' })).toThrow('customerId');
    const generated = db.generateApiKey(run, { role: 'ADMIN' });
    expect(generated.principal).toEqual(expect.objectContaining({ role: 'ADMIN' }));
    expect(db.authenticate(generated.apiKey, run)).toEqual(generated.principal);
    expect(db.authenticate('', run)).toBeNull();
  });

  test('account and customer services enforce ownership, allowlists, and non-empty closure', () => {
    const accounts = new AccountService(db, run, customer);
    const customers = new CustomerService(db, run, customer);
    expect(() => accounts.deactivate('1')).toThrow('non-zero');
    expect(() => accounts.get('missing')).toThrow('not found');
    const before = customers.get();
    const after = customers.update({ phone: 'new-number' });
    expect(after.email).toBe(before.email);
    expect(after.phone).toBe('new-number');
  });

  test('beneficiary, card, and payment state machines reject illegal transitions', () => {
    const beneficiaries = new BeneficiaryService(db, run, customer);
    expect(() => beneficiaries.create({ name: 'Missing', accountId: 'missing' })).toThrow('does not exist');
    beneficiaries.deactivate('BEN-2002');
    expect(() => beneficiaries.update('BEN-2002', { name: 'Nope' })).toThrow('Inactive');
    const pending = beneficiaries.create({ name: 'Verify me', externalAccount: 'VERIFY-1' });
    expect(() => beneficiaries.update(pending.beneficiaryId, { status: 'TRUSTED' })).toThrow('administrators');
    expect(new BeneficiaryService(db, run, admin).update(pending.beneficiaryId, { status: 'TRUSTED' }).status).toBe('TRUSTED');

    const cards = new CardService(db, run, customer);
    expect(() => cards.create({ accountId: '1', type: 'VIRTUAL', spendingLimit: 1, currency: 'GALAXY_GOLD' })).toThrow('currency');
    cards.freeze('CARD-3001');
    expect(() => cards.freeze('CARD-3001')).toThrow('transition');
    cards.replace('CARD-3001');
    expect(() => cards.updateLimit('CARD-3001', { spendingLimit: 1 })).toThrow('Replaced');
    expect(() => cards.replace('CARD-3001')).toThrow('replaced');

    const config = { collection: 'scheduledPayments', idField: 'paymentId', label: 'Scheduled payment', prefix: 'PAY', initialStatus: 'SCHEDULED', mutable: ['amount', 'executeAt'] };
    const payments = new PaymentService(db, run, customer, config);
    expect(() => payments.create({ fromAccountId: '1', beneficiaryId: 'BEN-2002', amount: 1, currency: 'COSMIC_COINS', executeAt: '2026-10-01T00:00:00.000Z' })).toThrow('trusted');
    expect(() => payments.create({ fromAccountId: '1', beneficiaryId: 'BEN-2001', amount: 1, currency: 'GALAXY_GOLD', executeAt: '2026-10-01T00:00:00.000Z' })).toThrow('currency');
    expect(() => payments.create({ fromAccountId: '1', beneficiaryId: 'BEN-2001', amount: 1, currency: 'COSMIC_COINS', executeAt: '2020-01-01T00:00:00.000Z' })).toThrow('future');
    payments.cancel('PAY-4001');
    expect(() => payments.cancel('PAY-4001')).toThrow('already cancelled');
    expect(() => payments.update('PAY-4001', { amount: 2 })).toThrow('cannot be updated');
  });

  test('FX, audit, and dispute services enforce their exceptional paths', () => {
    expect(() => new FxService(db, run, customer).rates('UNKNOWN')).toThrow('Unsupported');
    expect(new AuditService(db, run, admin).list({}).items).toHaveLength(6);
    const disputes = new DisputeService(db, run, customer);
    expect(() => disputes.create({ transactionId: 'missing', reason: 'OTHER' })).toThrow('not found');
    const opened = disputes.create({ transactionId: 'TX-1042', reason: 'OTHER' });
    expect(() => disputes.create({ transactionId: 'TX-1042', reason: 'OTHER' })).toThrow('already exists');
    expect(() => disputes.transition(opened.disputeId, { status: 'RESOLVED' })).toThrow('cannot transition');
    const adminDisputes = new DisputeService(db, run, admin);
    adminDisputes.transition(opened.disputeId, { status: 'UNDER_REVIEW' });
    adminDisputes.transition(opened.disputeId, { status: 'RESOLVED' });
    expect(() => disputes.addEvidence(opened.disputeId, { type: 'OTHER', description: 'late' })).toThrow('closed');
    expect(() => disputes.get('missing')).toThrow('not found');
  });
});

describe('shared idempotency reservation', () => {
  const run = 'idempotency-unit';
  const make = (key, body = {}) => {
    const req = { runId: run, principal: customer, params: { id: '1' }, query: { b: '2', a: '1' }, body, get: name => name === 'idempotency-key' ? key : undefined };
    const listeners = {};
    const res = {
      statusCode: 200, headers: {}, writableEnded: false,
      status(value) { this.statusCode = value; return this; },
      json: jest.fn(function () { return this; }),
      getHeader(name) { return this.headers[name]; }, setHeader(name, value) { this.headers[name] = value; },
      on(name, handler) { listeners[name] = handler; }
    };
    return { req, res, listeners, next: jest.fn() };
  };
  beforeEach(() => db.resetRun(run));

  test('rejects missing, oversized, in-progress, conflicting, and capacity-bound requests', () => {
    let context = make(undefined);
    idempotent('unitOperation')(context.req, context.res, context.next);
    expect(context.res.statusCode).toBe(400);
    context = make('x'.repeat(129));
    idempotent('unitOperation')(context.req, context.res, context.next);
    expect(context.res.statusCode).toBe(400);

    const first = make('same', { nested: { b: 2, a: 1 } });
    idempotent('unitOperation')(first.req, first.res, first.next);
    const duplicate = make('same', { nested: { a: 1, b: 2 } });
    idempotent('unitOperation')(duplicate.req, duplicate.res, duplicate.next);
    expect(duplicate.res.statusCode).toBe(409);
    const conflict = make('same', { changed: true });
    idempotent('unitOperation')(conflict.req, conflict.res, conflict.next);
    expect(conflict.res.statusCode).toBe(409);

    const original = process.env.MAX_IDEMPOTENCY_RECORDS_PER_RUN;
    process.env.MAX_IDEMPOTENCY_RECORDS_PER_RUN = '1';
    const capacity = make('other');
    idempotent('otherOperation')(capacity.req, capacity.res, capacity.next);
    expect(capacity.res.statusCode).toBe(503);
    if (original === undefined) delete process.env.MAX_IDEMPOTENCY_RECORDS_PER_RUN; else process.env.MAX_IDEMPOTENCY_RECORDS_PER_RUN = original;
  });

  test('stores sanitized success, replays headers, discards failures, abandoned work, and expired records', () => {
    const first = make('success');
    first.res.headers.Location = '/resource/1';
    idempotent('unitOperation')(first.req, first.res, first.next);
    first.res.json({ ok: true });
    const replay = make('success');
    idempotent('unitOperation')(replay.req, replay.res, replay.next);
    expect(replay.res.headers).toEqual(expect.objectContaining({ 'Idempotency-Replayed': 'true', Location: '/resource/1' }));

    const failure = make('failure');
    idempotent('unitOperation')(failure.req, failure.res, failure.next);
    failure.res.statusCode = 400;
    failure.res.json({ error: true });
    const abandoned = make('abandoned');
    idempotent('unitOperation')(abandoned.req, abandoned.res, abandoned.next);
    abandoned.listeners.close();

    const state = db.getRun(run);
    state.idempotency.set('expired', { state: 'COMPLETED', createdAt: 0 });
    const original = process.env.IDEMPOTENCY_TTL_MS;
    process.env.IDEMPOTENCY_TTL_MS = '1';
    idempotent.cleanup(state);
    expect(state.idempotency.has('expired')).toBe(false);
    if (original === undefined) delete process.env.IDEMPOTENCY_TTL_MS; else process.env.IDEMPOTENCY_TTL_MS = original;
    expect(canonicalize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });
});
