import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import publicSchemas from '@intergalactic/fraud-contract/public-schemas';
import { createApp, type FraudLogger } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { tx1042 } from './fixtures.js';

const servers: Server[] = [];
const require = createRequire(import.meta.url);
const Ajv = require('ajv') as typeof import('ajv').default;
const addFormats = require('ajv-formats') as typeof import('ajv-formats').default;

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  })));
});

async function harness(nodeEnv = 'test') {
  const events: Record<string, unknown>[] = [];
  const logger: FraudLogger = { log: event => events.push(event) };
  const config = loadConfig({ NODE_ENV: nodeEnv, FRAUD_API_KEY: 'customer-secret', FRAUD_ADMIN_API_KEY: 'admin-secret' });
  const created = createApp(config, { logger });
  const server = created.app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address() as AddressInfo;
  return { ...created, events, baseUrl: `http://127.0.0.1:${address.port}` };
}

function headers(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': 'customer-secret',
    'x-demo-run-id': 'direct-test',
    'x-request-id': 'REQ-TEST-1',
    'idempotency-key': 'idem-1',
    ...overrides
  };
}

async function json(response: Response): Promise<Record<string, any>> {
  return response.json() as Promise<Record<string, any>>;
}

describe('Fraud REST API', () => {
  it('serves public health and its generated OpenAPI contract', async () => {
    const { baseUrl } = await harness();
    const health = await fetch(`${baseUrl}/health`, { headers: { 'x-request-id': 'REQ-PUBLIC' } });
    expect(health.status).toBe(200);
    expect(await json(health)).toEqual({ status: 'ok', service: 'fraud-api', version: '1.1.0' });
    expect(health.headers.get('x-request-id')).toBe('REQ-PUBLIC');

    const contract = await fetch(`${baseUrl}/openapi.yaml`);
    expect(contract.status).toBe(200);
    expect(await contract.text()).toContain('Intergalactic Fraud API');
  });

  it('authenticates before allocating a run and never exposes credentials in logs or errors', async () => {
    const { baseUrl, store, events } = await harness();
    const response = await fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers({ 'x-api-key': 'wrong', 'x-demo-run-id': 'unauthorized-run' }), body: JSON.stringify(tx1042)
    });
    expect(response.status).toBe(401);
    expect(store.runs.has('unauthorized-run')).toBe(false);
    const body = await json(response);
    expect(body.error).toMatchObject({ code: 'UNAUTHORIZED', retryable: false, requestId: 'REQ-TEST-1' });
    await new Promise(resolve => setImmediate(resolve));
    const serialized = JSON.stringify({ body, events });
    expect(serialized).not.toContain('wrong');
    expect(serialized).not.toContain('customer-secret');
    expect(events.at(-1)).toMatchObject({ authenticated: false, status: 401, runId: 'unauthorized-run' });
  });

  it('rejects malformed context, missing idempotency, and invalid operation bodies', async () => {
    const { baseUrl } = await harness();
    const invalidRun = await fetch(`${baseUrl}/health`, { headers: { 'x-demo-run-id': 'not valid!' } });
    expect(invalidRun.status).toBe(400);

    const missingIdempotencyHeaders = headers();
    delete missingIdempotencyHeaders['idempotency-key'];
    const missingIdempotency = await fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: missingIdempotencyHeaders, body: JSON.stringify(tx1042)
    });
    expect(missingIdempotency.status).toBe(400);
    expect((await json(missingIdempotency)).error.code).toBe('VALIDATION_ERROR');

    const invalidBody = await fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers({ 'idempotency-key': 'invalid-body' }),
      body: JSON.stringify({ ...tx1042, payment: { method: 'card' } })
    });
    expect(invalidBody.status).toBe(400);
    expect((await json(invalidBody)).error.details.length).toBeGreaterThan(0);

    const malformedJson = await fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers({ 'idempotency-key': 'malformed' }), body: '{'
    });
    expect(malformedJson.status).toBe(400);
  });

  it('creates the canonical assessment, retrieves it, and validates public response schemas', async () => {
    const { baseUrl } = await harness();
    const response = await fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers(), body: JSON.stringify(tx1042)
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe('/v1/fraud/assessments/FRA-90142');
    expect(response.headers.get('x-fraud-attempt')).toBe('1');
    const body = await json(response);
    expect(body).toMatchObject({ assessmentId: 'FRA-90142', transactionId: 'TX-1042', risk: { score: 82, level: 'high' } });

    const ajv = new Ajv({ strict: true });
    addFormats(ajv);
    expect(ajv.compile(publicSchemas.FraudAssessment!)(body)).toBe(true);

    const retrieved = await fetch(`${baseUrl}/v1/fraud/assessments/FRA-90142`, { headers: headers() });
    expect(retrieved.status).toBe(200);
    expect(await json(retrieved)).toEqual(body);
    const missing = await fetch(`${baseUrl}/v1/fraud/assessments/FRA-NOT-THERE`, { headers: headers() });
    expect(missing.status).toBe(404);
  });

  it('starts with representative completed assessments while leaving TX-1042 for the live workflow', async () => {
    const { baseUrl, store } = await harness();
    const low = await fetch(`${baseUrl}/v1/fraud/assessments/FRA-55692`, { headers: headers() });
    const high = await fetch(`${baseUrl}/v1/fraud/assessments/FRA-76469`, { headers: headers() });
    const medium = await fetch(`${baseUrl}/v1/fraud/assessments/FRA-81139`, { headers: headers() });
    expect((await json(low)).risk).toEqual({ score: 5, level: 'low' });
    expect((await json(high)).risk).toEqual({ score: 72, level: 'high' });
    expect((await json(medium)).risk).toEqual({ score: 30, level: 'medium' });
    expect(store.getAssessment('direct-test', 'FRA-90142')).toBeUndefined();
  });

  it('replays exact requests and rejects key reuse with different input', async () => {
    const { baseUrl, store } = await harness();
    const request = () => fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers(), body: JSON.stringify(tx1042)
    });
    const original = await request();
    const originalBody = await json(original);
    const replay = await request();
    expect(replay.status).toBe(201);
    expect(replay.headers.get('idempotency-replayed')).toBe('true');
    expect(await json(replay)).toEqual(originalBody);
    expect(store.summary('direct-test').attempts).toBe(1);

    const conflict = await fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ ...tx1042, amount: 3749 })
    });
    expect(conflict.status).toBe(409);
    expect((await json(conflict)).error.code).toBe('IDEMPOTENCY_CONFLICT');

    const existing = await fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers({ 'idempotency-key': 'idem-2' }), body: JSON.stringify(tx1042)
    });
    expect(existing.status).toBe(200);
    expect(await json(existing)).toEqual(originalBody);
  });

  it('isolates deterministic fail-first faults across Direct and Fabric runs', async () => {
    const { baseUrl } = await harness();
    for (const runId of ['direct-lane', 'fabric-lane']) {
      const configured = await fetch(`${baseUrl}/_demo/v1/runs/${runId}/faults`, {
        method: 'PUT', headers: headers({ 'x-api-key': 'admin-secret', 'idempotency-key': `configure-${runId}` }),
        body: JSON.stringify({ failFirstAssessment: true })
      });
      expect(configured.status).toBe(200);
    }

    const call = (runId: string) => fetch(`${baseUrl}/v1/fraud/assessments`, {
      method: 'POST', headers: headers({ 'x-demo-run-id': runId, 'idempotency-key': `assess-${runId}` }), body: JSON.stringify(tx1042)
    });
    for (const runId of ['direct-lane', 'fabric-lane']) {
      const failed = await call(runId);
      expect(failed.status).toBe(429);
      expect(failed.headers.get('retry-after')).toBe('1');
      expect(failed.headers.get('x-fraud-attempt')).toBe('1');
      expect(await json(failed)).toMatchObject({ error: { code: 'RATE_LIMITED', retryable: true, retryAfterMs: 1000 } });
      const retried = await call(runId);
      expect(retried.status).toBe(201);
      expect(retried.headers.get('x-fraud-attempt')).toBe('2');
      expect((await json(retried)).assessmentId).toBe('FRA-90142');
    }
  });

  it('protects demo controls, resets run state, and replays control responses', async () => {
    const { baseUrl } = await harness();
    const forbidden = await fetch(`${baseUrl}/_demo/v1/runs/a/faults`, {
      method: 'PUT', headers: headers(), body: JSON.stringify({ failFirstAssessment: true })
    });
    expect(forbidden.status).toBe(403);

    const resetHeaders = headers({ 'x-api-key': 'admin-secret', 'idempotency-key': 'reset-1' });
    const reset = await fetch(`${baseUrl}/_demo/v1/runs/direct-test/reset`, { method: 'POST', headers: resetHeaders });
    expect(reset.status).toBe(200);
    const body = await json(reset);
    expect(body).toEqual({
      runId: 'direct-test', seedVersion: 'fabric-fraud-v2', assessments: 3, attempts: 0,
      assessmentIds: ['FRA-55692', 'FRA-76469', 'FRA-81139'], attemptsByTransaction: {},
      faults: { failFirstAssessment: false }
    });
    const replay = await fetch(`${baseUrl}/_demo/v1/runs/direct-test/reset`, { method: 'POST', headers: resetHeaders });
    expect(replay.headers.get('idempotency-replayed')).toBe('true');
    expect(await json(replay)).toEqual(body);

    const summary = await fetch(`${baseUrl}/_demo/v1/runs/direct-test/summary`, {
      headers: headers({ 'x-api-key': 'admin-secret' })
    });
    expect(summary.status).toBe(200);
    expect(await json(summary)).toEqual(body);
  });

  it('does not expose demo-control routes in production', async () => {
    const { baseUrl } = await harness('production');
    const response = await fetch(`${baseUrl}/_demo/v1/runs/test/reset`, {
      method: 'POST', headers: headers({ 'x-api-key': 'admin-secret' })
    });
    expect(response.status).toBe(404);
  });
});
