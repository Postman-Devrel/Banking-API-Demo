const identifier = { type: 'string', minLength: 1, maxLength: 64 };
const currency = { type: 'string', enum: ['COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS'] };

module.exports = {
  createAssessment: {
    type: 'object',
    additionalProperties: false,
    required: ['transactionId', 'customerId', 'amount', 'currency', 'occurredAt', 'beneficiary', 'payment', 'context'],
    properties: {
      transactionId: identifier,
      customerId: identifier,
      amount: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
      currency,
      occurredAt: { type: 'string', format: 'date-time' },
      beneficiary: {
        type: 'object', additionalProperties: false, required: ['name'],
        properties: { name: { type: 'string', minLength: 1, maxLength: 120 }, accountId: identifier }
      },
      payment: {
        type: 'object', additionalProperties: false, required: ['method'],
        properties: { method: { type: 'string', enum: ['bank_transfer', 'card', 'wallet'] }, cardPresent: { type: 'boolean' } },
        allOf: [{
          if: { properties: { method: { const: 'card' } }, required: ['method'] },
          then: { properties: { cardPresent: { type: 'boolean' } }, required: ['cardPresent'] }
        }]
      },
      context: {
        type: 'object', additionalProperties: false,
        required: ['customerDisputed', 'reviewChannel', 'transactionChannel', 'deviceTrusted', 'location'],
        properties: {
          customerDisputed: { type: 'boolean' },
          reviewChannel: { type: 'string', enum: ['support_case', 'automated_review', 'manual_review'] },
          transactionChannel: { type: 'string', enum: ['MOBILE_APP', 'WEB', 'API', 'BRANCH'] },
          deviceTrusted: { type: 'boolean' },
          location: { type: 'string', minLength: 1, maxLength: 120 }
        }
      }
    }
  },
  configureFaults: {
    type: 'object', additionalProperties: false, required: ['failFirstAssessment'],
    properties: { failFirstAssessment: { type: 'boolean' } }
  }
};
