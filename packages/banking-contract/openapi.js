const operations = require('./operations');
const requestSchemas = require('./schemas');
const publicSchemas = require('./publicSchemas');
const requestComponentNames = Object.fromEntries(Object.keys(requestSchemas).map(name => [name, `${name[0].toUpperCase()}${name.slice(1)}Request`]));
const requestComponents = Object.fromEntries(Object.entries(requestSchemas).map(([name, schema]) => [requestComponentNames[name], schema]));

const ref = target => ({ $ref: target });
const schemaRef = name => ref(`#/components/schemas/${name}`);
const responseHeaders = {
  'X-Demo-Run-Id': ref('#/components/headers/X-Demo-Run-Id'),
  'X-Request-Id': ref('#/components/headers/X-Request-Id'),
  'X-RateLimit-Limit': ref('#/components/headers/X-RateLimit-Limit'),
  'X-RateLimit-Remaining': ref('#/components/headers/X-RateLimit-Remaining'),
  'X-RateLimit-Reset': ref('#/components/headers/X-RateLimit-Reset')
};
const errorResponse = description => ({
  description, headers: responseHeaders,
  content: { 'application/json': { schema: schemaRef('Error') } }
});
const success = (operation, schema) => ({
  description: `${operation.summary} succeeded.`,
  headers: Object.assign({}, responseHeaders, operation.mutation ? { 'Idempotency-Replayed': ref('#/components/headers/Idempotency-Replayed') } : {}),
  content: schema ? { 'application/json': { schema: schemaRef(schema) } } : { 'application/yaml': { schema: { type: 'string' } } }
});
const commonParameter = name => ref(`#/components/parameters/${name}`);
const pathParameters = path => Array.from(path.matchAll(/{([^}]+)}/g), match => ({
  name: match[1], in: 'path', required: true, description: `Run-scoped ${match[1]} value.`, schema: { type: 'string', minLength: 1 }
}));
const queryParameter = name => ({
  name, in: 'query', required: false, description: `Optional ${name} filter.`,
  schema: name === 'base' ? requestSchemas.fxQuote.properties.from : { type: 'string' }
});

const tags = {
  System: 'Health and contract discovery.', Admin: 'Credential administration.', Accounts: 'Caller-owned accounts.',
  Transactions: 'Atomic immutable ledger entries.', Customers: 'Customer profiles.', Beneficiaries: 'Verified payment destinations.',
  Cards: 'Cards and lifecycle controls.', Payments: 'Scheduled payments, standing orders, and direct debits.',
  Statements: 'Paginated transaction statements.', 'Foreign Exchange': 'Rational deterministic FX rates and quotes.',
  Notifications: 'Constrained notification preferences.', Disputes: 'Customer evidence and administrator-controlled lifecycle.',
  Audit: 'Append-only activity history.', Demo: 'Canonical run reset.'
};

