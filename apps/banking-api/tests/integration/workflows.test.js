const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/database/db');

describe('Direct and Fabric deterministic parity workflow', () => {
  beforeEach(() => {
    db.resetRun('direct-lane');
    db.resetRun('fabric-lane');
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const execute = async run => {
    const headers = { 'X-API-Key': '1234', 'X-Demo-Run-Id': run, 'X-Request-Id': 'same-request', 'Idempotency-Key': 'same-idempotency' };
    const response = await request(app).post('/api/v1/transactions').set(headers)
      .send({ fromAccountId: '1', toAccountId: '2', amount: 75, currency: 'COSMIC_COINS', channel: 'API' }).expect(201);
    const statement = await request(app).get('/api/v1/statements/1').set('X-API-Key', '1234')
      .set('X-Demo-Run-Id', run).set('X-Request-Id', 'statement-request').expect(200);
    return { transaction: response.body, statement: statement.body };
  };

  test('identical action sequences produce identical bodies, IDs, timestamps, and pagination', async () => {
    expect(await execute('direct-lane')).toEqual(await execute('fabric-lane'));
  });
});
