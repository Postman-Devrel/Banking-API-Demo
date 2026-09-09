module.exports = [
  { method: 'get', path: '/health', operationId: 'checkFraudHealth', tag: 'System', summary: 'Check Fraud API health', public: true, response: 'Health' },
  { method: 'get', path: '/openapi.yaml', operationId: 'getFraudOpenApi', tag: 'System', summary: 'Download the Fraud API contract', public: true, response: null },
  { method: 'post', path: '/v1/fraud/assessments', operationId: 'createFraudAssessment', tag: 'Fraud Assessments', summary: 'Assess a transaction for fraud risk', request: 'createAssessment', response: 'FraudAssessment', status: 201, mutation: true },
  { method: 'get', path: '/v1/fraud/assessments/{assessmentId}', operationId: 'getFraudAssessment', tag: 'Fraud Assessments', summary: 'Retrieve a fraud assessment', response: 'FraudAssessment', status: 200 },
  { method: 'put', path: '/_demo/v1/runs/{runId}/faults', operationId: 'configureFraudFaults', tag: 'Demo Control', summary: 'Configure deterministic local faults', request: 'configureFaults', response: 'FaultConfiguration', status: 200, mutation: true, admin: true },
  { method: 'post', path: '/_demo/v1/runs/{runId}/reset', operationId: 'resetFraudRun', tag: 'Demo Control', summary: 'Reset a deterministic Fraud API run', response: 'RunSummary', status: 200, mutation: true, admin: true }
].map(operation => ({ status: 200, request: null, response: null, public: false, admin: false, mutation: false, ...operation }));
