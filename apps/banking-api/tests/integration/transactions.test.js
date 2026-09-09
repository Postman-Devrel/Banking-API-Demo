const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/database/db');

describe('Atomic transaction API', () => {
  const run = 'transactions-test';
  let sequence;
  const call = (method, path, key = '1234') => request(app)[method](path)
    .set('X-API-Key', key).set('X-Demo-Run-Id', run)
    .set('Idempotency-Key', `transaction-${++sequence}`);
  const transfer = { fromAccountId: '1', toAccountId: '2', amount: 100, currency: 'COSMIC_COINS' };

  beforeEach(() => { sequence = 0; db.resetRun(run); jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  test('lists visible immutable transactions with filters and retrieves one', async () => {
    const list = await call('get', '/api/v1/transactions').query({ fromAccountId: '1' }).expect(200);
    expect(list.body.transactions.map(value => value.transactionId)).toEqual(['1', 'TX-1008', 'TX-1015', 'TX-1038', 'TX-1042', 'TX-1060']);
    expect((await call('get', '/api/v1/transactions/TX-1042').expect(200)).body.transaction.status).toBe('POSTED');
  });

  test('commits balances and ledger atomically, and exact replay has no side effects', async () => {
    const before = [db.getAccountById('1', run).balance, db.getAccountById('2', run).balance];
    const first = await request(app).post('/api/v1/transactions').set('X-API-Key', '1234')
      .set('X-Demo-Run-Id', run).set('Idempotency-Key', 'atomic-transfer').send(transfer).expect(201);
    const replay = await request(app).post('/api/v1/transactions').set('X-API-Key', '1234')
      .set('X-Demo-Run-Id', run).set('Idempotency-Key', 'atomic-transfer').send(transfer).expect(201);
    expect(replay.body).toEqual(first.body);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(db.getAccountById('1', run).balance).toBe(before[0] - 100);
    expect(db.getAccountById('2', run).balance).toBe(before[1] + 100);
    expect(db.getTransactions({}, run)).toHaveLength(10);
  });

  test.each([
    [{ fromAccountId: '1', toAccountId: '2', amount: 999999, currency: 'COSMIC_COINS' }, 409],
    [{ fromAccountId: 'missing', toAccountId: '2', amount: 1, currency: 'COSMIC_COINS' }, 404],
    [{ fromAccountId: '1', toAccountId: 'missing', amount: 1, currency: 'COSMIC_COINS' }, 404],
    [{ fromAccountId: '1', toAccountId: '3', amount: 1, currency: 'COSMIC_COINS' }, 400]
  ])('rolls back invalid transfers %#', async (body, status) => {
    const before = [db.getAccountById('1', run).balance, db.getAccountById('2', run).balance, db.getTransactions({}, run).length];
    await call('post', '/api/v1/transactions').send(body).expect(status);
    expect([db.getAccountById('1', run).balance, db.getAccountById('2', run).balance, db.getTransactions({}, run).length]).toEqual(before);
  });

  test('rejects inactive accounts and allows only participant principals to read', async () => {
    db.getRun(run).accounts.get('1').deleted = true;
    await call('post', '/api/v1/transactions').send(transfer).expect(404);
    db.resetRun(run);
    db.getRun(run).accounts.get('1').status = 'INACTIVE';
    await call('post', '/api/v1/transactions').send(transfer).expect(404);
    db.resetRun(run);
    const destination = db.generateApiKey(run, { role: 'CUSTOMER', customerId: 'CUS-1001' });
    const unrelated = db.generateApiKey(run, { role: 'CUSTOMER', customerId: 'CUS-1001' });
    db.getRun(run).accounts.get('2').ownerPrincipalId = destination.principal.principalId;
    await call('get', '/api/v1/transactions/TX-1042', destination.apiKey).expect(200);
    await call('get', '/api/v1/transactions/TX-1042', unrelated.apiKey).expect(403);
  });
});
