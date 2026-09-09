const request = require('supertest');
const express = require('express');
const db = require('../../src/database/db');
const requestContext = require('../../src/middleware/requestContext');
const adminRoutes = require('../../src/routes/admin');
const accountRoutes = require('../../src/routes/accounts');
const transactionRoutes = require('../../src/routes/transactions');
const disputeRoutes = require('../../src/routes/disputes');
const demoRoutes = require('../../src/routes/demo');

const app = express();
app.use(express.json());
app.use(requestContext);
app.use('/api/v1', adminRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/demo', demoRoutes);

describe('Fabric Gateway demo behavior', () => {
  beforeEach(() => {
    db.resetRun('default');
    db.resetRun('direct-test');
    db.resetRun('fabric-test');
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test('seeds the exact enriched TX-1042 fixture with reconciled balances', async () => {
    const response = await request(app)
      .get('/api/v1/transactions/TX-1042')
      .set('X-API-Key', '1234')
      .expect(200);

    expect(response.body.transaction).toEqual({
      transactionId: 'TX-1042',
      createdAt: '2026-08-29T21:14:00.000Z',
      amount: 3750,
      currency: 'COSMIC_COINS',
      fromAccountId: '1',
      toAccountId: '2',
      status: 'POSTED',
      description: 'Interstellar freight deposit',
      beneficiaryName: 'Gary Galaxy',
      channel: 'WEB',
      deviceTrusted: false,
      location: 'Europa Station'
    });
    expect(db.getAccountById('1').balance).toBe(6150);
    expect(db.getAccountById('2').balance).toBe(4087);
  });

  test('seeds a useful connected customer history without pre-solving TX-1042', () => {
    const state = db.getRun('direct-test');
    expect(Array.from(state.accounts.values()).filter(value => value.ownerPrincipalId === 'PRN-CUSTOMER-1')).toHaveLength(3);
    expect(state.transactions).toHaveProperty('size', 9);
    expect(Array.from(state.cards.values()).map(value => value.status)).toEqual(expect.arrayContaining(['ACTIVE', 'FROZEN']));
    expect(Array.from(state.beneficiaries.values()).map(value => value.status)).toEqual(expect.arrayContaining(['TRUSTED', 'PENDING_VERIFICATION', 'INACTIVE']));
    expect(state.disputes.get('DSP-7001')).toMatchObject({ transactionId: 'TX-1008', status: 'RESOLVED' });
    expect(Array.from(state.disputes.values()).some(value => value.transactionId === 'TX-1042')).toBe(false);
  });

  test('keeps direct and fabric run mutations isolated', async () => {
    await request(app)
      .post('/api/v1/accounts')
      .set('X-API-Key', '1234')
      .set('X-Demo-Run-Id', 'direct-test')
      .set('Idempotency-Key', 'create-direct-account')
      .send({ owner: 'Direct Only', currency: 'COSMIC_COINS' })
      .expect(201);

    expect(db.getAccounts({}, 'direct-test')).toHaveLength(7);
    expect(db.getAccounts({}, 'fabric-test')).toHaveLength(6);
    expect(db.getTransactionById('TX-1042', 'direct-test').toJSON())
      .toEqual(db.getTransactionById('TX-1042', 'fabric-test').toJSON());
  });

  test('allows either participant owner to see a transaction but not an unrelated caller', async () => {
    const state = db.getRun('direct-test');
    const destination = db.generateApiKey('direct-test', { role: 'CUSTOMER', customerId: 'CUS-1001' });
    const unrelated = db.generateApiKey('direct-test', { role: 'CUSTOMER', customerId: 'CUS-1001' });
    state.accounts.get('2').ownerPrincipalId = destination.principal.principalId;

    await request(app).get('/api/v1/transactions/TX-1042')
      .set('X-Demo-Run-Id', 'direct-test').set('X-API-Key', '1234').expect(200);
    await request(app).get('/api/v1/transactions/TX-1042')
      .set('X-Demo-Run-Id', 'direct-test').set('X-API-Key', destination.apiKey).expect(200);
    await request(app).get('/api/v1/transactions/TX-1042')
      .set('X-Demo-Run-Id', 'direct-test').set('X-API-Key', unrelated.apiKey).expect(403);
    const destinationList = await request(app).get('/api/v1/transactions')
      .set('X-Demo-Run-Id', 'direct-test').set('X-API-Key', destination.apiKey).expect(200);
    const unrelatedList = await request(app).get('/api/v1/transactions')
      .set('X-Demo-Run-Id', 'direct-test').set('X-API-Key', unrelated.apiKey).expect(200);
    expect(destinationList.body.transactions.map(tx => tx.transactionId)).toContain('TX-1042');
    expect(unrelatedList.body.transactions).toEqual([]);
  });

  test('creates and exactly replays an idempotent dispute', async () => {
    const body = { transactionId: 'TX-1042', reason: 'CUSTOMER_NOT_RECOGNIZED', notes: 'Unknown transfer' };
    const first = await request(app).post('/api/v1/disputes')
      .set('X-API-Key', '1234').set('Idempotency-Key', 'dispute-1').send(body).expect(201);
    const replay = await request(app).post('/api/v1/disputes')
      .set('X-API-Key', '1234').set('Idempotency-Key', 'dispute-1').send(body).expect(201);

    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body).toEqual(first.body);
    expect(replay.body.dispute.status).toBe('OPEN');
    expect(replay.body.dispute).not.toHaveProperty('createdBy');
    expect(JSON.stringify(replay.body)).not.toContain('1234');
    const list = await request(app).get('/api/v1/disputes?transactionId=TX-1042')
      .set('X-API-Key', '1234').expect(200);
    expect(list.body.disputes).toHaveLength(1);
    const fetched = await request(app).get(`/api/v1/disputes/${first.body.dispute.disputeId}`)
      .set('X-API-Key', '1234').expect(200);
    expect(fetched.body).toEqual(first.body);
  });

  test('rejects missing keys, invalid reasons, duplicates, and idempotency conflicts', async () => {
    const body = { transactionId: 'TX-1042', reason: 'DUPLICATE' };
    await request(app).post('/api/v1/disputes').set('X-API-Key', '1234').send(body).expect(400);
    await request(app).post('/api/v1/disputes').set('X-API-Key', '1234')
      .set('Idempotency-Key', 'bad-reason').send({ transactionId: 'TX-1042', reason: 'INVALID' }).expect(400);
    await request(app).post('/api/v1/disputes').set('X-API-Key', '1234')
      .set('Idempotency-Key', 'first').send(body).expect(201);
    await request(app).post('/api/v1/disputes').set('X-API-Key', '1234')
      .set('Idempotency-Key', 'second').send(body).expect(409);
    await request(app).post('/api/v1/disputes').set('X-API-Key', '1234')
      .set('Idempotency-Key', 'first').send({ transactionId: 'TX-1042', reason: 'OTHER' }).expect(409);
  });

  test('only permits the source owner to dispute an outgoing transfer', async () => {
    const state = db.getRun('direct-test');
    const destination = db.generateApiKey('direct-test', { role: 'CUSTOMER', customerId: 'CUS-1001' });
    state.accounts.get('2').ownerPrincipalId = destination.principal.principalId;
    await request(app).post('/api/v1/disputes')
      .set('X-Demo-Run-Id', 'direct-test')
      .set('X-API-Key', destination.apiKey)
      .set('Idempotency-Key', 'destination-dispute')
      .send({ transactionId: 'TX-1042', reason: 'OTHER' })
      .expect(403);
  });

  test('resets deterministically with admin authorization and clears idempotency', async () => {
    await request(app).post('/api/v1/disputes')
      .set('X-Demo-Run-Id', 'direct-test').set('X-API-Key', '1234')
      .set('Idempotency-Key', 'reset-me')
      .send({ transactionId: 'TX-1042', reason: 'OTHER' }).expect(201);
    await request(app).post('/api/v1/demo/runs/direct-test/reset')
      .set('X-API-Key', 'not-admin').expect(401);
    const reset = await request(app).post('/api/v1/demo/runs/direct-test/reset')
      .set('X-API-Key', 'admin-demo-key').set('Idempotency-Key', 'reset-run').expect(200);

    expect(reset.body.run).toEqual({
      runId: 'direct-test', seedVersion: 'fabric-banking-v2',
      accounts: 6, transactions: 9, disputes: 1
    });
    expect(db.getRun('direct-test').idempotency.size).toBe(0);
  });

  test('validates run IDs and echoes run/request correlation headers', async () => {
    const response = await request(app).get('/health')
      .set('X-Demo-Run-Id', 'fabric-test')
      .set('X-Request-Id', 'request-42')
      .expect(404);
    expect(response.headers['x-demo-run-id']).toBe('fabric-test');
    expect(response.headers['x-request-id']).toBe('request-42');

    await request(app).get('/api/v1/accounts')
      .set('X-Demo-Run-Id', 'invalid run')
      .set('X-API-Key', '1234')
      .expect(400);
  });

  test('protects API-key creation and marks the legacy route deprecated', async () => {
    await request(app).post('/api/v1/admin/api-keys').expect(401);
    const created = await request(app).post('/api/v1/admin/api-keys')
      .set('X-API-Key', 'admin-demo-key').set('Idempotency-Key', 'create-key')
      .send({ role: 'CUSTOMER', customerId: 'CUS-1001' }).expect(201);
    expect(created.body.apiKey).toMatch(/^igb_/);

    const legacy = await request(app).get('/api/v1/auth').expect(200);
    expect(legacy.headers.deprecation).toBe('true');
    expect(legacy.headers.link).toContain('/api/v1/admin/api-keys');
    await request(app).get('/api/v1/auth').set('X-Demo-Run-Id', 'unknown-legacy-run').expect(404);
    expect(db.runs.has('unknown-legacy-run')).toBe(false);
  });

  test('redacts any stored credential value from non-auth responses and reserves dispute transitions for admins', async () => {
    const opened = await request(app).post('/api/v1/disputes')
      .set('X-API-Key', '1234').set('Idempotency-Key', 'secret-note')
      .send({ transactionId: 'TX-1042', reason: 'OTHER', notes: 'admin-demo-key' }).expect(201);
    expect(JSON.stringify(opened.body)).not.toContain('admin-demo-key');
    expect(opened.body.dispute.notes).toBe('[REDACTED]');
    await request(app).patch(`/api/v1/disputes/${opened.body.dispute.disputeId}/status`)
      .set('X-API-Key', '1234').set('Idempotency-Key', 'customer-status')
      .send({ status: 'UNDER_REVIEW' }).expect(403);
  });
});
