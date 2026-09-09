const operations = require('./operations');
const requestSchemas = require('./schemas');
const publicSchemas = require('./publicSchemas');

const ref = value => ({ $ref: value });
const schemaRef = name => ref(`#/components/schemas/${name}`);
const requestNames = Object.fromEntries(Object.keys(requestSchemas).map(name => [name, `${name[0].toUpperCase()}${name.slice(1)}Request`]));
const commonHeaders = {
  'X-Request-Id': ref('#/components/headers/X-Request-Id'),
  'X-Demo-Run-Id': ref('#/components/headers/X-Demo-Run-Id')
};
const errorResponse = description => ({ description, headers: commonHeaders, content: { 'application/json': { schema: schemaRef('Error') } } });
const pathParameters = path => [...path.matchAll(/{([^}]+)}/g)].map(match => ({
  name: match[1], in: 'path', required: true, schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' }
}));
const tagDescriptions = {
  System: 'Service health and contract discovery.', Cases: 'Case search, retrieval, and safe case commands.',
  Notes: 'Append-only customer statements and investigation notes.', Evidence: 'Immutable, typed evidence snapshots with provenance.',
  Verification: 'Customer-verification request tracking.', Escalations: 'Specialist escalation records and routing.',
  Lifecycle: 'Administrator-restricted resolution and closure.', Assignments: 'Queue discovery, claiming, transfer, and release.',
  Tasks: 'Investigation task tracking.', 'Related Cases': 'Duplicate discovery and explicit case relationships.',
  Interactions: 'Recorded customer-contact history; these operations do not send messages.', Knowledge: 'Searchable seeded support guidance and case links.',
  SLA: 'Deterministic service-level policies and risk.', Classification: 'Controlled tags and deterministic classification.',
  Guidance: 'Policy-derived next actions, missing evidence, summaries, and checklists.', Administration: 'Credential and local demo controls.'
};
const requestExamples = {
  createCase: { customerId: 'CUS-1001', transactionId: 'TX-1042', subject: 'Unrecognized transfer to Gary Galaxy', description: 'The customer does not recognize this transfer.', category: 'UNRECOGNIZED_TRANSACTION', channel: 'PHONE', priority: 'HIGH', tags: ['disputed-transfer'] },
  attachCaseEvidence: { type: 'FRAUD_ASSESSMENT', referenceId: 'FRA-90142', source: 'fraud-api', summary: 'Deterministic fraud assessment for TX-1042.', facts: { assessmentId: 'FRA-90142', riskScore: 82, riskLevel: 'high', recommendation: 'REQUIRE_CUSTOMER_VERIFICATION' } },
  requestCustomerVerification: { method: 'IDENTITY_CHECK', reason: 'The fraud assessment requires customer verification.' },
  escalateCase: { target: 'FRAUD_TEAM', reason: 'High-risk evidence requires specialist review.', evidenceIds: ['EVD-3001', 'EVD-3002'] }
};

