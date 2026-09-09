import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ApiError } from './errors.js';
import type { FraudConfig, Principal } from './types.js';

declare module 'express-serve-static-core' {
  interface Request { principal?: Principal; runId?: string; requestId?: string }
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function secureEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function authenticate(config: FraudConfig): RequestHandler {
  return (req, res, next) => {
    const key = req.get('x-api-key')?.trim();
    let principal: Principal | undefined;
    if (key && secureEqual(key, config.customerApiKey)) principal = { principalId: 'PRN-FRAUD-CUSTOMER', role: 'CUSTOMER' };
    else if (key && secureEqual(key, config.adminApiKey)) principal = { principalId: 'PRN-FRAUD-ADMIN', role: 'ADMIN' };
    if (!principal) {
      res.locals.authenticated = false;
      next(new ApiError(401, 'UNAUTHORIZED', 'A valid Fraud API key is required'));
      return;
    }
    req.principal = principal;
    res.locals.authenticated = true;
    next();
  };
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.principal?.role !== 'ADMIN') {
    next(new ApiError(403, 'FORBIDDEN', 'The demo administrator credential is required'));
    return;
  }
  next();
};
