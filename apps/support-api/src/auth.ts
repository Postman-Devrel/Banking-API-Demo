import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ApiError } from './errors.js';
import type { Principal, Role, SupportConfig } from './types.js';

declare module 'express-serve-static-core' {
  interface Request { principal?: Principal; runId?: string; requestId?: string }
}

function digest(value: string): Buffer { return createHash('sha256').update(value, 'utf8').digest(); }
export function secureEqual(left: string, right: string): boolean { return timingSafeEqual(digest(left), digest(right)); }

export class CredentialRegistry {
  private readonly credentials = new Map<string, Principal>();
  private counter = 1000;

  constructor(config: SupportConfig) {
    this.credentials.set(digest(config.agentApiKey).toString('hex'), { principalId: 'PRN-SUPPORT-AGENT', role: 'SUPPORT_AGENT', displayName: 'Demo support agent' });
    this.credentials.set(digest(config.adminApiKey).toString('hex'), { principalId: 'PRN-SUPPORT-ADMIN', role: 'SUPPORT_ADMIN', displayName: 'Demo support administrator' });
  }

  resolve(rawKey: string): Principal | undefined {
    const candidate = digest(rawKey);
    for (const [stored, principal] of this.credentials) {
      if (timingSafeEqual(candidate, Buffer.from(stored, 'hex'))) return structuredClone(principal);
    }
    return undefined;
  }

  create(role: Role, displayName: string): { apiKey: string; principal: Principal } {
    this.counter += 1;
    const apiKey = `support_${randomBytes(24).toString('base64url')}`;
    const principal = { principalId: `PRN-SUPPORT-${this.counter}`, role, displayName };
    this.credentials.set(digest(apiKey).toString('hex'), principal);
    return { apiKey, principal: structuredClone(principal) };
  }
}

export function authenticate(registry: CredentialRegistry): RequestHandler {
  return (req, res, next) => {
    const rawKey = req.get('x-api-key')?.trim();
    const principal = rawKey ? registry.resolve(rawKey) : undefined;
    if (!principal) {
      res.locals.authenticated = false;
      next(new ApiError(401, 'UNAUTHORIZED', 'A valid Support API key is required'));
      return;
    }
    req.principal = principal;
    res.locals.authenticated = true;
    next();
  };
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.principal?.role !== 'SUPPORT_ADMIN') {
    next(new ApiError(403, 'FORBIDDEN', 'The Support administrator credential is required'));
    return;
  }
  next();
};
