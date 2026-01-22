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

  // If API key doesn't exist, automatically register it
  if (!db.validateApiKey(apiKey)) {
    db.addApiKey(apiKey);
  }

  // Store API key in request for potential admin check
  req.apiKey = apiKey;
  next();
};

/**
 * Middleware to check if user has admin permissions
 * For this demo, we'll use the default API key '1234' as admin
 */
const requireAdmin = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY || '1234';
  
  if (req.apiKey !== adminKey) {
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