const document = {
  openapi: '3.1.0',
  info: {
    title: 'Intergalactic Banking API', version: '2.0.0',
    description: 'A deterministic, run-scoped Banking API for comparing direct agent integrations with Postman Fabric Gateway. Monetary values are non-negative safe integers in minor units; all fictional currencies currently use exponent 0.',
    contact: { name: 'Intergalactic Banking API team', url: 'https://www.postman.com/' }, license: { name: 'ISC' }
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local demo server' }],
  tags: Object.entries(tags).map(([name, description]) => ({ name, description })),
  security: [{ ApiKeyAuth: [] }],
  paths: {},
  components: {
    securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'A credential resolving to a CUSTOMER or ADMIN principal.' } },
    parameters: {
      DemoRunId: { name: 'X-Demo-Run-Id', in: 'header', required: false, description: 'Isolates state for a comparison lane; defaults to default.', schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$', default: 'default' } },
      RequestId: { name: 'X-Request-Id', in: 'header', required: false, description: 'Caller-provided correlation identifier; generated deterministically when omitted.', schema: { type: 'string', minLength: 1 } },
      IdempotencyKey: { name: 'Idempotency-Key', in: 'header', required: true, description: 'Required for mutations. Exact replays return the original sanitized response; conflicting or concurrent duplicates return 409.', schema: { type: 'string', minLength: 1, maxLength: 128 } },
      Limit: { name: 'limit', in: 'query', required: false, description: 'Page size.', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
      Cursor: { name: 'cursor', in: 'query', required: false, description: 'Opaque collection-scoped continuation cursor.', schema: { type: 'string' } }
    },
    headers: {
      'X-Demo-Run-Id': { description: 'Selected demo run.', schema: { type: 'string' } },
      'X-Request-Id': { description: 'Request correlation identifier.', schema: { type: 'string' } },
      'X-RateLimit-Limit': { description: 'Request limit for the current window.', schema: { type: 'integer' } },
      'X-RateLimit-Remaining': { description: 'Requests remaining in the current window.', schema: { type: 'integer' } },
      'X-RateLimit-Reset': { description: 'Unix time when the window resets.', schema: { type: 'integer' } },
      'Retry-After': { description: 'Seconds until another request should be attempted.', schema: { type: 'integer', minimum: 1 } },
      'Idempotency-Replayed': { description: 'True when the response was replayed.', schema: { type: 'string', const: 'true' } }
    },
    schemas: Object.assign({
      Health: { type: 'object', required: ['status', 'timestamp', 'uptime'], properties: { status: { const: 'healthy' }, timestamp: { type: 'string', format: 'date-time' }, uptime: { type: 'number' } } }
    }, publicSchemas, requestComponents),
    responses: {
      BadRequest: errorResponse('The request is malformed or violates a schema.'), Unauthorized: errorResponse('A valid API key is required.'),
      Forbidden: errorResponse('The principal lacks permission.'), NotFound: errorResponse('The resource does not exist or is not visible.'),
      Conflict: errorResponse('A state transition, uniqueness rule, or idempotency reservation conflicted.'),
      TooManyRequests: Object.assign(errorResponse('The run-and-credential rate limit was exceeded.'), { headers: Object.assign({}, responseHeaders, { 'Retry-After': ref('#/components/headers/Retry-After') }) }),
      ServiceUnavailable: errorResponse('A bounded run or idempotency store reached capacity.')
    }
  }
};

for (const operation of operations) {
  const parameters = [commonParameter('DemoRunId'), commonParameter('RequestId')]
    .concat(pathParameters(operation.path))
    .concat(operation.paginated ? [commonParameter('Limit'), commonParameter('Cursor')] : [])
    .concat(operation.queries.map(queryParameter))
    .concat(operation.mutation ? [commonParameter('IdempotencyKey')] : []);
  const responses = {
    [operation.status]: success(operation, operation.response),
    400: ref('#/components/responses/BadRequest'), 429: ref('#/components/responses/TooManyRequests')
  };
  if (!operation.public) Object.assign(responses, { 401: ref('#/components/responses/Unauthorized'), 403: ref('#/components/responses/Forbidden') });
  if (!operation.public) responses[404] = ref('#/components/responses/NotFound');
  if (operation.mutation) Object.assign(responses, { 409: ref('#/components/responses/Conflict'), 503: ref('#/components/responses/ServiceUnavailable') });
  const item = {
    tags: [operation.tag], summary: operation.summary, description: operation.description,
    operationId: operation.operationId, parameters, responses
  };
  if (operation.public) item.security = [];
  if (operation.admin) item.description += ' Requires an ADMIN principal.';
  if (operation.request) item.requestBody = {
    required: true, content: { 'application/json': { schema: schemaRef(requestComponentNames[operation.request]) } }
  };
  document.paths[operation.path] = document.paths[operation.path] || {};
  document.paths[operation.path][operation.method] = item;
}

module.exports = document;
