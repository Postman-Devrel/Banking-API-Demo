const signal = {
  type: 'object', additionalProperties: false, required: ['code', 'severity', 'description'],
  properties: {
    code: { type: 'string', enum: ['NEW_DEVICE', 'UNUSUAL_AMOUNT', 'LOCATION_MISMATCH', 'CUSTOMER_DISPUTED'] },
    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
    description: { type: 'string' }
  }
};

module.exports = {
  Health: {
    type: 'object', additionalProperties: false, required: ['status', 'service', 'version'],
    properties: { status: { const: 'ok' }, service: { const: 'fraud-api' }, version: { const: '1.1.0' } }
  },
  FraudAssessment: {
    type: 'object', additionalProperties: false,
    required: ['assessmentId', 'transactionId', 'risk', 'signals', 'recommendation', 'model', 'assessedAt'],
    properties: {
      assessmentId: { type: 'string', pattern: '^FRA-' },
      transactionId: { type: 'string' },
      risk: {
        type: 'object', additionalProperties: false, required: ['score', 'level'],
        properties: { score: { type: 'integer', minimum: 0, maximum: 100 }, level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } }
      },
      signals: { type: 'array', items: signal },
      recommendation: {
        type: 'object', additionalProperties: false,
        required: ['action', 'permittedActions', 'prohibitedActions', 'reason'],
        properties: {
          action: { type: 'string', enum: ['ALLOW', 'REQUIRE_CUSTOMER_VERIFICATION', 'ESCALATE_TO_FRAUD_TEAM', 'BLOCK_TRANSACTION'] },
          permittedActions: { type: 'array', uniqueItems: true, items: { type: 'string', enum: ['REQUEST_IDENTITY_VERIFICATION', 'ESCALATE_TO_FRAUD_TEAM'] } },
          prohibitedActions: { type: 'array', uniqueItems: true, items: { type: 'string', enum: ['ISSUE_IMMEDIATE_REFUND', 'CLOSE_DISPUTE_AS_RESOLVED'] } },
          reason: { type: 'string' }
        }
      },
      model: {
        type: 'object', additionalProperties: false, required: ['name', 'version'],
        properties: { name: { const: 'demo-fraud-risk-model' }, version: { const: '1.1.0' } }
      },
      assessedAt: { type: 'string', format: 'date-time' }
    }
  },
  Error: {
    type: 'object', additionalProperties: false, required: ['error'],
    properties: {
      error: {
        type: 'object', additionalProperties: false, required: ['code', 'message', 'retryable', 'requestId'],
        properties: {
          code: { type: 'string' }, message: { type: 'string' }, retryable: { type: 'boolean' },
          requestId: { type: 'string' }, retryAfterMs: { type: 'integer', minimum: 1 },
          details: {
            type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['field', 'issue'],
              properties: { field: { type: 'string' }, issue: { type: 'string' } }
            }
          }
        }
      }
    }
  },
  FaultConfiguration: {
    type: 'object', additionalProperties: false, required: ['runId', 'faults'],
    properties: {
      runId: { type: 'string' },
      faults: {
        type: 'object', additionalProperties: false, required: ['failFirstAssessment'],
        properties: { failFirstAssessment: { type: 'boolean' } }
      }
    }
  },
  RunSummary: {
    type: 'object', additionalProperties: false, required: ['runId', 'seedVersion', 'assessments', 'attempts', 'assessmentIds', 'attemptsByTransaction', 'faults'],
    properties: {
      runId: { type: 'string' }, seedVersion: { const: 'fabric-fraud-v2' },
      assessments: { type: 'integer', minimum: 0 }, attempts: { type: 'integer', minimum: 0 },
      assessmentIds: { type: 'array', items: { type: 'string', pattern: '^FRA-' } },
      attemptsByTransaction: {
        type: 'object', additionalProperties: { type: 'integer', minimum: 1 }
      },
      faults: {
        type: 'object', additionalProperties: false, required: ['failFirstAssessment'],
        properties: { failFirstAssessment: { type: 'boolean' } }
      }
    }
  }
};
