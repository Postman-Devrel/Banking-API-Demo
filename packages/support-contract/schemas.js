const identifier = { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' };
const text = (max = 2000) => ({ type: 'string', minLength: 1, maxLength: max });
const priority = { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] };
const category = { type: 'string', enum: ['UNRECOGNIZED_TRANSACTION', 'PAYMENT_DELAY', 'ACCOUNT_ACCESS', 'CARD_ISSUE', 'OTHER'] };
const evidenceFactProperties = {
  transactionId: identifier, amount: { type: 'integer', minimum: 0 },
  currency: { type: 'string', enum: ['COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS'] },
  beneficiaryName: text(120), status: text(64), assessmentId: identifier,
  riskScore: { type: 'integer', minimum: 0, maximum: 100 }, riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
  recommendation: text(120), outcome: text(120), statement: text(4000)
};

module.exports = {
  createCase: {
    type: 'object', additionalProperties: false,
    required: ['customerId', 'transactionId', 'subject', 'category', 'channel', 'priority'],
    properties: {
      customerId: identifier, transactionId: identifier, subject: text(160), description: text(4000), category,
      channel: { type: 'string', enum: ['PHONE', 'EMAIL', 'CHAT', 'IN_APP', 'API'] }, priority,
      tags: { type: 'array', uniqueItems: true, maxItems: 20, items: identifier }
    }
  },
  updateCase: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { subject: text(160), priority, tags: { type: 'array', uniqueItems: true, maxItems: 20, items: identifier } }
  },
  reason: { type: 'object', additionalProperties: false, required: ['reason'], properties: { reason: text(1000) } },
  createNote: {
    type: 'object', additionalProperties: false, required: ['type', 'content'],
    properties: {
      type: { type: 'string', enum: ['INTERNAL_NOTE', 'CUSTOMER_STATEMENT', 'INVESTIGATION_SUMMARY'] },
      content: text(8000)
    }
  },
  createEvidence: {
    type: 'object', additionalProperties: false, required: ['type', 'referenceId', 'source', 'facts'],
    properties: {
      type: { type: 'string', enum: ['BANKING_TRANSACTION', 'FRAUD_ASSESSMENT', 'CUSTOMER_STATEMENT', 'IDENTITY_VERIFICATION', 'OTHER'] },
      referenceId: identifier,
      source: { type: 'string', enum: ['banking-api', 'fraud-api', 'support-api', 'customer', 'other'] },
      summary: text(1000),
      facts: {
        type: 'object', additionalProperties: false, minProperties: 1,
        properties: evidenceFactProperties
      }
    },
    allOf: [
      { if: { properties: { type: { const: 'FRAUD_ASSESSMENT' } }, required: ['type'] }, then: { properties: { facts: { type: 'object', properties: evidenceFactProperties, required: ['assessmentId', 'riskScore', 'riskLevel', 'recommendation'] } } } },
      { if: { properties: { type: { const: 'BANKING_TRANSACTION' } }, required: ['type'] }, then: { properties: { facts: { type: 'object', properties: evidenceFactProperties, required: ['transactionId', 'amount', 'currency', 'beneficiaryName'] } } } }
    ]
  },
  createVerification: {
    type: 'object', additionalProperties: false, required: ['method', 'reason'],
    properties: { method: { type: 'string', enum: ['IDENTITY_CHECK', 'SECURITY_QUESTIONS', 'CALLBACK', 'DOCUMENT_REVIEW'] }, reason: text(1000) }
  },
  completeVerification: {
    type: 'object', additionalProperties: false, required: ['outcome', 'notes'],
    properties: { outcome: { type: 'string', enum: ['PASSED', 'FAILED', 'EXPIRED', 'CANCELLED'] }, notes: text(2000) }
  },
  createEscalation: {
    type: 'object', additionalProperties: false, required: ['target', 'reason'],
    properties: {
      target: { type: 'string', enum: ['FRAUD_TEAM', 'PAYMENTS_OPERATIONS', 'COMPLIANCE', 'SUPPORT_MANAGER'] },
      reason: text(2000), evidenceIds: { type: 'array', uniqueItems: true, maxItems: 50, items: identifier }
    }
  },
  resolveCase: {
    type: 'object', additionalProperties: false, required: ['resolutionCode', 'summary', 'evidenceIds'],
    properties: {
      resolutionCode: { type: 'string', enum: ['CUSTOMER_VERIFIED_TRANSACTION', 'CONFIRMED_UNAUTHORIZED', 'DUPLICATE_CASE', 'CUSTOMER_WITHDREW', 'OTHER'] },
      summary: text(4000), evidenceIds: { type: 'array', minItems: 1, uniqueItems: true, items: identifier }
    }
  },
  transferCase: { type: 'object', additionalProperties: false, required: ['queueId', 'reason'], properties: { queueId: identifier, reason: text(1000) } },
  createTask: {
    type: 'object', additionalProperties: false, required: ['title', 'type', 'priority'],
    properties: {
      title: text(200), description: text(2000),
      type: { type: 'string', enum: ['REVIEW_TRANSACTION', 'OBTAIN_FRAUD_ASSESSMENT', 'VERIFY_IDENTITY', 'REVIEW_EVIDENCE', 'CONTACT_CUSTOMER', 'OTHER'] },
      priority, dueAt: { type: 'string', format: 'date-time' }
    }
  },
  updateTask: {
    type: 'object', additionalProperties: false, minProperties: 1,
    properties: { title: text(200), description: text(2000), priority, dueAt: { type: 'string', format: 'date-time' } }
  },
  linkCase: { type: 'object', additionalProperties: false, required: ['relatedCaseId', 'relationship', 'reason'], properties: { relatedCaseId: identifier, relationship: { type: 'string', enum: ['DUPLICATE', 'SAME_CUSTOMER', 'SAME_TRANSACTION', 'RELATED_INCIDENT'] }, reason: text(1000) } },
  createInteraction: {
    type: 'object', additionalProperties: false, required: ['type', 'direction', 'summary'],
    properties: {
      type: { type: 'string', enum: ['CALL', 'EMAIL', 'CHAT', 'IN_APP_MESSAGE'] },
      direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] }, summary: text(4000), customerReached: { type: 'boolean' }
    }
  },
  linkArticle: { type: 'object', additionalProperties: false, required: ['articleId', 'reason'], properties: { articleId: identifier, reason: text(1000) } },
  tag: { type: 'object', additionalProperties: false, required: ['tag'], properties: { tag: identifier } },
  createApiKey: {
    type: 'object', additionalProperties: false, required: ['role', 'displayName'],
    properties: { role: { type: 'string', enum: ['SUPPORT_AGENT', 'SUPPORT_ADMIN'] }, displayName: text(120) }
  }
};
