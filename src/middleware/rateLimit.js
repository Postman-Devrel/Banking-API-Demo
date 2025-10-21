/**
 * Rate Limiting Middleware
 * Implements simple in-memory rate limiting
 */

class RateLimiter {
  constructor(maxRequests = 300, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // Map of IP/Key -> array of timestamps
  }

  /**
   * Middleware function to apply rate limiting
   */
  middleware() {
    return (req, res, next) => {
      const identifier = req.apiKey || req.ip;
      const now = Date.now();
      
      // Get existing requests for this identifier
      if (!this.requests.has(identifier)) {
        this.requests.set(identifier, []);
      }

      const userRequests = this.requests.get(identifier);
      
      // Remove old requests outside the time window
      const validRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs);
      
      // Check if rate limit exceeded
      if (validRequests.length >= this.maxRequests) {
        const oldestRequest = validRequests[0];
        const resetTime = Math.ceil((oldestRequest + this.windowMs) / 1000);
        
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', resetTime);
        
        return res.status(429).json({
          error: {
            name: 'rateLimitExceeded',
            message: `Too many requests. Maximum ${this.maxRequests} requests per minute allowed.`
          }
        });
      }

      // Add current request
      validRequests.push(now);
      this.requests.set(identifier, validRequests);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.maxRequests - validRequests.length);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + this.windowMs) / 1000));

      next();
    };
  }

  /**
   * Clean up old entries periodically
   */
  cleanup() {
    const now = Date.now();
    for (const [identifier, timestamps] of this.requests.entries()) {
      const validRequests = timestamps.filter(timestamp => now - timestamp < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Create rate limiter instance
const rateLimiterRequests = parseInt(process.env.RATE_LIMIT_REQUESTS) || 300;
const rateLimiterWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const rateLimiter = new RateLimiter(rateLimiterRequests, rateLimiterWindow);

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

module.exports = rateLimiter.middleware();

