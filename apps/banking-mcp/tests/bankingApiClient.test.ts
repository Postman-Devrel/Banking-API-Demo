import { describe, expect, it, vi } from 'vitest';
import { BankingApiClient } from '../src/bankingApiClient.js';
import { findTool } from '../src/catalog.js';
import { loadConfig } from '../src/config.js';

const config = loadConfig({
  BANKING_API_BASE_URL: 'http://banking.test',
  BANKING_API_KEY: 'downstream-secret',
  MCP_API_KEY: 'inbound-secret'
});

function operation(name: string) {
  const tool = findTool(name);
  if (!tool) throw new Error(`Missing test tool ${name}`);
  return tool.operation;
}

describe('Banking API client', () => {
  it('forwards reads with run and correlation headers', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => new Response(JSON.stringify({ accounts: [], page: { limit: 25, nextCursor: null, hasMore: false } }), {
      status: 200,
      headers: { 'X-Request-Id': 'api-response-id' }
    }));
    const client = new BankingApiClient(config, fetchMock as typeof fetch);
    const result = await client.execute(operation('banking_list_accounts'), { limit: 25 }, { runId: 'direct-lane', inboundRequestId: 'compare-1' }, 7);

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe('http://banking.test/api/v1/accounts?limit=25');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({
      'X-API-Key': 'downstream-secret',
      'X-Demo-Run-Id': 'direct-lane',
      'X-Request-Id': 'compare-1'
    });
    expect(init.headers).not.toHaveProperty('Idempotency-Key');
    expect(result.telemetry).toMatchObject({ attempts: 1, requestId: 'api-response-id', runId: 'direct-lane' });
  });

  it('encodes path values and forwards cursors and query filters', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => new Response(JSON.stringify({
      accountId: 'ACC / 1', transactions: [], page: { limit: 10, nextCursor: null, hasMore: false }
    }), { status: 200 }));
    const client = new BankingApiClient(config, fetchMock as typeof fetch);
    await client.execute(
      operation('banking_get_account_statement'),
      { accountId: 'ACC / 1', limit: 10, cursor: 'next/page' },
      { runId: 'default' },
      'statement'
    );
    const [url] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe('/api/v1/statements/ACC%20%2F%201');
    expect(url.searchParams.get('cursor')).toBe('next/page');

    await client.execute(operation('banking_get_exchange_rates'), { base: 'GALAXY_GOLD' }, { runId: 'default' }, 'fx');
    const [fxUrl] = fetchMock.mock.calls[1] as unknown as [URL, RequestInit];
    expect(fxUrl.searchParams.get('base')).toBe('GALAXY_GOLD');
  });

  it('creates deterministic idempotency keys and sends only contract body fields', async () => {
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => new Response(JSON.stringify({ card: { cardId: 'CARD-1' } }), {
      status: 201,
      headers: { 'Idempotency-Replayed': 'true' }
    }));
    const client = new BankingApiClient(config, fetchMock as typeof fetch);
    const args = {
      accountId: 'ACC-1', type: 'VIRTUAL', spendingLimit: 100, currency: 'COSMIC_COINS',
      apiKey: 'must-not-forward', runId: 'must-not-forward'
    };
    const first = await client.execute(operation('banking_create_card'), args, { runId: 'fabric-lane', inboundRequestId: 'request-9' }, 9);
    const second = await client.execute(operation('banking_create_card'), args, { runId: 'fabric-lane', inboundRequestId: 'request-9' }, 99);
    const firstInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(firstInit.headers).toMatchObject({ 'Idempotency-Key': expect.stringMatching(/^mcp-[a-f0-9]{64}$/) });
    expect((firstInit.headers as Record<string, string>)['Idempotency-Key']).toBe((secondInit.headers as Record<string, string>)['Idempotency-Key']);
    expect(JSON.parse(String(firstInit.body))).toEqual({ accountId: 'ACC-1', type: 'VIRTUAL', spendingLimit: 100, currency: 'COSMIC_COINS' });
    expect(first.telemetry.idempotencyReplayed).toBe(true);
  });

  it('maps API failures and retry guidance to a safe structured error', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      error: { name: 'RateLimitError', message: 'Try later', apiKey: 'downstream-secret' }
    }), { status: 429, headers: { 'Retry-After': '7' } }));
    const result = await new BankingApiClient(config, fetchMock as typeof fetch)
      .execute(operation('banking_get_current_customer'), {}, { runId: 'default' }, 'abc');
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RateLimitError', httpStatus: 429, message: 'Try later', retryAfter: 7 },
      telemetry: { attempts: 1, httpStatus: 429 }
    });
    expect(JSON.stringify(result)).not.toContain('downstream-secret');
  });

  it('redacts credential-shaped fields and downstream key values in successful responses', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      card: { cardId: 'CARD-1', apiKey: 'downstream-secret', note: 'value downstream-secret value' },
      token: 'bad'
    }), { status: 200 }));
    const result = await new BankingApiClient(config, fetchMock as typeof fetch)
      .execute(operation('banking_get_card'), { id: 'CARD-1' }, { runId: 'default' }, 1);
    expect(JSON.stringify(result)).not.toContain('downstream-secret');
    expect(JSON.stringify(result)).not.toContain('"apiKey"');
    expect(JSON.stringify(result)).not.toContain('"token"');
  });

  it('returns a deterministic unavailable error when fetch fails', async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError('network exposed details'); });
    const result = await new BankingApiClient(config, fetchMock as typeof fetch)
      .execute(operation('banking_get_current_customer'), {}, { runId: 'default' }, 2);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'BANKING_API_UNAVAILABLE', httpStatus: 503, message: 'The Banking API is unavailable' },
      telemetry: { attempts: 1, responseBytes: 0 }
    });
    expect(JSON.stringify(result)).not.toContain('network exposed details');
  });

  it('distinguishes timeouts and tolerates empty or non-JSON error bodies', async () => {
    const timeoutFetch = vi.fn(async () => { throw new DOMException('timed out', 'TimeoutError'); });
    const timeout = await new BankingApiClient(config, timeoutFetch as typeof fetch)
      .execute(operation('banking_get_current_customer'), null, { runId: 'default' }, 3);
    expect(timeout).toMatchObject({ ok: false, error: { code: 'BANKING_API_TIMEOUT', message: 'The Banking API request timed out' } });

    const invalidJsonFetch = vi.fn(async () => new Response('not json', { status: 500, headers: { 'Retry-After': 'not-a-number' } }));
    const invalidJson = await new BankingApiClient(config, invalidJsonFetch as typeof fetch)
      .execute(operation('banking_get_current_customer'), {}, { runId: 'default' }, 4);
    expect(invalidJson).toMatchObject({ ok: false, error: { code: 'HTTP_500', message: 'The Banking API request failed' } });
    expect((invalidJson as { error: Record<string, unknown> }).error).not.toHaveProperty('retryAfter');

    const emptyFetch = vi.fn(async () => new Response(null, { status: 500 }));
    const empty = await new BankingApiClient(config, emptyFetch as typeof fetch)
      .execute(operation('banking_get_current_customer'), {}, { runId: 'default' }, 5);
    expect(empty.ok).toBe(false);
  });
});
