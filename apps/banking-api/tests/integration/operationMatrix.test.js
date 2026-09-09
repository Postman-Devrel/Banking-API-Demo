const request = require('supertest');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const app = require('../../src/server');
const db = require('../../src/database/db');
const contract = require('@intergalactic/banking-contract/openapi');

const CUSTOMER = '1234';
const ADMIN = 'admin-demo-key';
const RUN = 'operation-matrix';

const operationById = new Map();
for (const [path, item] of Object.entries(contract.paths)) {
  for (const [method, operation] of Object.entries(item)) operationById.set(operation.operationId, { path, method, operation });
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
for (const [name, schema] of Object.entries(contract.components.schemas)) {
  ajv.addSchema(schema, `#/components/schemas/${name}`);
}

const validateResponse = (operationId, response) => {
  const metadata = operationById.get(operationId).operation;
  const declared = metadata.responses[String(response.status)];
  expect(declared).toBeDefined();
  if (!declared.content?.['application/json']) return;
  const validator = ajv.compile(declared.content['application/json'].schema);
  expect(validator(response.body)).toBe(true);
};

describe('complete 56-operation contract matrix', () => {
  let sequence;
  const call = async (operationId, options = {}) => {
    const metadata = operationById.get(operationId);
    expect(metadata).toBeDefined();
    let path = metadata.path;
    for (const [name, value] of Object.entries(options.params || {})) path = path.replace(`{${name}}`, value);
    let invocation = request(app)[metadata.method](path)
      .set('X-Demo-Run-Id', options.run || RUN)
      .set('X-Request-Id', `matrix-${++sequence}`);
    if (!metadata.operation.security || metadata.operation.security.length !== 0) invocation = invocation.set('X-API-Key', options.admin ? ADMIN : CUSTOMER);
    if (metadata.operation.parameters.some(parameter => parameter.$ref?.endsWith('/IdempotencyKey'))) invocation = invocation.set('Idempotency-Key', `matrix-idem-${sequence}`);
    if (options.query) invocation = invocation.query(options.query);
    if (options.body) invocation = invocation.send(options.body);
    const response = await invocation;
    expect(response.status).toBe(options.status || Number(Object.keys(metadata.operation.responses)[0]));
    validateResponse(operationId, response);
    if (!['createApiKey', 'generateLegacyApiKey', 'getOpenApiDocument'].includes(operationId)) {
      expect(JSON.stringify(response.body)).not.toContain('1234');
      expect(JSON.stringify(response.body)).not.toContain('admin-demo-key');
      expect(JSON.stringify(response.body)).not.toContain('apiKey');
    }
    return response;
  };

  beforeEach(() => {
    sequence = 0;
    db.resetRun(RUN);
    db.resetRun('matrix-reset-target');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('every documented operation executes with a schema-conformant success response', async () => {
    expect(operationById.size).toBe(56);
    await call('checkHealth');
    await call('getOpenApiDocument');
    await call('generateLegacyApiKey');
    await call('createApiKey', { admin: true, body: { role: 'CUSTOMER', customerId: 'CUS-1001' } });

    await call('listAccounts', { query: { limit: 2 } });
    const account = (await call('createAccount', { body: { owner: 'Matrix User', balance: 0, currency: 'COSMIC_COINS' } })).body.account;
    await call('getAccount', { params: { accountId: account.accountId } });
    await call('updateAccount', { params: { accountId: account.accountId }, body: { owner: 'Matrix User Prime' } });
    await call('patchAccount', { params: { accountId: account.accountId }, body: { accountType: 'PREMIUM' } });
    await call('deleteAccount', { params: { accountId: account.accountId } });

    await call('listTransactions', { query: { fromAccountId: '1' } });
    const transaction = (await call('createTransaction', { body: { fromAccountId: '1', toAccountId: '2', amount: 10, currency: 'COSMIC_COINS', channel: 'API' } })).body.transaction;
    await call('getTransaction', { params: { transactionId: transaction.transactionId } });

    await call('listDisputes');
    const dispute = (await call('createDispute', { body: { transactionId: 'TX-1042', reason: 'CUSTOMER_NOT_RECOGNIZED', notes: 'Not mine' } })).body.dispute;
    await call('getDispute', { params: { disputeId: dispute.disputeId } });
    await call('addDisputeEvidence', { params: { disputeId: dispute.disputeId }, body: { type: 'CUSTOMER_STATEMENT', description: 'I did not authorize this' } });
    await call('listDisputeEvidence', { params: { disputeId: dispute.disputeId } });
    await call('updateDisputeStatus', { admin: true, params: { disputeId: dispute.disputeId }, body: { status: 'UNDER_REVIEW' } });

    await call('getCurrentCustomer');
    await call('updateCurrentCustomer', { body: { phone: '+44-7700-900999' } });
    await call('listBeneficiaries');
    const beneficiary = (await call('createBeneficiary', { body: { name: 'Matrix Merchant', externalAccount: 'MATRIX-1' } })).body.beneficiary;
    await call('getBeneficiary', { params: { id: beneficiary.beneficiaryId } });
    await call('updateBeneficiary', { params: { id: beneficiary.beneficiaryId }, body: { name: 'Matrix Merchant Ltd' } });
    await call('cancelBeneficiary', { params: { id: beneficiary.beneficiaryId } });

    await call('listCards');
    const card = (await call('createCard', { body: { accountId: '1', type: 'VIRTUAL', spendingLimit: 900, currency: 'COSMIC_COINS' } })).body.card;
    await call('getCard', { params: { id: card.cardId } });
    await call('freezeCard', { params: { id: card.cardId } });
    await call('unfreezeCard', { params: { id: card.cardId } });
    await call('updateCardLimit', { params: { id: card.cardId }, body: { spendingLimit: 1000 } });
    await call('replaceCard', { params: { id: card.cardId } });

    await call('listScheduledPayments');
    const scheduled = (await call('createScheduledPayment', { body: { fromAccountId: '1', beneficiaryId: 'BEN-2001', amount: 20, currency: 'COSMIC_COINS', executeAt: '2026-10-01T09:00:00.000Z' } })).body.item;
    await call('getScheduledPayment', { params: { id: scheduled.paymentId } });
    await call('updateScheduledPayment', { params: { id: scheduled.paymentId }, body: { amount: 25 } });
    await call('cancelScheduledPayment', { params: { id: scheduled.paymentId } });

    await call('listStandingOrders');
    const standing = (await call('createStandingOrder', { body: { fromAccountId: '1', beneficiaryId: 'BEN-2001', amount: 30, currency: 'COSMIC_COINS', frequency: 'MONTHLY', nextExecutionAt: '2026-10-02T09:00:00.000Z' } })).body.item;
    await call('getStandingOrder', { params: { id: standing.standingOrderId } });
    await call('updateStandingOrder', { params: { id: standing.standingOrderId }, body: { frequency: 'QUARTERLY' } });
    await call('cancelStandingOrder', { params: { id: standing.standingOrderId } });

    await call('listDirectDebits');
    const debit = (await call('createDirectDebit', { body: { accountId: '1', merchant: 'Matrix Energy', mandateReference: 'MANDATE-MATRIX', amount: 40, currency: 'COSMIC_COINS' } })).body.item;
    await call('getDirectDebit', { params: { id: debit.directDebitId } });
    await call('updateDirectDebit', { params: { id: debit.directDebitId }, body: { amount: 45 } });
    await call('cancelDirectDebit', { params: { id: debit.directDebitId } });

    await call('listStatements');
    await call('getAccountStatement', { params: { accountId: '1' } });
    await call('getExchangeRates', { query: { base: 'COSMIC_COINS' } });
    await call('createFxQuote', { body: { from: 'COSMIC_COINS', to: 'GALAXY_GOLD', amount: 100 } });
    await call('getNotificationPreferences');
    await call('updateNotificationPreferences', { body: { fraudAlerts: true, channels: ['EMAIL', 'PUSH'] } });
    await call('listAuditEvents');
    await call('resetDemoRun', { admin: true, params: { runId: 'matrix-reset-target' } });
  });
});
