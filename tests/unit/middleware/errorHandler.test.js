/**
 * Error Handler Middleware Tests
 */

const { errorHandler, notFoundHandler } = require('../../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      url: '/test-route'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('errorHandler()', () => {
    test('should handle error with status code', () => {
      const error = new Error('Test error');
      error.statusCode = 400;
      error.name = 'ValidationError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: 'ValidationError',
          message: 'Test error'
        }
      });
    });

    test('should default to 500 status code', () => {
      const error = new Error('Server error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should use default error name if not provided', () => {
      const error = new Error('Some error');
      delete error.name;

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: 'serverError',
          message: 'Some error'
        }
      });
    });

    test('should handle error without message', () => {
      const error = new Error();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: expect.any(String),
          message: 'An unexpected error occurred'
        }
      });
    });
  });

  describe('notFoundHandler()', () => {
    test('should return 404 with route information', () => {
      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: 'notFoundError',
          message: 'Route GET /test-route not found'
        }
      });
    });

    test('should handle different HTTP methods', () => {
      req.method = 'POST';
      req.url = '/api/v1/test';

      notFoundHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        error: {
          name: 'notFoundError',
          message: 'Route POST /api/v1/test not found'
        }
      });
    });
  });
});

