import { createRequire } from 'node:module';
import type { ErrorObject } from 'ajv';
import schemas from '@intergalactic/support-contract/schemas';
import type { RequestHandler } from 'express';
import { ApiError, type ErrorDetail } from './errors.js';

const require = createRequire(import.meta.url);
const Ajv = require('ajv') as typeof import('ajv').default;
const addFormats = require('ajv-formats') as typeof import('ajv-formats').default;
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validators = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)]));

function details(errors: ErrorObject[] | null | undefined): ErrorDetail[] {
  return (errors || []).map(error => ({ field: error.instancePath || '/', issue: error.message || 'is invalid' }));
}

export function validateBody(schemaName: string): RequestHandler {
  return (req, _res, next) => {
    const validator = validators[schemaName];
    if (!validator) { next(new ApiError(500, 'INTERNAL_ERROR', 'Request schema is unavailable', true)); return; }
    if (!validator(req.body)) {
      next(new ApiError(400, 'VALIDATION_ERROR', 'The request body does not match the operation schema', false, details(validator.errors)));
      return;
    }
    next();
  };
}

export const requireIdempotencyKey: RequestHandler = (req, _res, next) => {
  const key = req.get('idempotency-key')?.trim();
  if (!key || key.length > 128) {
    next(new ApiError(400, 'VALIDATION_ERROR', 'Idempotency-Key is required and must be at most 128 characters', false, [{ field: 'Idempotency-Key', issue: 'required with maximum length 128' }]));
    return;
  }
  next();
};
