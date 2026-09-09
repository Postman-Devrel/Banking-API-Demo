import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { canonicalize } from 'json-canonicalize';
import { assess } from './assessmentService.js';
import { authenticate, requireAdmin } from './auth.js';
import { ApiError } from './errors.js';
import { requestContext, RUN_ID_PATTERN } from './requestContext.js';
import { FraudStore } from './store.js';
import type { AssessmentInput, FraudConfig, StoredResponse } from './types.js';
import { validateBody } from './validation.js';

export interface FraudLogger { log(event: Record<string, unknown>): void }
const defaultLogger: FraudLogger = { log: event => console.log(JSON.stringify(event)) };

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

const requireIdempotencyKey: RequestHandler = (req, _res, next) => {
    const key = req.get('idempotency-key')?.trim();
    if (!key || key.length > 128) {
      next(new ApiError(400, 'VALIDATION_ERROR', 'Idempotency-Key is required and must be at most 128 characters', false, [{ field: 'Idempotency-Key', issue: 'required with maximum length 128' }]));
      return;
    }
    next();
};

function idempotencyScope(req: express.Request, operationId: string): string {
  return `${req.principal?.principalId}:${operationId}:${req.get('idempotency-key')}`;
}

function fingerprint(value: unknown): string {
  return hash(canonicalize(value));
}

function pathParameter(req: express.Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', `${name} is required`);
  return value;
}

function replayIfPresent(req: express.Request, res: express.Response, store: FraudStore, runId: string, operationId: string, value: unknown): boolean {
  const record = store.replay(runId, idempotencyScope(req, operationId), fingerprint(value));
  if (!record) return false;
  for (const [name, header] of Object.entries(record.headers)) res.set(name, header);
  res.set('Idempotency-Replayed', 'true').status(record.status).json(record.body);
  return true;
}

function complete(req: express.Request, store: FraudStore, runId: string, operationId: string, value: unknown, response: Omit<StoredResponse, 'state' | 'fingerprint' | 'createdAt'>): void {
  store.complete(runId, idempotencyScope(req, operationId), {
    ...response, state: 'COMPLETED', fingerprint: fingerprint(value), createdAt: Date.now()
  });
}

function reserve(req: express.Request, store: FraudStore, runId: string, operationId: string, value: unknown): void {
  store.reserve(runId, idempotencyScope(req, operationId), fingerprint(value));
}

