import { describe, expect, it, vi } from 'vitest';
import { SupportApiClient } from '../src/supportApiClient.js';
import { findTool } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';

const config = loadConfig({
  SUPPORT_API_BASE_URL: 'http://support.test',
  SUPPORT_API_KEY: 'downstream-secret',
  SUPPORT_MCP_API_KEY: 'inbound-secret'
});

function operation(name: string) {
  const tool = findTool(name);
  if (!tool) throw new Error(`Missing test tool ${name}`);
  return tool.operation;
}

describe('Support API client', () => {
  it('forwards paginated searches with filters, run, and correlation headers', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ cases: [], page: { limit: 10, nextCursor: null, hasMore: false } }), {
      status: 200, headers: { 'X-Request-Id': 'support-response-id' }
    }));
    const client = new SupportApiClient(config, fetchMock as typeof fetch);
    const result = await client.execute(operation('support_list_cases'), {
      limit: 10, cursor: 'next/page', transactionId: 'TX-1042', status: 'OPEN', priority: 'HIGH'
    }, { runId: 'direct-lane', inboundRequestId: 'compare-1' }, 7);

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe('/v1/cases');
    expect(Object.fromEntries(url.searchParams)).toEqual({ limit: '10', cursor: 'next/page', transactionId: 'TX-1042', status: 'OPEN', priority: 'HIGH' });
    expect(init).toMatchObject({ method: 'GET', headers: {
      'X-API-Key': 'downstream-secret', 'X-Demo-Run-Id': 'direct-lane', 'X-Request-Id': 'compare-1'
    } });
    expect(init.headers).not.toHaveProperty('Idempotency-Key');
    expect(result.telemetry).toMatchObject({ attempts: 1, requestId: 'support-response-id', runId: 'direct-lane' });
  });

  it('encodes path arguments and forwards knowledge search terms', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    const client = new SupportApiClient(config, fetchMock as typeof fetch);
    await client.execute(operation('support_get_case'), { caseId: 'CASE / 1' }, { runId: 'default' }, 1);
    const [caseUrl] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(caseUrl.pathname).toBe('/v1/cases/CASE%20%2F%201');

    await client.execute(operation('support_search_knowledge_articles'), { q: 'unrecognized transfer', limit: 5 }, { runId: 'default' }, 2);
    const [searchUrl] = fetchMock.mock.calls[1] as unknown as [URL, RequestInit];
    expect(searchUrl.searchParams.get('q')).toBe('unrecognized transfer');
    expect(searchUrl.searchParams.get('limit')).toBe('5');
  });

  it('creates stable idempotency keys and forwards only contract body fields', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ evidenceId: 'EVD-1' }), {
      status: 201, headers: { 'Idempotency-Replayed': 'true' }
    }));
    const client = new SupportApiClient(config, fetchMock as typeof fetch);
    const args = {
      caseId: 'CASE-2042', type: 'CUSTOMER_STATEMENT', referenceId: 'STATEMENT-1', source: 'customer',
      facts: { statement: 'I did not authorize this transfer.' }, summary: 'Customer denied transaction',
      apiKey: 'must-not-forward', runId: 'must-not-forward'
    };
    const first = await client.execute(operation('support_attach_case_evidence'), args, { runId: 'fabric-lane', inboundRequestId: 'request-9' }, 9);
    await client.execute(operation('support_attach_case_evidence'), args, { runId: 'fabric-lane', inboundRequestId: 'request-9' }, 99);
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    const firstCall = calls[0]; const secondCall = calls[1];
    if (!firstCall || !secondCall) throw new Error('Expected two downstream requests');
    const firstInit = firstCall[1]; const secondInit = secondCall[1];
    expect(firstInit.headers).toMatchObject({ 'Idempotency-Key': expect.stringMatching(/^mcp-[a-f0-9]{64}$/), 'Content-Type': 'application/json' });
    expect((firstInit.headers as Record<string, string>)['Idempotency-Key']).toBe((secondInit.headers as Record<string, string>)['Idempotency-Key']);
    expect(JSON.parse(String(firstInit.body))).toEqual({
      type: 'CUSTOMER_STATEMENT', referenceId: 'STATEMENT-1', source: 'customer', summary: 'Customer denied transaction',
      facts: { statement: 'I did not authorize this transfer.' }
    });
    expect(first.telemetry.idempotencyReplayed).toBe(true);
  });

  it('applies idempotency to bodyless mutations without inventing a body', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ category: 'OTHER' }), { status: 200 }));
    await new SupportApiClient(config, fetchMock as typeof fetch)
      .execute(operation('support_classify_case'), { caseId: 'CASE-2042' }, { runId: 'default' }, 'classify');
    const call = (fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>)[0];
    if (!call) throw new Error('Expected a downstream request');
    const init = call[1];
    expect(init.headers).toHaveProperty('Idempotency-Key');
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(init).not.toHaveProperty('body');
  });

  it('maps Support failures and retry guidance to a safe structured error', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: {
      code: 'RATE_LIMITED', message: 'Try later', retryable: true, requestId: 'api-429', details: [{ field: 'limit' }], apiKey: 'downstream-secret'
    } }), { status: 429, headers: { 'Retry-After': '7' } }));
    const result = await new SupportApiClient(config, fetchMock as typeof fetch)
      .execute(operation('support_list_cases'), {}, { runId: 'default' }, 'abc');
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', httpStatus: 429, message: 'Try later', retryable: true, requestId: 'api-429', retryAfter: 7, details: [{ field: 'limit' }] },
      telemetry: { attempts: 1, httpStatus: 429 }
    });
    expect(JSON.stringify(result)).not.toContain('downstream-secret');
  });

  it('redacts credential-shaped fields and downstream key values in successful responses', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      case: { caseId: 'CASE-2042', apiKey: 'downstream-secret', note: 'value downstream-secret value' }, token: 'bad'
    }), { status: 200 }));
    const result = await new SupportApiClient(config, fetchMock as typeof fetch)
      .execute(operation('support_get_case'), { caseId: 'CASE-2042' }, { runId: 'default' }, 1);
    expect(JSON.stringify(result)).not.toContain('downstream-secret');
    expect(JSON.stringify(result)).not.toContain('"apiKey"');
    expect(JSON.stringify(result)).not.toContain('"token"');
  });

  it('returns safe unavailable and timeout errors and tolerates invalid bodies', async () => {
    const unavailableFetch = vi.fn(async () => { throw new TypeError('network exposed details'); });
    const unavailable = await new SupportApiClient(config, unavailableFetch as typeof fetch)
      .execute(operation('support_list_cases'), {}, { runId: 'default' }, 2);
    expect(unavailable).toMatchObject({ ok: false, error: { code: 'SUPPORT_API_UNAVAILABLE', httpStatus: 503 }, telemetry: { attempts: 1, responseBytes: 0 } });
    expect(JSON.stringify(unavailable)).not.toContain('network exposed details');

    const timeoutFetch = vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); });
    const timeout = await new SupportApiClient(config, timeoutFetch as typeof fetch)
      .execute(operation('support_list_cases'), null, { runId: 'default' }, 3);
    expect(timeout).toMatchObject({ ok: false, error: { code: 'SUPPORT_API_TIMEOUT', message: 'The Support API request timed out' } });

    const invalidJsonFetch = vi.fn(async () => new Response('not json', { status: 500, headers: { 'Retry-After': 'not-a-number' } }));
    const invalid = await new SupportApiClient(config, invalidJsonFetch as typeof fetch)
      .execute(operation('support_list_cases'), {}, { runId: 'default' }, 4);
    expect(invalid).toMatchObject({ ok: false, error: { code: 'HTTP_500', message: 'The Support API request failed' } });
    expect((invalid as { error: Record<string, unknown> }).error).not.toHaveProperty('retryAfter');
  });
});
