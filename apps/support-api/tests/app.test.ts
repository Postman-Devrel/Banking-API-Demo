import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import operations from '@intergalactic/support-contract/operations';
import publicSchemas from '@intergalactic/support-contract/public-schemas';
import { createApp, type SupportLogger } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const require = createRequire(import.meta.url);
const Ajv = require('ajv') as typeof import('ajv').default;
const addFormats = require('ajv-formats') as typeof import('ajv-formats').default;
const ajv = new Ajv({ strict: false }); addFormats(ajv);
const validators = new Map<string, ReturnType<typeof ajv.compile>>();
const servers: Server[] = [];

afterEach(async () => Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())))));

async function harness(overrides: NodeJS.ProcessEnv = {}) {
  const events: Record<string, unknown>[] = []; const logger: SupportLogger = { log: event => events.push(event) };
  const config = loadConfig({ NODE_ENV: 'test', SUPPORT_API_KEY: 'agent-secret', SUPPORT_ADMIN_API_KEY: 'admin-secret', ...overrides });
  const created = createApp(config, { logger }); const server = created.app.listen(0, '127.0.0.1'); servers.push(server);
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  return { ...created, events, baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

let sequence = 0;
function headers(runId = 'workflow', admin = false, idempotencyKey?: string): Record<string, string> {
  sequence += 1;
  return {
    'content-type': 'application/json', 'x-api-key': admin ? 'admin-secret' : 'agent-secret', 'x-demo-run-id': runId,
    'x-request-id': `REQ-TEST-${sequence}`, 'idempotency-key': idempotencyKey || `idem-${sequence}`
  };
}
async function request(baseUrl: string, method: string, path: string, options: { body?: unknown; run?: string; admin?: boolean; key?: string; rawHeaders?: Record<string, string> } = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: options.rawHeaders || headers(options.run, options.admin, options.key), ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
  const contentType = response.headers.get('content-type') || ''; const body = contentType.includes('json') ? await response.json() as any : await response.text();
  return { response, body };
}
function conform(operationId: string, body: unknown): void {
  const operation = operations.find(value => value.operationId === operationId)!; if (!operation.response) return;
  let validator = validators.get(operation.response);
  if (!validator) {
    validator = ajv.compile({ components: { schemas: publicSchemas }, $ref: `#/components/schemas/${operation.response}` }); validators.set(operation.response, validator);
  }
  expect(validator(body), JSON.stringify(validator.errors)).toBe(true);
}

describe('Support API system and controls', () => {
  it('exposes a populated, schema-conformant starting workspace', async () => {
    const { baseUrl } = await harness();
    const cases = await request(baseUrl, 'GET', '/v1/cases', { run: 'seeded-workspace' });
    expect(cases.response.status).toBe(200); conform('listCases', cases.body);
    expect(cases.body.cases).toHaveLength(5);
    expect(Object.fromEntries(cases.body.cases.map((value: any) => [value.caseId, value.status]))).toEqual({
      'CASE-2012': 'CLOSED', 'CASE-2038': 'ESCALATED', 'CASE-2042': 'OPEN', 'CASE-2055': 'RESOLVED', 'CASE-2060': 'AWAITING_CUSTOMER'
    });
    const evidence = await request(baseUrl, 'GET', '/v1/cases/CASE-2038/evidence', { run: 'seeded-workspace' });
    const tasks = await request(baseUrl, 'GET', '/v1/cases/CASE-2038/tasks', { run: 'seeded-workspace' });
    const escalations = await request(baseUrl, 'GET', '/v1/cases/CASE-2038/escalations', { run: 'seeded-workspace' });
    conform('listCaseEvidence', evidence.body); conform('listCaseTasks', tasks.body); conform('listCaseEscalations', escalations.body);
    expect(evidence.body.evidence).toHaveLength(2); expect(tasks.body.tasks).toHaveLength(2); expect(escalations.body.escalations).toHaveLength(1);
    const fresh = await request(baseUrl, 'GET', '/v1/cases/CASE-2042/missing-evidence', { run: 'seeded-workspace' });
    expect(fresh.body).toEqual({ caseId: 'CASE-2042', required: ['BANKING_TRANSACTION', 'FRAUD_ASSESSMENT'], present: ['CUSTOMER_STATEMENT'] });
  });

  it('serves public system endpoints and rejects invalid context', async () => {
    const { baseUrl } = await harness();
    const health = await request(baseUrl, 'GET', '/health', { rawHeaders: { 'x-request-id': 'REQ-PUBLIC' } });
    expect(health.response.status).toBe(200); conform('getSupportHealth', health.body); expect(health.response.headers.get('x-request-id')).toBe('REQ-PUBLIC');
    const contract = await request(baseUrl, 'GET', '/openapi.yaml', { rawHeaders: {} }); expect(contract.response.status).toBe(200); expect(contract.body).toContain('Intergalactic Support API');
    const invalidRun = await request(baseUrl, 'GET', '/health', { rawHeaders: { 'x-demo-run-id': 'not valid!' } }); expect(invalidRun.response.status).toBe(400);
    const generated = await request(baseUrl, 'GET', '/health', { rawHeaders: {} }); expect(generated.response.headers.get('x-request-id')).toMatch(/^REQ-SUPPORT-/);
    const longRequest = await request(baseUrl, 'GET', '/health', { rawHeaders: { 'x-request-id': 'x'.repeat(129) } }); expect(longRequest.response.status).toBe(400);
    expect((await request(baseUrl, 'GET', '/missing', { rawHeaders: {} })).response.status).toBe(404);
  });

  it('authenticates before run allocation and does not leak credentials', async () => {
    const { baseUrl, store, events } = await harness();
    const result = await request(baseUrl, 'GET', '/v1/cases/CASE-2042', { rawHeaders: { 'x-api-key': 'wrong', 'x-demo-run-id': 'unauthorized', 'x-request-id': 'REQ-BAD' } });
    expect(result.response.status).toBe(401); expect(store.runs.has('unauthorized')).toBe(false); await new Promise(resolve => setImmediate(resolve));
    expect(JSON.stringify({ result: result.body, events })).not.toMatch(/wrong|agent-secret|admin-secret/);
    expect(events.at(-1)).toMatchObject({ status: 401, authenticated: false });
  });

  it('requires idempotency, validates bodies, replays exactly and rejects conflicts', async () => {
    const { baseUrl, store } = await harness();
    const noKey = headers('idem-run'); delete noKey['idempotency-key'];
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { body: { reason: 'Review' }, rawHeaders: noKey })).response.status).toBe(400);
    expect((await request(baseUrl, 'PATCH', '/v1/cases/CASE-2042', { body: { status: 'CLOSED' }, run: 'idem-run' })).response.status).toBe(400);
    const first = await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { body: { reason: 'Review' }, run: 'idem-run', key: 'same' }); expect(first.response.status).toBe(200);
    const replay = await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { body: { reason: 'Review' }, run: 'idem-run', key: 'same' });
    expect(replay.response.status).toBe(200); expect(replay.response.headers.get('idempotency-replayed')).toBe('true'); expect(replay.body).toEqual(first.body);
    expect(store.getRun('idem-run').events).toHaveLength(14);
    const conflict = await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { body: { reason: 'Different' }, run: 'idem-run', key: 'same' }); expect(conflict.response.status).toBe(409); expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('rate limits by run and principal with Retry-After', async () => {
    const { baseUrl } = await harness({ SUPPORT_RATE_LIMIT_REQUESTS: '1' });
    expect((await request(baseUrl, 'GET', '/v1/cases/CASE-2042', { run: 'limited' })).response.status).toBe(200);
    const limited = await request(baseUrl, 'GET', '/v1/cases/CASE-2042', { run: 'limited' }); expect(limited.response.status).toBe(429); expect(limited.response.headers.get('retry-after')).toBeTruthy();
  });

  it('replays completed mutations before applying the rate limit', async () => {
    const { baseUrl } = await harness({ SUPPORT_RATE_LIMIT_REQUESTS: '1' });
    const first = await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { run: 'replay-limit', key: 'one', body: { reason: 'Investigate' } }); expect(first.response.status).toBe(200);
    const replay = await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { run: 'replay-limit', key: 'one', body: { reason: 'Investigate' } }); expect(replay.response.status).toBe(200); expect(replay.response.headers.get('idempotency-replayed')).toBe('true');
  });

  it('rejects malformed and oversized JSON without allocating mutation state', async () => {
    const { baseUrl } = await harness();
    const malformed = await fetch(`${baseUrl}/v1/cases`, { method: 'POST', headers: headers('parser'), body: '{' }); expect(malformed.status).toBe(400);
    const oversized = await fetch(`${baseUrl}/v1/cases`, { method: 'POST', headers: headers('parser-2'), body: JSON.stringify({ customerId: 'C', transactionId: 'T', subject: 'S', category: 'OTHER', channel: 'CHAT', priority: 'LOW', description: 'x'.repeat(70_000) }) }); expect(oversized.status).toBe(400);
  });

  it('produces identical IDs and timestamps in Direct and Fabric runs', async () => {
    const { baseUrl } = await harness();
    const outputs = [];
    for (const run of ['direct-lane', 'fabric-lane']) {
      const started = await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { run, key: 'start', body: { reason: 'Investigate' } });
      const note = await request(baseUrl, 'POST', '/v1/cases/CASE-2042/notes', { run, key: 'note', body: { type: 'INTERNAL_NOTE', content: 'Investigation started.' } });
      outputs.push({ started: started.body, note: note.body });
    }
    expect(outputs[0]).toEqual(outputs[1]);
  });

  it('does not mount demo reset in production', async () => {
    const { baseUrl } = await harness({ NODE_ENV: 'production' });
    const result = await request(baseUrl, 'POST', '/_demo/v1/runs/test/reset', { admin: true }); expect(result.response.status).toBe(404);
  });
});

