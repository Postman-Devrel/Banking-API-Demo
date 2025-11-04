/**
 * Authentication Middleware Tests
 */

const { validateApiKey, requireAdmin } = require('../../../src/middleware/auth');

// Mock the database
jest.mock('../../../src/database/db', () => ({
  validateApiKey: jest.fn()
}));

const db = require('../../../src/database/db');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateApiKey()', () => {
    test('should accept valid API key from x-api-key header', () => {
      req.headers['x-api-key'] = 'valid-key';
      db.validateApiKey.mockReturnValue(true);

      validateApiKey(req, res, next);

      expect(db.validateApiKey).toHaveBeenCalledWith('valid-key');
      expect(req.apiKey).toBe('valid-key');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should accept valid API key from api-key header', () => {
      req.headers['api-key'] = 'valid-key';
      db.validateApiKey.mockReturnValue(true);

      validateApiKey(req, res, next);

      expect(db.validateApiKey).toHaveBeenCalledWith('valid-key');
      expect(req.apiKey).toBe('valid-key');
      expect(next).toHaveBeenCalled();
    });

    test('should reject request with missing API key', () => {
      validateApiKey(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: 'authenticationError',
          message: expect.stringContaining('API key is required')
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with invalid API key', () => {
      req.headers['x-api-key'] = 'invalid-key';
      db.validateApiKey.mockReturnValue(false);

      validateApiKey(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: 'authenticationError',
          message: expect.stringContaining('Invalid API key')
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin()', () => {
    test('should allow admin with correct API key', () => {
      req.apiKey = process.env.ADMIN_API_KEY || '1234';

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject non-admin user', () => {
      req.apiKey = 'regular-user-key';

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: 'forbiddenError',
          message: expect.stringContaining('do not have permissions')
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should use default admin key if env variable not set', () => {
      const originalAdminKey = process.env.ADMIN_API_KEY;
      delete process.env.ADMIN_API_KEY;
      
      req.apiKey = '1234';

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();

      // Restore
      process.env.ADMIN_API_KEY = originalAdminKey;
    });
  });
});

