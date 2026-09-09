const request = require('supertest');
const express = require('express');
const db = require('../../src/database/db');
const requestContext = require('../../src/middleware/requestContext');
const expandedRoutes = require('../../src/routes/expandedBanking');

const app = express();
app.use(express.json());
app.use(requestContext);
app.use('/api/v1', expandedRoutes);

describe('Expanded banking catalogue', () => {
  let keySequence = 0;
  beforeEach(() => { db.resetRun('catalogue-test'); jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());
  const call = (method, path) => request(app)[method](`/api/v1${path}`)
    .set('X-API-Key', '1234')
    .set('X-Demo-Run-Id', 'catalogue-test')
    .set('Idempotency-Key', `test-${++keySequence}`);

  test('exposes connected fixtures across the new domains', async () => {
    const customer = await call('get', '/customers/me').expect(200);
    const beneficiaries = await call('get', '/beneficiaries').expect(200);
    const cards = await call('get', '/cards').expect(200);
    expect(customer.body.customer.customerId).toBe('CUS-1001');
    expect(beneficiaries.body.beneficiaries).toHaveLength(4);
    expect(cards.body.cards).toHaveLength(3);
    for (const response of [customer, beneficiaries, cards]) {
      expect(JSON.stringify(response.body)).not.toContain('apiKey');
      expect(JSON.stringify(response.body)).not.toContain('1234');
    }
    expect((await call('get', '/scheduled-payments').expect(200)).body.scheduledPayments).toHaveLength(3);
    expect((await call('get', '/standing-orders').expect(200)).body.standingOrders).toHaveLength(2);
    expect((await call('get', '/direct-debits').expect(200)).body.directDebits).toHaveLength(3);
  });

  test('supports the suspicious-payment response workflow', async () => {
    await call('post', '/cards/CARD-3002/freeze').expect(200);
    await call('patch', '/notification-preferences').send({ fraudAlerts: true, channels: ['SMS', 'PUSH'] }).expect(200);
    const actions = (await call('get', '/audit-events').expect(200)).body.events.map(event => event.action);
    expect(actions).toContain('CARD_FROZEN');
    expect(actions).toContain('NOTIFICATIONS_UPDATED');
  });

  test('keeps expanded resources isolated by run and caller', async () => {
    await call('post', '/beneficiaries').send({ name: 'New Beneficiary', externalAccount: 'X-1' }).expect(201);
    expect(db.getRun('catalogue-test').beneficiaries.size).toBe(5);
    expect(db.getRun('other-run').beneficiaries.size).toBe(4);
    await request(app).get('/api/v1/cards').set('X-API-Key', 'unknown').expect(401);
  });

  test('provides statements and deterministic FX quotes', async () => {
    expect((await call('get', '/statements/1').expect(200)).body.transactions).toHaveLength(9);
    const quote = await call('post', '/fx/quote').send({ from: 'COSMIC_COINS', to: 'GALAXY_GOLD', amount: 100 }).expect(201);
    expect(quote.body.quote.convertedAmount).toBe(80);
  });

  test('replays identical mutations and rejects conflicting key reuse', async () => {
    const body = { name: 'Replay Target', externalAccount: 'R-1' };
    const first = await request(app).post('/api/v1/beneficiaries')
      .set('X-API-Key', '1234').set('X-Demo-Run-Id', 'catalogue-test')
      .set('Idempotency-Key', 'replay-key').send(body).expect(201);
    const replay = await request(app).post('/api/v1/beneficiaries')
      .set('X-API-Key', '1234').set('X-Demo-Run-Id', 'catalogue-test')
      .set('Idempotency-Key', 'replay-key').send(body).expect(201);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body).toEqual(first.body);
    await request(app).post('/api/v1/beneficiaries')
      .set('X-API-Key', '1234').set('X-Demo-Run-Id', 'catalogue-test')
      .set('Idempotency-Key', 'replay-key')
      .send({ name: 'Different', externalAccount: 'R-2' }).expect(409);
  });
});
