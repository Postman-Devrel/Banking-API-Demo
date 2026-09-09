jest.mock('../../../src/database/db', () => ({ authenticate: jest.fn() }));

const db = require('../../../src/database/db');
const { validateApiKey, requireAdmin } = require('../../../src/middleware/auth');

describe('principal authentication middleware', () => {
  let req;
  let res;
  let next;
  beforeEach(() => {
    req = { headers: {}, runId: 'lane' };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test.each(['x-api-key', 'api-key'])('resolves %s credentials to a safe principal', header => {
    req.headers[header] = 'secret';
    db.authenticate.mockReturnValue({ principalId: 'PRN-1', role: 'CUSTOMER', customerId: 'CUS-1' });
    validateApiKey(req, res, next);
    expect(db.authenticate).toHaveBeenCalledWith('secret', 'lane');
    expect(req.principal).toEqual({ principalId: 'PRN-1', role: 'CUSTOMER', customerId: 'CUS-1' });
    expect(req).not.toHaveProperty('apiKey');
    expect(next).toHaveBeenCalled();
  });

  test('rejects missing and invalid credentials without retaining them', () => {
    validateApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    req.headers['x-api-key'] = 'wrong';
    db.authenticate.mockReturnValue(null);
    validateApiKey(req, res, next);
    expect(res.status).toHaveBeenLastCalledWith(401);
    expect(req).not.toHaveProperty('apiKey');
  });

  test('authorizes only ADMIN principals', () => {
    req.principal = { principalId: 'PRN-ADMIN', role: 'ADMIN' };
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
    next.mockClear();
    req.principal = { principalId: 'PRN-CUSTOMER', role: 'CUSTOMER' };
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
