const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/database/db');

describe('Account API compatibility and ownership', () => {
  const run = 'accounts-test';
  let sequence;
  const customer = (method, path) => request(app)[method](path)
    .set('X-API-Key', '1234').set('X-Demo-Run-Id', run)
    .set('Idempotency-Key', `account-${++sequence}`);

  beforeEach(() => { sequence = 0; db.resetRun(run); jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  test('lists and filters owned accounts with cursor metadata', async () => {
    const response = await customer('get', '/api/v1/accounts').query({ owner: 'Nova', limit: 1 }).expect(200);
    expect(response.body.accounts).toHaveLength(1);
    expect(response.body.accounts[0].owner).toBe('Nova Newman');
    expect(response.body.page).toEqual({ limit: 1, nextCursor: expect.any(String), hasMore: true });
  });

  test('creates, updates, and deactivates an empty account through stable paths', async () => {
    const created = await customer('post', '/api/v1/accounts')
      .send({ owner: 'Test User', balance: 0, currency: 'COSMIC_COINS' }).expect(201);
    const id = created.body.account.accountId;
    await customer('put', `/api/v1/accounts/${id}`).send({ owner: 'Updated User' }).expect(200);
    await customer('patch', `/api/v1/accounts/${id}`).send({ accountType: 'PREMIUM' }).expect(200);
    const removed = await customer('delete', `/api/v1/accounts/${id}`).expect(200);
    expect(removed.body.account.status).toBe('INACTIVE');
    await customer('get', `/api/v1/accounts/${id}`).expect(404);
  });

  test('rejects mass assignment, missing idempotency, and non-empty deactivation', async () => {
    await customer('post', '/api/v1/accounts').send({ owner: 'Bad', currency: 'COSMIC_COINS', ownerPrincipalId: 'PRN-ADMIN-1' }).expect(400);
    await request(app).patch('/api/v1/accounts/1').set('X-API-Key', '1234').set('X-Demo-Run-Id', run).send({ owner: 'No key' }).expect(400);
    await customer('delete', '/api/v1/accounts/1').expect(409);
  });

  test('does not reveal whether another principal owns an account', async () => {
    const credential = db.generateApiKey(run, { role: 'CUSTOMER', customerId: 'CUS-1001' });
    await request(app).get('/api/v1/accounts/1')
      .set('X-API-Key', credential.apiKey).set('X-Demo-Run-Id', run).expect(404);
  });
});
