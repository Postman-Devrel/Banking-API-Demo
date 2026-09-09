import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { canonicalize } from 'json-canonicalize';
import operations, { type SupportOperation } from '@intergalactic/support-contract/operations';
import { authenticate, CredentialRegistry, requireAdmin } from './auth.js';
import { ApiError } from './errors.js';
import { RateLimiter } from './rateLimit.js';
import { requestContext, RUN_ID_PATTERN } from './requestContext.js';
import { SupportService } from './service.js';
import { SupportStore } from './store.js';
import type { CompletedIdempotency, ExecutionContext, SupportConfig } from './types.js';
import { requireIdempotencyKey, validateBody } from './validation.js';

export interface SupportLogger { log(event: Record<string, unknown>): void }
const defaultLogger: SupportLogger = { log: event => console.log(JSON.stringify(event)) };
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const expressPath = (path: string) => path.replace(/{([^}]+)}/g, ':$1');

function queryObject(query: express.Request['query']): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(query)) {
    if (typeof value !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', `Query parameter ${name} must have one value`);
    result[name] = value;
  }
  return result;
}

function routeParams(req: express.Request): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.params)) {
    if (typeof value !== 'string' || !RUN_ID_PATTERN.test(value)) throw new ApiError(400, 'VALIDATION_ERROR', `Path parameter ${name} has an invalid format`);
    result[name] = value;
  }
  return result;
}

function scope(req: express.Request, operation: SupportOperation): string {
  return `${req.principal!.principalId}:${operation.operationId}:${req.get('idempotency-key')}`;
}
function fingerprint(value: unknown): string { return hash(canonicalize(value)); }

export function createApp(config: SupportConfig, dependencies: { store?: SupportStore; credentials?: CredentialRegistry; logger?: SupportLogger } = {}) {
  const app = express(); const store = dependencies.store || new SupportStore(config);
  const credentials = dependencies.credentials || new CredentialRegistry(config); const service = new SupportService(store, credentials);
  const logger = dependencies.logger || defaultLogger; const auth = authenticate(credentials); const rateLimiter = new RateLimiter(config);

  app.disable('x-powered-by'); app.use(requestContext);
  app.use((req, res, next) => {
    const started = performance.now();
    res.on('finish', () => logger.log({
      event: 'support_api_request', requestId: req.requestId, runId: req.runId, method: req.method, path: req.path,
      operationId: res.locals.operationId || null, status: res.statusCode,
      durationMs: Math.max(0, Math.round((performance.now() - started) * 100) / 100), authenticated: res.locals.authenticated ?? null,
      ...(res.locals.caseId ? { caseId: res.locals.caseId } : {}), idempotencyReplayed: Boolean(res.locals.idempotencyReplayed)
    })); next();
  });
  app.use(express.json({ limit: '64kb', strict: true }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'support-api', version: '1.0.0' }));
  app.get('/openapi.yaml', (_req, res) => res.sendFile(fileURLToPath(new URL('../openapi/openapi.yaml', import.meta.url))));

  for (const operation of operations.filter(value => !value.public && !(value.demoOnly && config.nodeEnv === 'production'))) {
    const middleware: RequestHandler[] = [auth];
    if (operation.admin) middleware.push(requireAdmin);
    if (operation.mutation) middleware.push(requireIdempotencyKey);
    if (operation.request) middleware.push(validateBody(operation.request));
    const handler: RequestHandler = (req, res, next) => {
      let reservation: { runId: string; scope: string } | undefined;
      try {
        res.locals.operationId = operation.operationId;
        const params = routeParams(req); const runId = operation.demoOnly ? params.runId! : req.runId || 'default';
        if (operation.demoOnly) { req.runId = runId; res.set('X-Demo-Run-Id', runId); }
        if (params.caseId) res.locals.caseId = params.caseId;
        const query = queryObject(req.query); const value = { params, query, body: req.body || {} };
        const requestFingerprint = fingerprint(value); const requestScope = operation.mutation ? scope(req, operation) : '';
        if (operation.mutation) {
          const replay = store.replay(runId, requestScope, requestFingerprint);
          if (replay) {
            res.locals.idempotencyReplayed = true;
            for (const [name, header] of Object.entries(replay.headers)) res.set(name, header);
            res.set('Idempotency-Replayed', 'true').status(replay.status).json(replay.body); return;
          }
        }
        rateLimiter.check(req, res);
        if (operation.mutation) { store.reserve(runId, requestScope, requestFingerprint); reservation = { runId, scope: requestScope }; }
        const context: ExecutionContext = { runId, principal: req.principal!, requestId: req.requestId!, params, query, body: req.body || {} };
        const result = service.execute(operation.operationId, context); const status = result.status || operation.status; const headers = result.headers || {};
        if (operation.operationId === 'resetSupportRun') store.reserve(runId, requestScope, requestFingerprint);
        if (operation.mutation) {
          const completed: CompletedIdempotency = { state: 'COMPLETED', fingerprint: requestFingerprint, status, body: result.body, headers, createdAt: Date.now() };
          store.complete(runId, requestScope, completed); reservation = undefined;
        }
        res.set(headers).status(status).json(result.body);
      } catch (error) {
        if (reservation) store.release(reservation.runId, reservation.scope);
        next(error);
      }
    };
    (app as any)[operation.method](expressPath(operation.path), ...middleware, handler);
  }

  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Route not found')));
  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const parserError = error && typeof error === 'object' ? error as { type?: string } : undefined;
    const apiError = error instanceof ApiError ? error
      : parserError?.type === 'entity.too.large' ? new ApiError(400, 'VALIDATION_ERROR', 'The request body exceeds the 64 KiB limit')
      : error instanceof SyntaxError ? new ApiError(400, 'VALIDATION_ERROR', 'The request body is not valid JSON')
      : new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred', true);
    if (apiError.retryAfterMs) res.set('Retry-After', String(Math.ceil(apiError.retryAfterMs / 1000)));
    res.status(apiError.status).json({ error: { code: apiError.code, message: apiError.message, retryable: apiError.retryable, requestId: req.requestId || 'unavailable', ...(apiError.details ? { details: apiError.details } : {}) } });
  };
  app.use(errorHandler);
  return { app, store, credentials, service };
}
