const currency = { type: 'string', enum: ['COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS'] };
const money = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const pagination = {
  type: 'object', additionalProperties: false, required: ['limit', 'nextCursor', 'hasMore'],
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    nextCursor: { type: ['string', 'null'] }, hasMore: { type: 'boolean' }
  }
};
const envelope = (name, schema) => ({
  type: 'object', additionalProperties: false, required: [name], properties: { [name]: schema }
});
const list = (name, schema) => ({
  type: 'object', additionalProperties: false, required: [name, 'page'],
  properties: { [name]: { type: 'array', items: schema }, page: { $ref: '#/components/schemas/Page' } }
});

const schemas = {
  Error: {
    type: 'object', additionalProperties: false, required: ['error'],
    properties: { error: { type: 'object', required: ['name', 'message'], properties: { name: { type: 'string' }, message: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } } } }
  },
  Page: pagination,
  Principal: {
    type: 'object', additionalProperties: false, required: ['principalId', 'role'],
    properties: { principalId: { type: 'string', pattern: '^PRN-' }, role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] }, customerId: { type: 'string', pattern: '^CUS-' } }
  },
  CredentialCreated: {
    type: 'object', additionalProperties: false, required: ['apiKey', 'principal'],
    properties: { apiKey: { type: 'string', writeOnly: true }, principal: { $ref: '#/components/schemas/Principal' } }
  },
  Account: {
    type: 'object', additionalProperties: false,
    required: ['accountId', 'owner', 'accountType', 'createdAt', 'balance', 'currency', 'status'],
    properties: { accountId: { type: 'string' }, owner: { type: 'string' }, accountType: { type: 'string', enum: ['STANDARD', 'PREMIUM', 'BUSINESS'] }, createdAt: { type: 'string', format: 'date' }, balance: money, currency, status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } }
  },
  Transaction: {
    type: 'object', additionalProperties: false,
    required: ['transactionId', 'createdAt', 'amount', 'currency', 'fromAccountId', 'toAccountId', 'status', 'description', 'beneficiaryName', 'channel', 'deviceTrusted', 'location'],
    properties: { transactionId: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, amount: money, currency, fromAccountId: { type: 'string' }, toAccountId: { type: 'string' }, status: { type: 'string', enum: ['POSTED'] }, description: { type: ['string', 'null'] }, beneficiaryName: { type: ['string', 'null'] }, channel: { type: ['string', 'null'] }, deviceTrusted: { type: ['boolean', 'null'] }, location: { type: ['string', 'null'] } }
  },
  Customer: {
    type: 'object', additionalProperties: false, required: ['customerId', 'name', 'email', 'phone', 'address', 'kycStatus'],
    properties: { customerId: { type: 'string' }, name: { type: 'string' }, email: { type: 'string', format: 'email' }, phone: { type: 'string' }, address: { type: 'string' }, kycStatus: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED'] } }
  },
  Beneficiary: {
    type: 'object', additionalProperties: false, required: ['beneficiaryId', 'name', 'status', 'createdAt'],
    properties: { beneficiaryId: { type: 'string' }, name: { type: 'string' }, accountId: { type: 'string' }, externalAccount: { type: 'string' }, status: { type: 'string', enum: ['PENDING_VERIFICATION', 'TRUSTED', 'INACTIVE'] }, createdAt: { type: 'string', format: 'date-time' } }
  },
  Card: {
    type: 'object', additionalProperties: false, required: ['cardId', 'accountId', 'type', 'last4', 'status', 'spendingLimit', 'currency'],
    properties: { cardId: { type: 'string' }, accountId: { type: 'string' }, type: { type: 'string', enum: ['PHYSICAL', 'VIRTUAL'] }, last4: { type: 'string', pattern: '^[0-9]{4}$' }, status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'REPLACED'] }, spendingLimit: money, currency, replacedByCardId: { type: 'string' } }
  },
  Payment: {
    type: 'object', additionalProperties: false, required: ['amount', 'status'],
    properties: { paymentId: { type: 'string' }, standingOrderId: { type: 'string' }, directDebitId: { type: 'string' }, fromAccountId: { type: 'string' }, accountId: { type: 'string' }, beneficiaryId: { type: 'string' }, merchant: { type: 'string' }, mandateReference: { type: 'string' }, amount: money, currency, executeAt: { type: 'string', format: 'date-time' }, nextExecutionAt: { type: 'string', format: 'date-time' }, frequency: { type: 'string' }, status: { type: 'string', enum: ['ACTIVE', 'SCHEDULED', 'PAUSED', 'CANCELLED'] } }
  },
  Dispute: {
    type: 'object', additionalProperties: false, required: ['disputeId', 'transactionId', 'reason', 'notes', 'status', 'createdAt'],
    properties: { disputeId: { type: 'string' }, transactionId: { type: 'string' }, reason: { type: 'string' }, notes: { type: ['string', 'null'] }, status: { type: 'string', enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'] }, createdAt: { type: 'string', format: 'date-time' } }
  },
  Evidence: { type: 'object', additionalProperties: false, required: ['evidenceId', 'type', 'description', 'createdAt'], properties: { evidenceId: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } },
  NotificationPreferences: { type: 'object', additionalProperties: false, required: ['transactionAlerts', 'fraudAlerts', 'marketing', 'channels'], properties: { transactionAlerts: { type: 'boolean' }, fraudAlerts: { type: 'boolean' }, marketing: { type: 'boolean' }, channels: { type: 'array', items: { type: 'string' } } } },
  AuditEvent: { type: 'object', additionalProperties: false, required: ['eventId', 'actorPrincipalId', 'action', 'resourceType', 'resourceId', 'createdAt'], properties: { eventId: { type: 'string' }, actorPrincipalId: { type: 'string' }, action: { type: 'string' }, resourceType: { type: 'string' }, resourceId: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } },
  FxRates: { type: 'object', additionalProperties: false, required: ['base', 'rates'], properties: { base: currency, rates: { type: 'object', additionalProperties: { type: 'number', exclusiveMinimum: 0 } } } },
  FxQuote: { type: 'object', additionalProperties: false, required: ['quoteId', 'from', 'to', 'amount', 'convertedAmount', 'rounding', 'expiresAt'], properties: { quoteId: { type: 'string' }, from: currency, to: currency, amount: money, convertedAmount: money, rounding: { const: 'FLOOR' }, expiresAt: { type: 'string', format: 'date-time' } } },
  DemoRun: { type: 'object', additionalProperties: false, required: ['runId', 'seedVersion', 'accounts', 'transactions', 'disputes'], properties: { runId: { type: 'string' }, seedVersion: { const: 'fabric-banking-v2' }, accounts: { type: 'integer' }, transactions: { type: 'integer' }, disputes: { type: 'integer' } } }
};

Object.assign(schemas, {
  AccountResponse: envelope('account', { $ref: '#/components/schemas/Account' }), AccountList: list('accounts', { $ref: '#/components/schemas/Account' }),
  TransactionResponse: envelope('transaction', { $ref: '#/components/schemas/Transaction' }), TransactionList: list('transactions', { $ref: '#/components/schemas/Transaction' }),
  CustomerResponse: envelope('customer', { $ref: '#/components/schemas/Customer' }),
  BeneficiaryResponse: envelope('beneficiary', { $ref: '#/components/schemas/Beneficiary' }), BeneficiaryList: list('beneficiaries', { $ref: '#/components/schemas/Beneficiary' }),
  CardResponse: envelope('card', { $ref: '#/components/schemas/Card' }), CardList: list('cards', { $ref: '#/components/schemas/Card' }),
  PaymentResponse: envelope('item', { $ref: '#/components/schemas/Payment' }), ScheduledPaymentList: list('scheduledPayments', { $ref: '#/components/schemas/Payment' }), StandingOrderList: list('standingOrders', { $ref: '#/components/schemas/Payment' }), DirectDebitList: list('directDebits', { $ref: '#/components/schemas/Payment' }),
  DisputeResponse: envelope('dispute', { $ref: '#/components/schemas/Dispute' }), DisputeList: list('disputes', { $ref: '#/components/schemas/Dispute' }),
  EvidenceResponse: envelope('evidence', { $ref: '#/components/schemas/Evidence' }), EvidenceList: list('evidence', { $ref: '#/components/schemas/Evidence' }),
  PreferencesResponse: envelope('preferences', { $ref: '#/components/schemas/NotificationPreferences' }), AuditList: list('events', { $ref: '#/components/schemas/AuditEvent' }),
  AccountStatement: { type: 'object', additionalProperties: false, required: ['accountId', 'transactions', 'page'], properties: { accountId: { type: 'string' }, transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } }, page: { $ref: '#/components/schemas/Page' } } },
  QuoteResponse: envelope('quote', { $ref: '#/components/schemas/FxQuote' }), DemoRunResponse: envelope('run', { $ref: '#/components/schemas/DemoRun' })
});

module.exports = schemas;
