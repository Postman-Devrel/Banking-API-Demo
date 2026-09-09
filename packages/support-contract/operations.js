const queriesByOperation = {
  listCases: [
    { name: 'transactionId', schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' } },
    { name: 'customerId', schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' } },
    { name: 'status', schema: { type: 'string', enum: ['OPEN', 'INVESTIGATING', 'AWAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'] } },
    { name: 'priority', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] } },
    { name: 'category', schema: { type: 'string', enum: ['UNRECOGNIZED_TRANSACTION', 'PAYMENT_DELAY', 'ACCOUNT_ACCESS', 'CARD_ISSUE', 'OTHER'] } },
    { name: 'assignedQueueId', schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' } }
  ],
  searchKnowledgeArticles: [{ name: 'q', schema: { type: 'string', minLength: 1, maxLength: 120 } }]
};

const destructiveOperations = new Set(['cancelCaseTask', 'unlinkRelatedCase', 'removeCaseTag']);

const operations = [
  ['get', '/health', 'getSupportHealth', 'System', 'Check Support API health', null, 'Health', 200, { public: true }],
  ['get', '/openapi.yaml', 'getSupportOpenApi', 'System', 'Download the maintained OpenAPI contract', null, null, 200, { public: true }],

  ['get', '/v1/cases', 'listCases', 'Cases', 'Search support cases', null, 'CaseCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases', 'createCase', 'Cases', 'Create a support case', 'createCase', 'Case', 201, { mutation: true }],
  ['get', '/v1/cases/{caseId}', 'getCase', 'Cases', 'Get a support case', null, 'Case', 200, { mcpSafe: true }],
  ['patch', '/v1/cases/{caseId}', 'updateCase', 'Cases', 'Update mutable case details', 'updateCase', 'Case', 200, { mutation: true, mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/timeline', 'getCaseTimeline', 'Cases', 'Get the ordered case timeline', null, 'TimelineCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/start-investigation', 'startCaseInvestigation', 'Cases', 'Start investigating a case', 'reason', 'Case', 200, { mutation: true, mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/notes', 'listCaseNotes', 'Notes', 'List case notes', null, 'NoteCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/notes', 'addCaseNote', 'Notes', 'Add a case note', 'createNote', 'Note', 201, { mutation: true, mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/notes/{noteId}', 'getCaseNote', 'Notes', 'Get a case note', null, 'Note', 200, { mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/evidence', 'listCaseEvidence', 'Evidence', 'List case evidence', null, 'EvidenceCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/evidence', 'attachCaseEvidence', 'Evidence', 'Attach immutable evidence', 'createEvidence', 'Evidence', 201, { mutation: true, mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/evidence/{evidenceId}', 'getCaseEvidence', 'Evidence', 'Get case evidence', null, 'Evidence', 200, { mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/verification-requests', 'listVerificationRequests', 'Verification', 'List customer verification requests', null, 'VerificationCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/verification-requests', 'requestCustomerVerification', 'Verification', 'Record a customer verification request', 'createVerification', 'VerificationRequest', 201, { mutation: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/verification-requests/{verificationId}/complete', 'completeVerificationRequest', 'Verification', 'Complete a customer verification request', 'completeVerification', 'VerificationRequest', 200, { mutation: true, admin: true }],

  ['get', '/v1/cases/{caseId}/escalations', 'listCaseEscalations', 'Escalations', 'List case escalations', null, 'EscalationCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/escalations', 'escalateCase', 'Escalations', 'Escalate a case', 'createEscalation', 'Escalation', 201, { mutation: true, mcpSafe: true }],

  ['post', '/v1/cases/{caseId}/resolve', 'resolveCase', 'Lifecycle', 'Resolve a support case', 'resolveCase', 'Case', 200, { mutation: true, admin: true }],
  ['post', '/v1/cases/{caseId}/close', 'closeCase', 'Lifecycle', 'Close a resolved case', 'reason', 'Case', 200, { mutation: true, admin: true }],
  ['post', '/v1/cases/{caseId}/reopen', 'reopenCase', 'Lifecycle', 'Reopen a closed case', 'reason', 'Case', 200, { mutation: true, admin: true }],

  ['get', '/v1/queues', 'listSupportQueues', 'Assignments', 'List support queues', null, 'QueueCollection', 200, { collection: true, mcpSafe: true }],
  ['get', '/v1/queues/{queueId}', 'getSupportQueue', 'Assignments', 'Get a support queue', null, 'Queue', 200, { mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/assignment', 'getCaseAssignment', 'Assignments', 'Get case assignment', null, 'Assignment', 200, { mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/claim', 'claimCase', 'Assignments', 'Claim a case', 'reason', 'Assignment', 200, { mutation: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/transfer', 'transferCase', 'Assignments', 'Transfer a case to another queue', 'transferCase', 'Assignment', 200, { mutation: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/release', 'releaseCase', 'Assignments', 'Release a claimed case', 'reason', 'Assignment', 200, { mutation: true, mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/tasks', 'listCaseTasks', 'Tasks', 'List investigation tasks', null, 'TaskCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/tasks', 'createCaseTask', 'Tasks', 'Create an investigation task', 'createTask', 'Task', 201, { mutation: true, mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/tasks/{taskId}', 'getCaseTask', 'Tasks', 'Get an investigation task', null, 'Task', 200, { mcpSafe: true }],
  ['patch', '/v1/cases/{caseId}/tasks/{taskId}', 'updateCaseTask', 'Tasks', 'Update an investigation task', 'updateTask', 'Task', 200, { mutation: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/tasks/{taskId}/complete', 'completeCaseTask', 'Tasks', 'Complete an investigation task', 'reason', 'Task', 200, { mutation: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/tasks/{taskId}/cancel', 'cancelCaseTask', 'Tasks', 'Cancel an investigation task', 'reason', 'Task', 200, { mutation: true, mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/related-cases', 'listRelatedCases', 'Related Cases', 'List related-case links', null, 'RelatedCaseCollection', 200, { collection: true, mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/duplicate-candidates', 'findDuplicateCases', 'Related Cases', 'Find deterministic duplicate candidates', null, 'CaseCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/related-cases', 'linkRelatedCase', 'Related Cases', 'Link a related case', 'linkCase', 'RelatedCaseLink', 201, { mutation: true, mcpSafe: true }],
  ['delete', '/v1/cases/{caseId}/related-cases/{relatedCaseId}', 'unlinkRelatedCase', 'Related Cases', 'Remove a related-case link', null, 'RemovalResult', 200, { mutation: true, mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/interactions', 'listCaseInteractions', 'Interactions', 'List case interactions', null, 'InteractionCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/interactions', 'recordCaseInteraction', 'Interactions', 'Record a customer interaction', 'createInteraction', 'Interaction', 201, { mutation: true, mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/interactions/{interactionId}', 'getCaseInteraction', 'Interactions', 'Get a customer interaction', null, 'Interaction', 200, { mcpSafe: true }],
  ['get', '/v1/customers/{customerId}/interactions', 'listCustomerInteractions', 'Interactions', 'List customer interactions', null, 'InteractionCollection', 200, { collection: true, mcpSafe: true }],
  ['get', '/v1/customers/{customerId}/cases', 'listCustomerCases', 'Interactions', 'List customer support cases', null, 'CaseCollection', 200, { collection: true, mcpSafe: true }],

  ['get', '/v1/knowledge/articles', 'searchKnowledgeArticles', 'Knowledge', 'Search knowledge articles', null, 'ArticleCollection', 200, { collection: true, mcpSafe: true }],
  ['get', '/v1/knowledge/articles/{articleId}', 'getKnowledgeArticle', 'Knowledge', 'Get a knowledge article', null, 'Article', 200, { mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/recommended-articles', 'recommendArticlesForCase', 'Knowledge', 'Recommend articles for a case', null, 'ArticleCollection', 200, { collection: true, mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/knowledge-links', 'listLinkedArticles', 'Knowledge', 'List linked knowledge articles', null, 'KnowledgeLinkCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/knowledge-links', 'linkKnowledgeArticle', 'Knowledge', 'Link a knowledge article to a case', 'linkArticle', 'KnowledgeLink', 201, { mutation: true, mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/sla', 'getCaseSla', 'SLA', 'Get the current case SLA', null, 'CaseSla', 200, { mcpSafe: true }],
  ['get', '/v1/sla-policies', 'listSlaPolicies', 'SLA', 'List SLA policies', null, 'SlaPolicyCollection', 200, { collection: true, mcpSafe: true }],
  ['get', '/v1/sla-policies/{policyId}', 'getSlaPolicy', 'SLA', 'Get an SLA policy', null, 'SlaPolicy', 200, { mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/sla-risk', 'assessCaseSlaRisk', 'SLA', 'Assess deterministic SLA breach risk', null, 'SlaRisk', 200, { mcpSafe: true }],

  ['get', '/v1/tags', 'listSupportTags', 'Classification', 'List supported case tags', null, 'TagCollection', 200, { collection: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/tags', 'addCaseTag', 'Classification', 'Add a tag to a case', 'tag', 'Case', 200, { mutation: true, mcpSafe: true }],
  ['delete', '/v1/cases/{caseId}/tags/{tag}', 'removeCaseTag', 'Classification', 'Remove a tag from a case', null, 'Case', 200, { mutation: true, mcpSafe: true }],
  ['post', '/v1/cases/{caseId}/classify', 'classifyCase', 'Classification', 'Apply deterministic case classification', null, 'Classification', 200, { mutation: true, mcpSafe: true }],

  ['get', '/v1/cases/{caseId}/available-actions', 'listAvailableCaseActions', 'Guidance', 'List currently permitted case actions', null, 'AvailableActions', 200, { mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/missing-evidence', 'listMissingCaseEvidence', 'Guidance', 'List missing investigation evidence', null, 'MissingEvidence', 200, { mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/investigation-summary', 'getInvestigationSummary', 'Guidance', 'Get an investigation summary', null, 'InvestigationSummary', 200, { mcpSafe: true }],
  ['get', '/v1/cases/{caseId}/checklist', 'getCaseChecklist', 'Guidance', 'Get the deterministic investigation checklist', null, 'Checklist', 200, { mcpSafe: true }],

  ['post', '/v1/admin/api-keys', 'createSupportApiKey', 'Administration', 'Create a Support API credential', 'createApiKey', 'Credential', 201, { mutation: true, admin: true }],
  ['post', '/_demo/v1/runs/{runId}/reset', 'resetSupportRun', 'Administration', 'Reset a deterministic Support run', null, 'RunSummary', 200, { mutation: true, admin: true, demoOnly: true }]
];

module.exports = operations.map(([method, path, operationId, tag, summary, request, response, status, options = {}]) => ({
  method, path, operationId, tag, summary, description: `${summary}. The authenticated principal and selected demo run are supplied by the server.`, request, response, status,
  public: false, mutation: false, admin: false, mcpSafe: false, collection: false, demoOnly: false,
  queries: queriesByOperation[operationId] || [], destructive: destructiveOperations.has(operationId), ...options
}));