const document = {
  openapi: '3.1.0',
  info: {
    title: 'Intergalactic Support API', version: '1.0.0',
    description: 'Deterministic, run-scoped support case management for the Postman Fabric Gateway comparison.',
    contact: { name: 'Postman Fabric Gateway Demo Maintainers' }, license: { name: 'ISC' }
  },
  servers: [{ url: 'http://127.0.0.1:8090', description: 'Local deterministic demo service' }],
  security: [{ ApiKeyAuth: [] }],
  tags: [...new Set(operations.map(operation => operation.tag))].map(name => ({ name, description: tagDescriptions[name] })),
  paths: {},
  components: {
    securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Support agent or administrator credential.' } },
    parameters: {
      DemoRunId: { name: 'X-Demo-Run-Id', in: 'header', required: false, description: 'Isolates Direct and Fabric state.', schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$', default: 'default' } },
      RequestId: { name: 'X-Request-Id', in: 'header', required: false, description: 'Correlation identifier; generated when omitted.', schema: { type: 'string', minLength: 1, maxLength: 128 } },
      IdempotencyKey: { name: 'Idempotency-Key', in: 'header', required: true, description: 'Required for mutations. Exact replay returns the original response.', schema: { type: 'string', minLength: 1, maxLength: 128 } },
      Limit: { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
      Cursor: { name: 'cursor', in: 'query', required: false, schema: { type: 'string', minLength: 1 } }
    },
    headers: {
      'X-Request-Id': { description: 'Request correlation identifier.', schema: { type: 'string' } },
      'X-Demo-Run-Id': { description: 'Selected demo run.', schema: { type: 'string' } },
      'Idempotency-Replayed': { description: 'True when the original response was replayed.', schema: { type: 'string', const: 'true' } },
      'Retry-After': { description: 'Whole seconds before retrying.', schema: { type: 'integer', minimum: 1 } }
    },
    schemas: {
      ...publicSchemas,
      ...Object.fromEntries(Object.entries(requestSchemas).map(([name, schema]) => [requestNames[name], schema]))
    },
    responses: {
      BadRequest: errorResponse('The request context, parameters, query, or body are invalid.'),
      Unauthorized: errorResponse('A valid Support API key is required.'),
      Forbidden: errorResponse('The authenticated principal cannot perform this operation.'),
      NotFound: errorResponse('The requested support resource does not exist in this run.'),
      Conflict: errorResponse('The command conflicts with lifecycle or idempotency state.'),
      RateLimited: { ...errorResponse('The caller exceeded the configured request limit.'), headers: { ...commonHeaders, 'Retry-After': ref('#/components/headers/Retry-After') } },
      ServiceUnavailable: errorResponse('Run or idempotency capacity was reached.'),
      InternalError: errorResponse('An unexpected server error occurred.')
    }
  }
};

for (const operation of operations) {
  const parameters = [ref('#/components/parameters/RequestId')]
    .concat(operation.public || operation.demoOnly ? [] : [ref('#/components/parameters/DemoRunId')])
    .concat(pathParameters(operation.path))
    .concat(operation.collection ? [ref('#/components/parameters/Limit'), ref('#/components/parameters/Cursor')] : [])
    .concat(operation.mutation ? [ref('#/components/parameters/IdempotencyKey')] : []);
  for (const query of operation.queries) parameters.push({ name: query.name, in: 'query', required: false, schema: query.schema });
  const successHeaders = {
    ...commonHeaders,
    ...(operation.mutation ? { 'Idempotency-Replayed': ref('#/components/headers/Idempotency-Replayed') } : {})
  };
  const responses = {
    [operation.status]: {
      description: `${operation.summary} succeeded.`, headers: successHeaders,
      content: operation.response ? { 'application/json': { schema: schemaRef(operation.response) } } : { 'application/yaml': { schema: { type: 'string' } } }
    },
    400: ref('#/components/responses/BadRequest')
  };
  if (!operation.public) Object.assign(responses, { 401: ref('#/components/responses/Unauthorized'), 403: ref('#/components/responses/Forbidden') });
  if (!operation.public) Object.assign(responses, { 429: ref('#/components/responses/RateLimited'), 503: ref('#/components/responses/ServiceUnavailable') });
  if (!operation.public) responses[404] = ref('#/components/responses/NotFound');
  if (operation.mutation) responses[409] = ref('#/components/responses/Conflict');
  responses[500] = ref('#/components/responses/InternalError');
  const item = {
    tags: [operation.tag], operationId: operation.operationId, summary: operation.summary,
    description: operation.admin ? `${operation.description} Requires the Support administrator role.` : operation.description,
    parameters, responses, 'x-mcp-safe': operation.mcpSafe
  };
  if (operation.public) item.security = [];
  if (operation.demoOnly) item['x-demo-only'] = true;
  if (operation.request) {
    item.requestBody = { required: true, content: { 'application/json': { schema: schemaRef(requestNames[operation.request]), ...(requestExamples[operation.operationId] ? { example: requestExamples[operation.operationId] } : {}) } } };
  }
  document.paths[operation.path] ||= {};
  document.paths[operation.path][operation.method] = item;
}

module.exports = document;
