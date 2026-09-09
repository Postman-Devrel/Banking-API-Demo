import { createHash } from 'node:crypto';
import { canonicalize } from 'json-canonicalize';
import requestSchemas from '@intergalactic/support-contract/schemas';
import type { McpConfig, RequestScope, SupportApiResult, ToolTelemetry } from './types.js';
import type { SupportOperation } from '@intergalactic/support-contract/operations';

type Fetch = typeof globalThis.fetch;
const PATH_PARAMETER_PATTERN = /{([^}]+)}/g;
const SECRET_FIELD_PATTERN = /api.?key|authorization|credential|password|secret|token/i;
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function sanitize(value: unknown, secret: string): unknown {
  if (Array.isArray(value)) return value.map(item => sanitize(item, secret));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !SECRET_FIELD_PATTERN.test(key)).map(([key, child]) => [key, sanitize(child, secret)]));
  if (typeof value === 'string' && secret && value.includes(secret)) return value.replaceAll(secret, '[REDACTED]');
  return value;
}
function bodyProperties(operation: SupportOperation): Set<string> {
  if (!operation.request) return new Set(); const schema = requestSchemas[operation.request];
  return !schema || typeof schema === 'boolean' ? new Set() : new Set(Object.keys(schema.properties || {}));
}
function errorPayload(body: unknown, status: number, requestId: string, retryAfter?: number) {
  const root = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const nested = root.error && typeof root.error === 'object' ? root.error as Record<string, unknown> : {};
  return {
    code: typeof nested.code === 'string' ? nested.code : `HTTP_${status}`, httpStatus: status,
    message: typeof nested.message === 'string' ? nested.message.slice(0, 500) : 'The Support API request failed',
    retryable: typeof nested.retryable === 'boolean' ? nested.retryable : status >= 500 || status === 429,
    requestId: typeof nested.requestId === 'string' ? nested.requestId : requestId,
    ...(retryAfter === undefined ? {} : { retryAfter }), ...(Array.isArray(nested.details) ? { details: nested.details } : {})
  };
}

export class SupportApiClient {
  constructor(private readonly config: McpConfig, private readonly fetchImpl: Fetch = globalThis.fetch) {}
  async execute(operation: SupportOperation, rawArgs: unknown, scope: RequestScope, mcpRequestId: string | number): Promise<SupportApiResult> {
    const startedAt = performance.now(); const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>;
    const canonicalArgs = canonicalize(args);
    const requestId = scope.inboundRequestId || `mcp-support-${hash(`${scope.runId}:${mcpRequestId}:${operation.operationId}:${canonicalArgs}`).slice(0, 24)}`;
    const path = operation.path.replace(PATH_PARAMETER_PATTERN, (_match, name: string) => {
      const value = args[name]; if (typeof value !== 'string') throw new Error(`Missing path argument: ${name}`); return encodeURIComponent(value);
    });
    const url = new URL(`${this.config.supportApiBaseUrl}${path}`);
    if (operation.collection) {
      if (args.limit !== undefined) url.searchParams.set('limit', String(args.limit));
      if (args.cursor !== undefined) url.searchParams.set('cursor', String(args.cursor));
    }
    for (const query of operation.queries) if (args[query.name] !== undefined) url.searchParams.set(query.name, String(args[query.name]));
    const allowedBody = bodyProperties(operation);
    const body = Object.fromEntries([...allowedBody].filter(key => args[key] !== undefined).map(key => [key, args[key]]));
    const headers: Record<string, string> = { Accept: 'application/json', 'X-API-Key': this.config.supportApiKey, 'X-Demo-Run-Id': scope.runId, 'X-Request-Id': requestId };
    if (operation.mutation) headers['Idempotency-Key'] = `mcp-${hash(`${requestId}:${operation.operationId}:${canonicalArgs}`)}`;
    if (allowedBody.size) headers['Content-Type'] = 'application/json';
    try {
      const init: RequestInit = { method: operation.method.toUpperCase(), headers, signal: AbortSignal.timeout(this.config.requestTimeoutMs) };
      if (allowedBody.size) init.body = JSON.stringify(body);
      const response = await this.fetchImpl(url, init); const text = await response.text();
      const responseRequestId = response.headers.get('x-request-id') || requestId; const retryValue = response.headers.get('retry-after');
      const retryAfter = retryValue === null ? undefined : Number(retryValue); let parsed: unknown = {};
      if (text) try { parsed = JSON.parse(text); } catch { parsed = {}; }
      const safeBody = sanitize(parsed, this.config.supportApiKey);
      const telemetry: ToolTelemetry = {
        operationId: operation.operationId, httpStatus: response.status,
        durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100), responseBytes: Buffer.byteLength(text), attempts: 1,
        idempotencyReplayed: response.headers.get('idempotency-replayed') === 'true', requestId: responseRequestId, runId: scope.runId
      };
      if (!response.ok) return { ok: false, error: errorPayload(safeBody, response.status, responseRequestId, Number.isFinite(retryAfter) ? retryAfter : undefined), telemetry };
      return { ok: true, data: safeBody as Record<string, unknown>, telemetry };
    } catch (error) {
      const timeout = error instanceof Error && error.name === 'TimeoutError';
      return {
        ok: false, error: { code: timeout ? 'SUPPORT_API_TIMEOUT' : 'SUPPORT_API_UNAVAILABLE', httpStatus: 503, message: timeout ? 'The Support API request timed out' : 'The Support API is unavailable', retryable: true, requestId },
        telemetry: { operationId: operation.operationId, httpStatus: 503, durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100), responseBytes: 0, attempts: 1, idempotencyReplayed: false, requestId, runId: scope.runId }
      };
    }
  }
}
