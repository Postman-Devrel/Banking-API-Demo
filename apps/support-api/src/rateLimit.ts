import type { Request, Response } from 'express';
import { ApiError } from './errors.js';
import type { SupportConfig } from './types.js';

export class RateLimiter {
  private readonly buckets = new Map<string, { start: number; count: number }>();
  constructor(private readonly config: SupportConfig, private readonly now: () => number = Date.now) {}
  check(req: Request, res: Response): void {
    const key = `${req.runId}:${req.principal?.principalId}`;
    const current = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket || current - bucket.start >= this.config.rateLimitWindowMs) { bucket = { start: current, count: 0 }; this.buckets.set(key, bucket); }
    bucket.count += 1;
    const remaining = Math.max(0, this.config.rateLimitRequests - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.start + this.config.rateLimitWindowMs - current) / 1000));
    res.set('RateLimit-Limit', String(this.config.rateLimitRequests)).set('RateLimit-Remaining', String(remaining)).set('RateLimit-Reset', String(resetSeconds));
    if (bucket.count > this.config.rateLimitRequests) throw new ApiError(429, 'RATE_LIMITED', 'The Support API request limit was reached', true, undefined, resetSeconds * 1000);
  }
}
