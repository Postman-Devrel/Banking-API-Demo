import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ApiError } from './errors.js';

export const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const requestContext: RequestHandler = (req, res, next) => {
  const runId = req.get('x-demo-run-id') || 'default';
  const requestId = req.get('x-request-id')?.trim() || `REQ-FRAUD-${randomUUID()}`;
  if (!RUN_ID_PATTERN.test(runId)) {
    next(new ApiError(400, 'VALIDATION_ERROR', 'X-Demo-Run-Id must match [A-Za-z0-9_-]{1,64}', false, [{ field: 'X-Demo-Run-Id', issue: 'invalid format' }]));
    return;
  }
  if (requestId.length > 128) {
    next(new ApiError(400, 'VALIDATION_ERROR', 'X-Request-Id must be at most 128 characters', false, [{ field: 'X-Request-Id', issue: 'maximum length is 128' }]));
    return;
  }
  req.runId = runId;
  req.requestId = requestId;
  res.set('X-Demo-Run-Id', runId).set('X-Request-Id', requestId);
  next();
};