export function createApp(config: FraudConfig, dependencies: { store?: FraudStore; logger?: FraudLogger } = {}) {
  const app = express();
  const store = dependencies.store || new FraudStore(config);
  const logger = dependencies.logger || defaultLogger;
  const auth = authenticate(config);

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on('finish', () => logger.log({
      event: 'fraud_api_request', requestId: req.requestId, runId: req.runId,
      method: req.method, path: req.path, status: res.statusCode,
      durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100),
      authenticated: res.locals.authenticated ?? null,
      ...(res.locals.transactionId ? { transactionId: res.locals.transactionId } : {}),
      ...(res.locals.assessmentId ? { assessmentId: res.locals.assessmentId } : {}),
      ...(res.locals.attempt ? { attempt: res.locals.attempt } : {}),
      faultApplied: Boolean(res.locals.faultApplied)
    }));
    next();
  });
  app.use(express.json({ limit: '64kb', strict: true }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'fraud-api', version: '1.1.0' }));
  app.get('/openapi.yaml', (_req, res) => res.sendFile(fileURLToPath(new URL('../openapi/openapi.yaml', import.meta.url))));

  app.post('/v1/fraud/assessments', auth, requireIdempotencyKey, validateBody('createAssessment'), (req, res, next) => {
    try {
      const runId = req.runId || 'default';
      const input = req.body as AssessmentInput;
      res.locals.transactionId = input.transactionId;
      const idemValue = { body: input };
      if (replayIfPresent(req, res, store, runId, 'createFraudAssessment', idemValue)) return;

      const attempt = store.incrementAttempt(runId, input.transactionId);
      res.locals.attempt = attempt;
      res.set('X-Fraud-Attempt', String(attempt));
      if (store.getRun(runId).faults.failFirstAssessment && attempt === 1) {
        res.locals.faultApplied = true;
        next(new ApiError(429, 'RATE_LIMITED', 'The assessment rate limit was reached', true, undefined, 1000));
        return;
      }

      const assessment = assess(input);
      const existing = store.getAssessment(runId, assessment.assessmentId);
      if (existing && canonicalize(existing) !== canonicalize(assessment)) {
        throw new ApiError(409, 'ASSESSMENT_INPUT_CONFLICT', 'This transaction already has an assessment derived from different input');
      }
      reserve(req, store, runId, 'createFraudAssessment', idemValue);
      if (!existing) store.saveAssessment(runId, assessment);
      res.locals.assessmentId = assessment.assessmentId;
      const status = existing ? 200 : 201;
      const headers = { Location: `/v1/fraud/assessments/${assessment.assessmentId}`, 'X-Fraud-Attempt': String(attempt) };
      complete(req, store, runId, 'createFraudAssessment', idemValue, { status, body: assessment as unknown as Record<string, unknown>, headers });
      res.set(headers).status(status).json(assessment);
    } catch (error) { next(error); }
  });

  app.get('/v1/fraud/assessments/:assessmentId', auth, (req, res, next) => {
    try {
      const assessment = store.getAssessment(req.runId || 'default', pathParameter(req, 'assessmentId'));
      if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'The fraud assessment does not exist in this run');
      res.locals.transactionId = assessment.transactionId;
      res.locals.assessmentId = assessment.assessmentId;
      res.json(assessment);
    } catch (error) { next(error); }
  });

  if (config.nodeEnv !== 'production') {
    app.put('/_demo/v1/runs/:runId/faults', auth, requireAdmin, requireIdempotencyKey, validateBody('configureFaults'), (req, res, next) => {
      try {
        const runId = pathParameter(req, 'runId');
        if (!RUN_ID_PATTERN.test(runId)) throw new ApiError(400, 'VALIDATION_ERROR', 'runId has an invalid format');
        req.runId = runId;
        res.set('X-Demo-Run-Id', runId);
        const idemValue = { params: { runId }, body: req.body };
        if (replayIfPresent(req, res, store, runId, 'configureFraudFaults', idemValue)) return;
        reserve(req, store, runId, 'configureFraudFaults', idemValue);
        store.configureFaults(runId, Boolean(req.body.failFirstAssessment));
        const body = { runId, faults: { failFirstAssessment: Boolean(req.body.failFirstAssessment) } };
        complete(req, store, runId, 'configureFraudFaults', idemValue, { status: 200, body, headers: {} });
        res.json(body);
      } catch (error) { next(error); }
    });

    app.post('/_demo/v1/runs/:runId/reset', auth, requireAdmin, requireIdempotencyKey, (req, res, next) => {
      try {
        const runId = pathParameter(req, 'runId');
        if (!RUN_ID_PATTERN.test(runId)) throw new ApiError(400, 'VALIDATION_ERROR', 'runId has an invalid format');
        req.runId = runId;
        res.set('X-Demo-Run-Id', runId);
        const idemValue = { params: { runId } };
        if (replayIfPresent(req, res, store, runId, 'resetFraudRun', idemValue)) return;
        reserve(req, store, runId, 'resetFraudRun', idemValue);
        store.reset(runId);
        reserve(req, store, runId, 'resetFraudRun', idemValue);
        const body = store.summary(runId);
        complete(req, store, runId, 'resetFraudRun', idemValue, { status: 200, body, headers: {} });
        res.json(body);
      } catch (error) { next(error); }
    });
  }

  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Route not found')));

  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const bodyParserError = error && typeof error === 'object' ? error as { type?: string } : undefined;
    const apiError = error instanceof ApiError
      ? error
      : bodyParserError?.type === 'entity.too.large'
        ? new ApiError(400, 'VALIDATION_ERROR', 'The request body exceeds the 64 KiB limit')
      : error instanceof SyntaxError
        ? new ApiError(400, 'VALIDATION_ERROR', 'The request body is not valid JSON')
        : new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred', true);
    if (apiError.retryAfterMs) res.set('Retry-After', String(Math.ceil(apiError.retryAfterMs / 1000)));
    const body = {
      error: {
        code: apiError.code, message: apiError.message, retryable: apiError.retryable,
        requestId: req.requestId || 'unavailable',
        ...(apiError.retryAfterMs ? { retryAfterMs: apiError.retryAfterMs } : {}),
        ...(apiError.details ? { details: apiError.details } : {})
      }
    };
    res.status(apiError.status).json(body);
  };
  app.use(errorHandler);

  return { app, store };
}