describe('complete Support operation catalogue', () => {
  it('executes every read and workflow operation with schema-conformant responses', async () => {
    const { baseUrl } = await harness(); const run = 'catalogue';
    const get = async (operationId: string, path: string) => { const result = await request(baseUrl, 'GET', path, { run }); expect(result.response.status).toBe(200); conform(operationId, result.body); return result.body; };
    const mutate = async (operationId: string, method: string, path: string, body?: unknown, admin = false) => { const result = await request(baseUrl, method, path, { run, body, admin }); expect(result.response.status, `${operationId}: ${JSON.stringify(result.body)}`).toBe(operations.find(value => value.operationId === operationId)!.status); conform(operationId, result.body); return result.body; };

    await get('listCases', '/v1/cases?transactionId=TX-1042'); await get('getCase', '/v1/cases/CASE-2042');
    await get('getCaseTimeline', '/v1/cases/CASE-2042/timeline'); await get('listCaseNotes', '/v1/cases/CASE-2042/notes'); await get('getCaseNote', '/v1/cases/CASE-2042/notes/NOTE-2001');
    await get('listCaseEvidence', '/v1/cases/CASE-2042/evidence'); await get('listVerificationRequests', '/v1/cases/CASE-2042/verification-requests'); await get('listCaseEscalations', '/v1/cases/CASE-2042/escalations');
    await get('listSupportQueues', '/v1/queues'); await get('getSupportQueue', '/v1/queues/QUEUE-PAYMENTS'); await get('getCaseAssignment', '/v1/cases/CASE-2042/assignment');
    await get('listCaseTasks', '/v1/cases/CASE-2042/tasks'); await get('listRelatedCases', '/v1/cases/CASE-2042/related-cases'); await get('findDuplicateCases', '/v1/cases/CASE-2042/duplicate-candidates');
    await get('listCaseInteractions', '/v1/cases/CASE-2042/interactions'); await get('getCaseInteraction', '/v1/cases/CASE-2042/interactions/INT-2001'); await get('listCustomerInteractions', '/v1/customers/CUS-1001/interactions'); await get('listCustomerCases', '/v1/customers/CUS-1001/cases');
    await get('searchKnowledgeArticles', '/v1/knowledge/articles?q=fraud'); await get('getKnowledgeArticle', '/v1/knowledge/articles/KB-1001'); await get('recommendArticlesForCase', '/v1/cases/CASE-2042/recommended-articles'); await get('listLinkedArticles', '/v1/cases/CASE-2042/knowledge-links');
    const sla = await get('getCaseSla', '/v1/cases/CASE-2042/sla'); expect(sla.remainingMinutes).toBe(42); await get('listSlaPolicies', '/v1/sla-policies'); await get('getSlaPolicy', '/v1/sla-policies/SLA-HIGH'); await get('assessCaseSlaRisk', '/v1/cases/CASE-2042/sla-risk');
    await get('listSupportTags', '/v1/tags'); await get('listAvailableCaseActions', '/v1/cases/CASE-2042/available-actions'); await get('listMissingCaseEvidence', '/v1/cases/CASE-2042/missing-evidence'); await get('getInvestigationSummary', '/v1/cases/CASE-2042/investigation-summary'); await get('getCaseChecklist', '/v1/cases/CASE-2042/checklist');

    await mutate('startCaseInvestigation', 'POST', '/v1/cases/CASE-2042/start-investigation', { reason: 'Investigate the disputed transfer' });
    await mutate('updateCase', 'PATCH', '/v1/cases/CASE-2042', { priority: 'CRITICAL', subject: 'Urgent unrecognized transfer' });
    await get('getCaseSla', '/v1/cases/CASE-2042/sla'); await get('assessCaseSlaRisk', '/v1/cases/CASE-2042/sla-risk');
    const note = await mutate('addCaseNote', 'POST', '/v1/cases/CASE-2042/notes', { type: 'INTERNAL_NOTE', content: 'Banking and fraud evidence requested.' }); await get('getCaseNote', `/v1/cases/CASE-2042/notes/${note.noteId}`);
    const banking = await mutate('attachCaseEvidence', 'POST', '/v1/cases/CASE-2042/evidence', { type: 'BANKING_TRANSACTION', referenceId: 'TX-1042', source: 'banking-api', summary: 'Canonical disputed transfer.', facts: { transactionId: 'TX-1042', amount: 3750, currency: 'COSMIC_COINS', beneficiaryName: 'Gary Galaxy', status: 'COMPLETED' } });
    const fraud = await mutate('attachCaseEvidence', 'POST', '/v1/cases/CASE-2042/evidence', { type: 'FRAUD_ASSESSMENT', referenceId: 'FRA-90142', source: 'fraud-api', summary: 'High-risk assessment.', facts: { assessmentId: 'FRA-90142', riskScore: 82, riskLevel: 'high', recommendation: 'REQUIRE_CUSTOMER_VERIFICATION' } });
    await mutate('attachCaseEvidence', 'POST', '/v1/cases/CASE-2042/evidence', { type: 'CUSTOMER_STATEMENT', referenceId: 'NOTE-2001', source: 'customer', facts: { statement: 'I do not recognize this transfer.' } });
    await get('getCaseEvidence', `/v1/cases/CASE-2042/evidence/${fraud.evidenceId}`);
    await get('listCaseEvidence', '/v1/cases/CASE-2042/evidence'); await get('getInvestigationSummary', '/v1/cases/CASE-2042/investigation-summary');

    const task = await mutate('createCaseTask', 'POST', '/v1/cases/CASE-2042/tasks', { title: 'Review assessment', description: 'Review FRA-90142.', type: 'REVIEW_EVIDENCE', priority: 'HIGH', dueAt: '2026-09-09T10:00:00.000Z' });
    await get('getCaseTask', `/v1/cases/CASE-2042/tasks/${task.taskId}`); await mutate('updateCaseTask', 'PATCH', `/v1/cases/CASE-2042/tasks/${task.taskId}`, { title: 'Review fraud assessment' }); await mutate('completeCaseTask', 'POST', `/v1/cases/CASE-2042/tasks/${task.taskId}/complete`, { reason: 'Evidence reviewed' });
    const cancelledTask = await mutate('createCaseTask', 'POST', '/v1/cases/CASE-2042/tasks', { title: 'Duplicate check', type: 'OTHER', priority: 'LOW' }); await mutate('cancelCaseTask', 'POST', `/v1/cases/CASE-2042/tasks/${cancelledTask.taskId}/cancel`, { reason: 'No duplicate found' });
    await get('listCaseTasks', '/v1/cases/CASE-2042/tasks');

    const verification = await mutate('requestCustomerVerification', 'POST', '/v1/cases/CASE-2042/verification-requests', { method: 'IDENTITY_CHECK', reason: 'Fraud assessment requires customer verification.' });
    await get('listVerificationRequests', '/v1/cases/CASE-2042/verification-requests'); await get('getInvestigationSummary', '/v1/cases/CASE-2042/investigation-summary');
    await mutate('completeVerificationRequest', 'POST', `/v1/cases/CASE-2042/verification-requests/${verification.verificationId}/complete`, { outcome: 'PASSED', notes: 'Identity verified by an administrator.' }, true);
    await mutate('escalateCase', 'POST', '/v1/cases/CASE-2042/escalations', { target: 'FRAUD_TEAM', reason: 'High-risk assessment requires specialist review.', evidenceIds: [banking.evidenceId, fraud.evidenceId] });
    await get('listCaseEscalations', '/v1/cases/CASE-2042/escalations'); await get('getInvestigationSummary', '/v1/cases/CASE-2042/investigation-summary');

    await mutate('claimCase', 'POST', '/v1/cases/CASE-2042/claim', { reason: 'Taking ownership' }); await mutate('releaseCase', 'POST', '/v1/cases/CASE-2042/release', { reason: 'Returning to queue' }); await mutate('transferCase', 'POST', '/v1/cases/CASE-2042/transfer', { queueId: 'QUEUE-COMPLIANCE', reason: 'Policy review' });
    const interaction = await mutate('recordCaseInteraction', 'POST', '/v1/cases/CASE-2042/interactions', { type: 'CALL', direction: 'OUTBOUND', summary: 'Recorded a verification callback.', customerReached: true }); await get('getCaseInteraction', `/v1/cases/CASE-2042/interactions/${interaction.interactionId}`);
    await mutate('recordCaseInteraction', 'POST', '/v1/cases/CASE-2042/interactions', { type: 'CHAT', direction: 'INBOUND', summary: 'Customer requested an update.' });
    await get('listCaseInteractions', '/v1/cases/CASE-2042/interactions'); await get('listCustomerInteractions', '/v1/customers/CUS-1001/interactions');
    await mutate('linkKnowledgeArticle', 'POST', '/v1/cases/CASE-2042/knowledge-links', { articleId: 'KB-1003', reason: 'Escalation procedure applies.' });
    await get('listLinkedArticles', '/v1/cases/CASE-2042/knowledge-links'); await get('searchKnowledgeArticles', '/v1/knowledge/articles');
    await mutate('addCaseTag', 'POST', '/v1/cases/CASE-2042/tags', { tag: 'disputed-transfer' }); await mutate('addCaseTag', 'POST', '/v1/cases/CASE-2042/tags', { tag: 'fraud-review' }); await mutate('removeCaseTag', 'DELETE', '/v1/cases/CASE-2042/tags/fraud-review'); await mutate('classifyCase', 'POST', '/v1/cases/CASE-2042/classify');

    const related = await mutate('createCase', 'POST', '/v1/cases', { customerId: 'CUS-1001', transactionId: 'TX-2000', subject: 'Related payment question', category: 'OTHER', channel: 'CHAT', priority: 'MEDIUM' });
    await mutate('linkRelatedCase', 'POST', '/v1/cases/CASE-2042/related-cases', { relatedCaseId: related.caseId, relationship: 'SAME_CUSTOMER', reason: 'Same customer investigation.' }); await get('listRelatedCases', '/v1/cases/CASE-2042/related-cases'); await get('findDuplicateCases', '/v1/cases/CASE-2042/duplicate-candidates'); await get('listCustomerCases', '/v1/customers/CUS-1001/cases'); await mutate('unlinkRelatedCase', 'DELETE', `/v1/cases/CASE-2042/related-cases/${related.caseId}`);
    await get('listCases', '/v1/cases?customerId=CUS-1001&status=ESCALATED&priority=HIGH&category=UNRECOGNIZED_TRANSACTION&assignedQueueId=QUEUE-COMPLIANCE');

    await mutate('resolveCase', 'POST', '/v1/cases/CASE-2042/resolve', { resolutionCode: 'CUSTOMER_VERIFIED_TRANSACTION', summary: 'Customer identity verified; specialist evidence reviewed.', evidenceIds: [banking.evidenceId, fraud.evidenceId] }, true);
    await mutate('closeCase', 'POST', '/v1/cases/CASE-2042/close', { reason: 'Resolved workflow complete.' }, true); await get('getCaseSla', '/v1/cases/CASE-2042/sla'); await get('listAvailableCaseActions', '/v1/cases/CASE-2042/available-actions'); await mutate('reopenCase', 'POST', '/v1/cases/CASE-2042/reopen', { reason: 'Additional review requested.' }, true);
    await get('getCaseTimeline', '/v1/cases/CASE-2042/timeline'); await get('getCaseChecklist', '/v1/cases/CASE-2042/checklist');

    const credential = await mutate('createSupportApiKey', 'POST', '/v1/admin/api-keys', { role: 'SUPPORT_AGENT', displayName: 'Generated demo agent' }, true); expect(credential.apiKey).toMatch(/^support_/);
    const generatedAccess = await request(baseUrl, 'GET', '/v1/cases/CASE-2042', { rawHeaders: { 'x-api-key': credential.apiKey, 'x-demo-run-id': run, 'x-request-id': 'REQ-GENERATED' } }); expect(generatedAccess.response.status).toBe(200);

    const reset = await request(baseUrl, 'POST', `/_demo/v1/runs/${run}/reset`, { admin: true, key: 'reset-key' }); expect(reset.response.status).toBe(200); conform('resetSupportRun', reset.body); expect(reset.body).toMatchObject({ cases: 5, events: 13, seedVersion: 'fabric-support-v2' });
    const replay = await request(baseUrl, 'POST', `/_demo/v1/runs/${run}/reset`, { admin: true, key: 'reset-key' }); expect(replay.response.headers.get('idempotency-replayed')).toBe('true'); expect(replay.body).toEqual(reset.body);
  });

  it('enforces lifecycle, ownership references, uniqueness and administrative boundaries', async () => {
    const { baseUrl } = await harness(); const run = 'errors';
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/resolve', { run, admin: false, body: { resolutionCode: 'OTHER', summary: 'No', evidenceIds: ['EVD-X'] } })).response.status).toBe(403);
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/close', { run, admin: true, body: { reason: 'Too early' } })).response.status).toBe(409);
    await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { run, body: { reason: 'Start' } });
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/start-investigation', { run, body: { reason: 'Again' } })).response.status).toBe(409);
    expect((await request(baseUrl, 'POST', '/v1/cases', { run, body: { customerId: 'CUS-1001', transactionId: 'TX-1042', subject: 'Duplicate', category: 'OTHER', channel: 'CHAT', priority: 'LOW' } })).response.status).toBe(409);
    const invalidEvidence = { type: 'FRAUD_ASSESSMENT', referenceId: 'FRA-X', source: 'fraud-api', facts: { riskScore: 2 } };
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/evidence', { run, body: invalidEvidence })).response.status).toBe(400);
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/escalations', { run, body: { target: 'FRAUD_TEAM', reason: 'Review', evidenceIds: ['EVD-X'] } })).response.status).toBe(400);
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/tags', { run, body: { tag: 'unsupported' } })).response.status).toBe(400);
    expect((await request(baseUrl, 'POST', '/v1/cases/CASE-2042/related-cases', { run, body: { relatedCaseId: 'CASE-2042', relationship: 'DUPLICATE', reason: 'Self' } })).response.status).toBe(400);
    expect((await request(baseUrl, 'GET', '/v1/cases/MISSING', { run })).response.status).toBe(404);
    expect((await request(baseUrl, 'GET', '/v1/queues/MISSING', { run })).response.status).toBe(404);
    expect((await request(baseUrl, 'GET', '/v1/knowledge/articles/MISSING', { run })).response.status).toBe(404);
    expect((await request(baseUrl, 'GET', '/v1/sla-policies/MISSING', { run })).response.status).toBe(404);
    expect((await request(baseUrl, 'GET', '/v1/cases?limit=1&limit=2', { run })).response.status).toBe(400);
    expect((await request(baseUrl, 'GET', '/v1/cases?cursor=bad', { run })).response.status).toBe(400);
  });
});
