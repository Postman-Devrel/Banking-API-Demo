const rateLimit = require('../../../src/middleware/rateLimit');

const makeRequest = (runId, apiKey, ip = '127.0.0.1') => ({
  runId,
  ip,
  get: name => {
    if (name === 'x-api-key') return apiKey;
    return undefined;
  }
});

const makeResponse = () => ({
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
});

describe('RateLimiter', () => {
  test('separates limits by run and API key', () => {
    const limiter = new rateLimit.RateLimiter(1, 60000);
    const middleware = limiter.middleware();
    middleware(makeRequest('direct', 'key-a'), makeResponse(), jest.fn());

    const same = makeResponse();
    middleware(makeRequest('direct', 'key-a'), same, jest.fn());
    expect(same.status).toHaveBeenCalledWith(429);
    expect(same.headers['Retry-After']).toBeGreaterThan(0);

    const otherKeyNext = jest.fn();
    middleware(makeRequest('direct', 'key-b'), makeResponse(), otherKeyNext);
    expect(otherKeyNext).toHaveBeenCalled();

    const otherRunNext = jest.fn();
    middleware(makeRequest('fabric', 'key-a'), makeResponse(), otherRunNext);
    expect(otherRunNext).toHaveBeenCalled();
  });

  test('falls back to run plus IP for public requests', () => {
    const limiter = new rateLimit.RateLimiter(1, 60000);
    const middleware = limiter.middleware();
    middleware(makeRequest('direct', undefined, '10.0.0.1'), makeResponse(), jest.fn());
    const response = makeResponse();
    middleware(makeRequest('direct', undefined, '10.0.0.1'), response, jest.fn());
    expect(response.status).toHaveBeenCalledWith(429);
  });

  test('resets only the selected run or the complete limiter', () => {
    const limiter = new rateLimit.RateLimiter(5, 60000);
    const middleware = limiter.middleware();
    middleware(makeRequest('direct', 'key-a'), makeResponse(), jest.fn());
    middleware(makeRequest('fabric', 'key-a'), makeResponse(), jest.fn());

    limiter.reset('direct');
    expect([...limiter.requests.keys()].some(key => key.startsWith('direct:'))).toBe(false);
    expect([...limiter.requests.keys()].some(key => key.startsWith('fabric:'))).toBe(true);

    limiter.reset();
    expect(limiter.requests.size).toBe(0);
  });

  test('cleanup removes expired timestamps and retains active ones', () => {
    const limiter = new rateLimit.RateLimiter(5, 1000);
    const now = Date.now();
    limiter.requests.set('expired', [now - 2000]);
    limiter.requests.set('mixed', [now - 2000, now]);

    limiter.cleanup();
    expect(limiter.requests.has('expired')).toBe(false);
    expect(limiter.requests.get('mixed')).toEqual([now]);
  });
});
