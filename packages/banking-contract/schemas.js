const currency = { type: 'string', enum: ['COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS'] };
const amount = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER };

module.exports = {
  createAccount: {
    type: 'object', additionalProperties: false, required: ['owner', 'currency'],
    properties: {
      owner: { type: 'string', minLength: 1 }, balance: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
      currency, accountType: { type: 'string', enum: ['STANDARD', 'PREMIUM', 'BUSINESS'] }
    }
  },
  updateAccount: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { owner: { type: 'string', minLength: 1 }, accountType: { type: 'string', enum: ['STANDARD', 'PREMIUM', 'BUSINESS'] } }
  },
  createTransaction: {
    type: 'object', additionalProperties: false, required: ['fromAccountId', 'toAccountId', 'amount', 'currency'],
    properties: {
      fromAccountId: { type: 'string', minLength: 1 }, toAccountId: { type: 'string', minLength: 1 }, amount, currency,
      description: { type: 'string' }, beneficiaryName: { type: 'string' },
      channel: { type: 'string', enum: ['MOBILE_APP', 'WEB', 'API', 'BRANCH'] },
      deviceTrusted: { type: 'boolean' }, location: { type: 'string' }
    }
  },
  createDispute: {
    type: 'object', additionalProperties: false, required: ['transactionId', 'reason'],
    properties: {
      transactionId: { type: 'string', minLength: 1 },
      reason: { type: 'string', enum: ['CUSTOMER_NOT_RECOGNIZED', 'DUPLICATE', 'INCORRECT_AMOUNT', 'OTHER'] },
      notes: { type: 'string' }
    }
  },
  updateCustomer: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { email: { type: 'string', format: 'email' }, phone: { type: 'string', minLength: 1 }, address: { type: 'string', minLength: 1 } }
  },
  createBeneficiary: {
    type: 'object', additionalProperties: false, required: ['name'],
    anyOf: [{ required: ['accountId'] }, { required: ['externalAccount'] }],
    properties: { name: { type: 'string', minLength: 1 }, accountId: { type: 'string' }, externalAccount: { type: 'string' } }
  },
  updateBeneficiary: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { name: { type: 'string', minLength: 1 }, status: { type: 'string', enum: ['TRUSTED', 'INACTIVE'] } }
  },
  createCard: {
    type: 'object', additionalProperties: false, required: ['accountId', 'type', 'spendingLimit', 'currency'],
    properties: { accountId: { type: 'string' }, type: { type: 'string', enum: ['PHYSICAL', 'VIRTUAL'] }, spendingLimit: amount, currency }
  },
  cardLimit: { type: 'object', additionalProperties: false, required: ['spendingLimit'], properties: { spendingLimit: amount } },
  createScheduledPayment: {
    type: 'object', additionalProperties: false,
    required: ['fromAccountId', 'beneficiaryId', 'amount', 'currency', 'executeAt'],
    properties: { fromAccountId: { type: 'string' }, beneficiaryId: { type: 'string' }, amount, currency, executeAt: { type: 'string', format: 'date-time' } }
  },
  updateScheduledPayment: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { amount, executeAt: { type: 'string', format: 'date-time' } }
  },
  createStandingOrder: {
    type: 'object', additionalProperties: false,
    required: ['fromAccountId', 'beneficiaryId', 'amount', 'currency', 'frequency', 'nextExecutionAt'],
    properties: {
      fromAccountId: { type: 'string' }, beneficiaryId: { type: 'string' }, amount, currency,
      frequency: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'] },
      nextExecutionAt: { type: 'string', format: 'date-time' }
    }
  },
  updateStandingOrder: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { amount, frequency: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'] }, nextExecutionAt: { type: 'string', format: 'date-time' } }
  },
  createDirectDebit: {
    type: 'object', additionalProperties: false,
    required: ['accountId', 'merchant', 'mandateReference', 'amount', 'currency'],
    properties: { accountId: { type: 'string' }, merchant: { type: 'string', minLength: 1 }, mandateReference: { type: 'string', minLength: 1 }, amount, currency }
  },
  updateDirectDebit: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { amount }
  },
  fxQuote: { type: 'object', additionalProperties: false, required: ['from', 'to', 'amount'], properties: { from: currency, to: currency, amount } },
  notificationPreferences: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: {
      transactionAlerts: { type: 'boolean' }, fraudAlerts: { type: 'boolean' }, marketing: { type: 'boolean' },
      channels: { type: 'array', uniqueItems: true, items: { type: 'string', enum: ['EMAIL', 'SMS', 'PUSH'] } }
    }
  },
  disputeStatus: { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { type: 'string', enum: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'] } } },
  disputeEvidence: {
    type: 'object', additionalProperties: false, required: ['type', 'description'],
    properties: { type: { type: 'string', enum: ['RECEIPT', 'SCREENSHOT', 'CUSTOMER_STATEMENT', 'OTHER'] }, description: { type: 'string', minLength: 1 } }
  },
  adminCreateCredential: {
    type: 'object', additionalProperties: false, required: ['role'],
    if: { properties: { role: { const: 'CUSTOMER' } } }, then: { required: ['customerId'] },
    properties: { role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] }, customerId: { type: 'string' } }
  }
};
