/**
 * Authentication Middleware
 * Validates API keys and checks permissions
 */

const db = require('../database/db');

/**
 * Middleware to validate API key
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: {
        name: 'authenticationError',
        message: 'API key is required. Please provide an API key in the x-api-key header.'
      }
    });
  }

  const principal = db.authenticate(apiKey, req.runId);
  if (!principal) {
    return res.status(401).json({
      error: {
        name: 'authenticationError',
        message: 'Invalid API key. Please provide a valid API key.'
      }
    });
  }

  req.principal = principal;
  next();
};

/**
 * Middleware to check if user has admin permissions
 * The principal role, never the credential value, grants administration rights.
 */
const requireAdmin = (req, res, next) => {
  if (!req.principal || req.principal.role !== 'ADMIN') {
    return res.status(403).json({
      error: {
        name: 'forbiddenError',
        message: 'You do not have permissions to perform this action. Admin access required.'
      }
    });
  }

  next();
};

module.exports = {
  validateApiKey,
  requireAdmin
};
