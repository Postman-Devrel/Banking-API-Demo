/**
 * Run- and API-key-aware in-memory rate limiting.
 */

const { hashApiKey } = require('../security/credentials');

class RateLimiter {
  constructor(maxRequests = 300, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  identifier(req) {
    const runId = req.runId || req.get('x-demo-run-id') || 'default';
    const apiKey = req.get('x-api-key') || req.get('api-key');
    return apiKey ? `${runId}:credential:${hashApiKey(apiKey)}` : `${runId}:ip:${req.ip}`;
  }

  middleware() {
    return (req, res, next) => {
      const identifier = this.identifier(req);
      const now = Date.now();
      const timestamps = (this.requests.get(identifier) || [])
        .filter(timestamp => now - timestamp < this.windowMs);

      if (timestamps.length >= this.maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil((timestamps[0] + this.windowMs - now) / 1000));
        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil((timestamps[0] + this.windowMs) / 1000));
        return res.status(429).json({
          error: {
            name: 'rateLimitExceeded',
            message: `Too many requests. Retry in ${retryAfterSeconds} seconds.`
          }
        });
      }

      timestamps.push(now);
      this.requests.set(identifier, timestamps);
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.maxRequests - timestamps.length);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + this.windowMs) / 1000));
      next();
    };
  }

  reset(runId) {
    for (const key of this.requests.keys()) {
      if (!runId || key.startsWith(`${runId}:`)) this.requests.delete(key);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [identifier, timestamps] of this.requests.entries()) {
      const active = timestamps.filter(timestamp => now - timestamp < this.windowMs);
      if (active.length === 0) this.requests.delete(identifier);
      else this.requests.set(identifier, active);
    }
  }
}

const maxRequests = parseInt(process.env.RATE_LIMIT_REQUESTS, 10) || 300;
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const rateLimiter = new RateLimiter(maxRequests, windowMs);
const middleware = rateLimiter.middleware();

middleware.reset = runId => rateLimiter.reset(runId);
middleware.RateLimiter = RateLimiter;

const cleanupTimer = setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
cleanupTimer.unref();

module.exports = middleware;
