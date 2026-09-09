const operations = require('./operations');
const requestSchemas = require('./schemas');
const publicSchemas = require('./publicSchemas');

const requestNames = { createAssessment: 'CreateFraudAssessmentRequest', configureFaults: 'ConfigureFraudFaultsRequest' };
const ref = value => ({ $ref: value });
const schemaRef = name => ref(`#/components/schemas/${name}`);
const headerRefs = {
  'X-Request-Id': ref('#/components/headers/X-Request-Id'),
  'X-Demo-Run-Id': ref('#/components/headers/X-Demo-Run-Id')
};
const errorResponse = description => ({
  description,
  headers: headerRefs,
  content: { 'application/json': { schema: schemaRef('Error') } }
});
const pathParameters = path => [...path.matchAll(/{([^}]+)}/g)].map(match => ({
  name: match[1], in: 'path', required: true, schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' }
}));

const document = {
  openapi: '3.1.0',
  info: {
    title: 'Intergalactic Fraud API', version: '1.1.0',
    description: 'Deterministic, run-scoped fraud-risk assessments for the Postman Fabric Gateway comparison. Assessments are advisory and never execute banking actions.',
    contact: { name: 'Postman Fabric Gateway Demo Maintainers' },
    license: { name: 'ISC' }
  },
  servers: [{ url: 'http://127.0.0.1:8080', description: 'Local deterministic demo service' }],
  tags: [
    { name: 'Fraud Assessments', description: 'Create and inspect advisory risk assessments.' },
    { name: 'Demo Control', description: 'Administrator-only, non-production fault and reset controls.' },
    { name: 'System', description: 'Service health and contract discovery.' }
  ],
  security: [{ ApiKeyAuth: [] }],
  paths: {},
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Fraud API or demo-administrator credential.' }
    },
    parameters: {
      DemoRunId: { name: 'X-Demo-Run-Id', in: 'header', required: false, description: 'Isolates Direct and Fabric lane state.', schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$', default: 'default' } },
      RequestId: { name: 'X-Request-Id', in: 'header', required: false, description: 'End-to-end correlation identifier; generated when omitted.', schema: { type: 'string', minLength: 1, maxLength: 128 } },
      IdempotencyKey: { name: 'Idempotency-Key', in: 'header', required: true, description: 'Required for mutations. Exact replays return the original response; conflicting input returns 409.', schema: { type: 'string', minLength: 1, maxLength: 128 } }
    },
    headers: {
      'X-Request-Id': { description: 'Request correlation identifier.', schema: { type: 'string' } },
      'X-Demo-Run-Id': { description: 'Selected demo run.', schema: { type: 'string' } },
      'X-Fraud-Attempt': { description: 'Valid assessment attempt number within the selected run.', schema: { type: 'integer', minimum: 1 } },
      'Idempotency-Replayed': { description: 'True when the original response was replayed.', schema: { type: 'string', const: 'true' } },
      'Retry-After': { description: 'Whole seconds before retrying.', schema: { type: 'integer', minimum: 1 } }
    },
    schemas: {
      ...publicSchemas,
      ...Object.fromEntries(Object.entries(requestSchemas).map(([name, schema]) => [requestNames[name], schema]))
    },
    responses: {
      BadRequest: errorResponse('Request context, headers, or JSON body are invalid.'),
      Unauthorized: errorResponse('A valid API key is required.'),
      Forbidden: errorResponse('The credential cannot perform this operation.'),
      NotFound: errorResponse('The assessment does not exist in the selected run.'),
      Conflict: errorResponse('The idempotency key is already associated with different input.'),
      RateLimited: {
        ...errorResponse('The deterministic fail-first fault was applied; the caller owns the retry.'),
        headers: { ...headerRefs, 'X-Fraud-Attempt': ref('#/components/headers/X-Fraud-Attempt'), 'Retry-After': ref('#/components/headers/Retry-After') }
      },
      ServiceUnavailable: errorResponse('Run or idempotency capacity was reached.')
    }
  }
};

for (const operation of operations) {
  const parameters = [ref('#/components/parameters/RequestId')]
    .concat(operation.public || operation.admin ? [] : [ref('#/components/parameters/DemoRunId')])
    .concat(pathParameters(operation.path))
    .concat(operation.mutation ? [ref('#/components/parameters/IdempotencyKey')] : []);
  const successHeaders = {
    ...headerRefs,
    ...(operation.mutation ? {
      'Idempotency-Replayed': ref('#/components/headers/Idempotency-Replayed')
    } : {}),
    ...(operation.operationId === 'createFraudAssessment' ? {
      'X-Fraud-Attempt': ref('#/components/headers/X-Fraud-Attempt')
    } : {})
  };
  const responses = {
    [operation.status]: {
      description: `${operation.summary} succeeded.`,
      headers: successHeaders,
      content: operation.response
        ? { 'application/json': { schema: schemaRef(operation.response) } }
        : { 'application/yaml': { schema: { type: 'string' } } }
    },
    400: ref('#/components/responses/BadRequest')
  };
  if (operation.operationId === 'createFraudAssessment') {
    responses[200] = {
      description: 'An identical assessment already exists and was returned.',
      headers: successHeaders,
      content: { 'application/json': { schema: schemaRef('FraudAssessment') } }
    };
  }
  if (!operation.public) Object.assign(responses, { 401: ref('#/components/responses/Unauthorized'), 403: ref('#/components/responses/Forbidden') });
  if (operation.operationId === 'getFraudAssessment') responses[404] = ref('#/components/responses/NotFound');
  if (operation.mutation) Object.assign(responses, { 409: ref('#/components/responses/Conflict'), 503: ref('#/components/responses/ServiceUnavailable') });
  if (operation.operationId === 'createFraudAssessment') responses[429] = ref('#/components/responses/RateLimited');

  const item = {
    tags: [operation.tag], operationId: operation.operationId, summary: operation.summary,
    description: operation.admin
      ? `${operation.summary}. Available only outside production and requires the demo administrator key.`
      : operation.summary,
    parameters, responses
  };
  if (operation.public) item.security = [];
  if (operation.admin) item['x-demo-only'] = true;
  if (operation.request) {
    item.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: schemaRef(requestNames[operation.request]),
          ...(operation.operationId === 'createFraudAssessment' ? {
            example: {
              transactionId: 'TX-1042', customerId: 'CUS-1001', amount: 3750, currency: 'COSMIC_COINS',
              occurredAt: '2026-08-29T21:14:00.000Z', beneficiary: { name: 'Gary Galaxy', accountId: '2' },
              payment: { method: 'bank_transfer' },
              context: { customerDisputed: true, reviewChannel: 'support_case', transactionChannel: 'WEB', deviceTrusted: false, location: 'Europa Station' }
            }
          } : {})
        }
      }
    };
  }
  document.paths[operation.path] ||= {};
  document.paths[operation.path][operation.method] = item;
}

module.exports = document;
