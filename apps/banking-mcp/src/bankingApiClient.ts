import { createHash } from 'node:crypto';
import { canonicalize } from 'json-canonicalize';
import requestSchemas from '@intergalactic/banking-contract/schemas';
import type {
  BankingApiResult,
  BankingOperation,
  JsonSchema,
  McpConfig,
  RequestScope,
  ToolTelemetry
} from './types.js';

type Fetch = typeof globalThis.fetch;

const PATH_PARAMETER_PATTERN = /{([^}]+)}/g;
const SECRET_FIELD_PATTERN = /api.?key|authorization|credential|password|secret|token/i;

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sanitize(value: unknown, secret: string): unknown {
  if (Array.isArray(value)) return value.map(item => sanitize(item, secret));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SECRET_FIELD_PATTERN.test(key))
        .map(([key, child]) => [key, sanitize(child, secret)])
    );
  }
  if (typeof value === 'string' && secret && value.includes(secret)) return value.replaceAll(secret, '[REDACTED]');
  return value;
}

function bodyProperties(operation: BankingOperation): Set<string> {
  if (!operation.request) return new Set();
  const schema = requestSchemas[operation.request];
  if (!schema || typeof schema === 'boolean') return new Set();
  const names = Object.keys(schema.properties || {});
  if (operation.operationId === 'updateBeneficiary') return new Set(['name']);
  return new Set(names);
}

function errorPayload(body: unknown, status: number, requestId: string, retryAfter?: number) {
  const object = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const nested = object.error && typeof object.error === 'object' ? object.error as Record<string, unknown> : {};
  return {
    code: typeof nested.name === 'string' ? nested.name : `HTTP_${status}`,
    httpStatus: status,
    message: typeof nested.message === 'string' ? nested.message.slice(0, 500) : 'The Banking API request failed',
    requestId,
    ...(retryAfter === undefined ? {} : { retryAfter })
  };
}

export class BankingApiClient {
  constructor(
    private readonly config: McpConfig,
    private readonly fetchImpl: Fetch = globalThis.fetch
  ) {}

  async execute(
    operation: BankingOperation,
    rawArgs: unknown,
    scope: RequestScope,
    mcpRequestId: string | number
  ): Promise<BankingApiResult> {
    const startedAt = performance.now();
    const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>;
    const canonicalArgs = canonicalize(args);
    const requestId = scope.inboundRequestId || `mcp-${hash(`${scope.runId}:${mcpRequestId}:${operation.operationId}:${canonicalArgs}`).slice(0, 24)}`;
    let urlPath = operation.path.replace(PATH_PARAMETER_PATTERN, (_match, name: string) => {
      const value = args[name];
      if (typeof value !== 'string') throw new Error(`Missing path argument: ${name}`);
      return encodeURIComponent(value);
    });
    const url = new URL(`${this.config.bankingApiBaseUrl}${urlPath}`);
    if (operation.paginated) {
      if (args.limit !== undefined) url.searchParams.set('limit', String(args.limit));
      if (args.cursor !== undefined) url.searchParams.set('cursor', String(args.cursor));
    }
    for (const query of operation.queries) {
      if (args[query] !== undefined) url.searchParams.set(query, String(args[query]));
    }

    const bodyKeys = bodyProperties(operation);
    const body = Object.fromEntries([...bodyKeys].filter(key => args[key] !== undefined).map(key => [key, args[key]]));
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': this.config.bankingApiKey,
      'X-Demo-Run-Id': scope.runId,
      'X-Request-Id': requestId
    };
    if (operation.mutation) {
      headers['Idempotency-Key'] = `mcp-${hash(`${requestId}:${operation.operationId}:${canonicalArgs}`)}`;
    }
    if (bodyKeys.size > 0) headers['Content-Type'] = 'application/json';

    try {
      const requestInit: RequestInit = {
        method: operation.method.toUpperCase(),
        headers,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs)
      };
      if (bodyKeys.size > 0) requestInit.body = JSON.stringify(body);
      const response = await this.fetchImpl(url, requestInit);
      const text = await response.text();
      const responseRequestId = response.headers.get('x-request-id') || requestId;
      const retryAfterValue = response.headers.get('retry-after');
      const retryAfter = retryAfterValue === null ? undefined : Number(retryAfterValue);
      let parsed: unknown = {};
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = {}; }
      }
      const safeBody = sanitize(parsed, this.config.bankingApiKey);
      const telemetry: ToolTelemetry = {
        operationId: operation.operationId,
        httpStatus: response.status,
        durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100),
        responseBytes: Buffer.byteLength(text),
        attempts: 1,
        idempotencyReplayed: response.headers.get('idempotency-replayed') === 'true',
        requestId: responseRequestId,
        runId: scope.runId
      };

      if (!response.ok) {
        return {
          ok: false,
          error: errorPayload(safeBody, response.status, responseRequestId, Number.isFinite(retryAfter) ? retryAfter : undefined),
          telemetry
        };
      }
      return { ok: true, data: safeBody as Record<string, unknown>, telemetry };
    } catch (error) {
      const message = error instanceof Error && error.name === 'TimeoutError'
        ? 'The Banking API request timed out'
        : 'The Banking API is unavailable';
      return {
        ok: false,
        error: {
          code: error instanceof Error && error.name === 'TimeoutError' ? 'BANKING_API_TIMEOUT' : 'BANKING_API_UNAVAILABLE',
          httpStatus: 503,
          message,
          requestId
        },
        telemetry: {
          operationId: operation.operationId,
          httpStatus: 503,
          durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100),
          responseBytes: 0,
          attempts: 1,
          idempotencyReplayed: false,
          requestId,
          runId: scope.runId
        }
      };
    }
  }
}
