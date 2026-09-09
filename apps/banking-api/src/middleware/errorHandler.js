/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const errorHandler = (err, req, res, _next) => {
  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  if (statusCode >= 500) console.error('Error:', err);
  const response = {
    error: {
      name: (err.name && err.name !== 'Error') ? err.name : 'serverError',
      message: err.message || 'An unexpected error occurred'
    }
  };

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      name: 'notFoundError',
      message: `Route ${req.method} ${req.url} not found`
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
