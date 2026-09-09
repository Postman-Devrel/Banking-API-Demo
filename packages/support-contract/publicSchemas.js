const ref = name => ({ $ref: `#/components/schemas/${name}` });
const id = { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' };
const dateTime = { type: 'string', format: 'date-time' };
const page = {
  type: 'object', additionalProperties: false, required: ['limit', 'nextCursor', 'hasMore'],
  properties: { limit: { type: 'integer', minimum: 1, maximum: 100 }, nextCursor: { type: ['string', 'null'] }, hasMore: { type: 'boolean' } }
};
const collection = (property, item) => ({
  type: 'object', additionalProperties: false, required: [property, 'page'],
  properties: { [property]: { type: 'array', items: ref(item) }, page }
});

const schemas = {
  Health: { type: 'object', additionalProperties: false, required: ['status', 'service', 'version'], properties: { status: { const: 'ok' }, service: { const: 'support-api' }, version: { const: '1.0.0' } } },
  Case: {
    type: 'object', additionalProperties: false,
    required: ['caseId', 'customerId', 'transactionId', 'subject', 'description', 'category', 'channel', 'status', 'priority', 'tags', 'assignedQueueId', 'assignedPrincipalId', 'verificationStatus', 'resolution', 'createdAt', 'updatedAt'],
    properties: {
      caseId: id, customerId: id, transactionId: id, subject: { type: 'string' }, description: { type: 'string' },
      category: { type: 'string', enum: ['UNRECOGNIZED_TRANSACTION', 'PAYMENT_DELAY', 'ACCOUNT_ACCESS', 'CARD_ISSUE', 'OTHER'] },
      channel: { type: 'string', enum: ['PHONE', 'EMAIL', 'CHAT', 'IN_APP', 'API'] },
      status: { type: 'string', enum: ['OPEN', 'INVESTIGATING', 'AWAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'] },
      priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      tags: { type: 'array', uniqueItems: true, items: id }, assignedQueueId: id, assignedPrincipalId: { type: ['string', 'null'] },
      verificationStatus: { type: 'string', enum: ['NOT_REQUESTED', 'PENDING', 'PASSED', 'FAILED', 'EXPIRED', 'CANCELLED'] },
      resolution: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['code', 'summary', 'resolvedAt'], properties: { code: { type: 'string' }, summary: { type: 'string' }, resolvedAt: dateTime } }] },
      createdAt: dateTime, updatedAt: dateTime
    },
    example: { caseId: 'CASE-2042', customerId: 'CUS-1001', transactionId: 'TX-1042', subject: 'Unrecognized transfer to Gary Galaxy', description: 'The customer reports that they do not recognize the transfer to Gary Galaxy.', category: 'UNRECOGNIZED_TRANSACTION', channel: 'PHONE', status: 'OPEN', priority: 'HIGH', tags: ['disputed-transfer'], assignedQueueId: 'QUEUE-PAYMENTS', assignedPrincipalId: null, verificationStatus: 'NOT_REQUESTED', resolution: null, createdAt: '2026-09-08T13:42:17.000Z', updatedAt: '2026-09-08T13:42:17.000Z' }
  },
  Note: { type: 'object', additionalProperties: false, required: ['noteId', 'caseId', 'type', 'content', 'actorPrincipalId', 'createdAt'], properties: { noteId: id, caseId: id, type: { type: 'string', enum: ['INTERNAL_NOTE', 'CUSTOMER_STATEMENT', 'INVESTIGATION_SUMMARY'] }, content: { type: 'string' }, actorPrincipalId: id, createdAt: dateTime } },
  Evidence: { type: 'object', additionalProperties: false, required: ['evidenceId', 'caseId', 'type', 'referenceId', 'source', 'summary', 'facts', 'actorPrincipalId', 'createdAt'], properties: { evidenceId: id, caseId: id, type: { type: 'string' }, referenceId: id, source: { type: 'string' }, summary: { type: 'string' }, facts: { type: 'object' }, actorPrincipalId: id, createdAt: dateTime } },
  VerificationRequest: { type: 'object', additionalProperties: false, required: ['verificationId', 'caseId', 'method', 'reason', 'status', 'requestedByPrincipalId', 'requestedAt', 'completedAt', 'completionNotes'], properties: { verificationId: id, caseId: id, method: { type: 'string' }, reason: { type: 'string' }, status: { type: 'string', enum: ['PENDING', 'PASSED', 'FAILED', 'EXPIRED', 'CANCELLED'] }, requestedByPrincipalId: id, requestedAt: dateTime, completedAt: { type: ['string', 'null'], format: 'date-time' }, completionNotes: { type: ['string', 'null'] } } },
  Escalation: { type: 'object', additionalProperties: false, required: ['escalationId', 'caseId', 'target', 'reason', 'evidenceIds', 'status', 'actorPrincipalId', 'createdAt'], properties: { escalationId: id, caseId: id, target: { type: 'string' }, reason: { type: 'string' }, evidenceIds: { type: 'array', items: id }, status: { const: 'OPEN' }, actorPrincipalId: id, createdAt: dateTime } },
  Queue: { type: 'object', additionalProperties: false, required: ['queueId', 'name', 'description', 'active', 'skills'], properties: { queueId: id, name: { type: 'string' }, description: { type: 'string' }, active: { type: 'boolean' }, skills: { type: 'array', items: { type: 'string' } } } },
  Assignment: { type: 'object', additionalProperties: false, required: ['caseId', 'queueId', 'principalId', 'claimedAt', 'updatedAt'], properties: { caseId: id, queueId: id, principalId: { type: ['string', 'null'] }, claimedAt: { type: ['string', 'null'], format: 'date-time' }, updatedAt: dateTime } },
  Task: { type: 'object', additionalProperties: false, required: ['taskId', 'caseId', 'title', 'description', 'type', 'priority', 'status', 'dueAt', 'actorPrincipalId', 'createdAt', 'updatedAt'], properties: { taskId: id, caseId: id, title: { type: 'string' }, description: { type: 'string' }, type: { type: 'string' }, priority: { type: 'string' }, status: { type: 'string', enum: ['OPEN', 'COMPLETED', 'CANCELLED'] }, dueAt: { type: ['string', 'null'], format: 'date-time' }, actorPrincipalId: id, createdAt: dateTime, updatedAt: dateTime } },
  RelatedCaseLink: { type: 'object', additionalProperties: false, required: ['caseId', 'relatedCaseId', 'relationship', 'reason', 'actorPrincipalId', 'createdAt'], properties: { caseId: id, relatedCaseId: id, relationship: { type: 'string' }, reason: { type: 'string' }, actorPrincipalId: id, createdAt: dateTime } },
  Interaction: { type: 'object', additionalProperties: false, required: ['interactionId', 'caseId', 'customerId', 'type', 'direction', 'summary', 'customerReached', 'actorPrincipalId', 'createdAt'], properties: { interactionId: id, caseId: id, customerId: id, type: { type: 'string' }, direction: { type: 'string' }, summary: { type: 'string' }, customerReached: { type: 'boolean' }, actorPrincipalId: id, createdAt: dateTime } },
  Article: { type: 'object', additionalProperties: false, required: ['articleId', 'title', 'summary', 'content', 'category', 'tags', 'version', 'updatedAt'], properties: { articleId: id, title: { type: 'string' }, summary: { type: 'string' }, content: { type: 'string' }, category: { type: 'string' }, tags: { type: 'array', items: id }, version: { type: 'integer', minimum: 1 }, updatedAt: dateTime } },
  KnowledgeLink: { type: 'object', additionalProperties: false, required: ['caseId', 'articleId', 'reason', 'actorPrincipalId', 'createdAt'], properties: { caseId: id, articleId: id, reason: { type: 'string' }, actorPrincipalId: id, createdAt: dateTime } },
  SlaPolicy: { type: 'object', additionalProperties: false, required: ['policyId', 'name', 'priority', 'responseMinutes', 'resolutionMinutes'], properties: { policyId: id, name: { type: 'string' }, priority: { type: 'string' }, responseMinutes: { type: 'integer', minimum: 1 }, resolutionMinutes: { type: 'integer', minimum: 1 } } },
  CaseSla: { type: 'object', additionalProperties: false, required: ['caseId', 'policyId', 'responseDueAt', 'resolutionDueAt', 'state', 'remainingMinutes'], properties: { caseId: id, policyId: id, responseDueAt: dateTime, resolutionDueAt: dateTime, state: { type: 'string', enum: ['ON_TRACK', 'AT_RISK', 'BREACHED', 'MET'] }, remainingMinutes: { type: 'integer' } } },
  SlaRisk: { type: 'object', additionalProperties: false, required: ['caseId', 'level', 'reasons', 'recommendedAction'], properties: { caseId: id, level: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] }, reasons: { type: 'array', items: { type: 'string' } }, recommendedAction: { type: 'string' } } },
  Classification: { type: 'object', additionalProperties: false, required: ['caseId', 'category', 'priority', 'tags', 'ruleVersion'], properties: { caseId: id, category: { type: 'string' }, priority: { type: 'string' }, tags: { type: 'array', items: id }, ruleVersion: { const: 'support-rules-v1' } } },
  AvailableActions: { type: 'object', additionalProperties: false, required: ['caseId', 'actions'], properties: { caseId: id, actions: { type: 'array', items: { type: 'string' } } } },
  MissingEvidence: { type: 'object', additionalProperties: false, required: ['caseId', 'required', 'present'], properties: { caseId: id, required: { type: 'array', items: { type: 'string' } }, present: { type: 'array', items: { type: 'string' } } } },
  InvestigationSummary: { type: 'object', additionalProperties: false, required: ['caseId', 'status', 'risk', 'evidenceCount', 'openTaskCount', 'verificationStatus', 'nextBestAction'], properties: { caseId: id, status: { type: 'string' }, risk: { type: ['string', 'null'] }, evidenceCount: { type: 'integer' }, openTaskCount: { type: 'integer' }, verificationStatus: { type: 'string' }, nextBestAction: { type: 'string' } } },
  Checklist: { type: 'object', additionalProperties: false, required: ['caseId', 'items'], properties: { caseId: id, items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['code', 'label', 'completed'], properties: { code: { type: 'string' }, label: { type: 'string' }, completed: { type: 'boolean' } } } } } },
  TimelineEvent: { type: 'object', additionalProperties: false, required: ['eventId', 'caseId', 'action', 'actorPrincipalId', 'requestId', 'createdAt', 'metadata'], properties: { eventId: id, caseId: id, action: { type: 'string' }, actorPrincipalId: id, requestId: { type: 'string' }, createdAt: dateTime, metadata: { type: 'object' } } },
  RemovalResult: { type: 'object', additionalProperties: false, required: ['removed', 'resourceId'], properties: { removed: { const: true }, resourceId: id } },
  Credential: { type: 'object', additionalProperties: false, required: ['apiKey', 'principalId', 'role', 'displayName', 'createdAt'], properties: { apiKey: { type: 'string', minLength: 20, description: 'Raw credential returned once from this operation.' }, principalId: id, role: { type: 'string', enum: ['SUPPORT_AGENT', 'SUPPORT_ADMIN'] }, displayName: { type: 'string' }, createdAt: dateTime } },
  RunSummary: { type: 'object', additionalProperties: false, required: ['runId', 'seedVersion', 'cases', 'events'], properties: { runId: id, seedVersion: { const: 'fabric-support-v2' }, cases: { type: 'integer', minimum: 1 }, events: { type: 'integer', minimum: 1 } } },
  Error: {
    type: 'object', additionalProperties: false, required: ['error'],
    properties: {
      error: {
        type: 'object', additionalProperties: false, required: ['code', 'message', 'retryable', 'requestId'],
        properties: {
          code: { type: 'string' }, message: { type: 'string' }, retryable: { type: 'boolean' }, requestId: { type: 'string' },
          details: {
            type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['field', 'issue'],
              properties: { field: { type: 'string' }, issue: { type: 'string' } }
            }
          }
        }
      }
    }
  }
};

Object.assign(schemas, {
  CaseCollection: collection('cases', 'Case'), NoteCollection: collection('notes', 'Note'), EvidenceCollection: collection('evidence', 'Evidence'),
  VerificationCollection: collection('verificationRequests', 'VerificationRequest'), EscalationCollection: collection('escalations', 'Escalation'),
  QueueCollection: collection('queues', 'Queue'), TaskCollection: collection('tasks', 'Task'), RelatedCaseCollection: collection('relatedCases', 'RelatedCaseLink'),
  InteractionCollection: collection('interactions', 'Interaction'), ArticleCollection: collection('articles', 'Article'),
  KnowledgeLinkCollection: collection('knowledgeLinks', 'KnowledgeLink'), SlaPolicyCollection: collection('policies', 'SlaPolicy'),
  TagCollection: { type: 'object', additionalProperties: false, required: ['tags', 'page'], properties: { tags: { type: 'array', items: id }, page } },
  TimelineCollection: collection('events', 'TimelineEvent')
});

module.exports = schemas;
