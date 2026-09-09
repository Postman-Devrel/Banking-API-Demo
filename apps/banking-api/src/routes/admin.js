/**
 * Admin Routes
 * Handles administrative operations like API key generation
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { validateApiKey, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/schemaValidation');
const idempotent = require('../middleware/mutationIdempotency');

/**
 * GET /api/v1/auth
 * Generate a new API key
 */
router.get('/auth', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        error: {
          name: 'notFoundError',
          message: 'Route GET /api/v1/auth not found'
        }
      });
    }

    if (!db.runs.has(req.runId || db.constructor.DEFAULT_RUN_ID)) {
      return res.status(404).json({ error: { name: 'notFoundError', message: 'Demo run not found' } });
    }

    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/v1/admin/api-keys>; rel="successor-version"');
    res.setHeader('Warning', '299 - "Use POST /api/v1/admin/api-keys"');
    const result = db.generateApiKey(req.runId, { role: 'CUSTOMER', customerId: 'CUS-1001' });

    res.status(200).json({
      apiKey: result.apiKey,
      principal: result.principal
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to generate API key'
      }
    });
  }
});

router.post('/admin/api-keys', validateApiKey, requireAdmin, idempotent('createApiKey'), validate('adminCreateCredential'), (req, res, next) => {
  try {
    const result = db.generateApiKey(req.runId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
