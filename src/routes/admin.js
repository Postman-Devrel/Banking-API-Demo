/**
 * Admin Routes
 * Handles administrative operations like API key generation
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * GET /api/v1/auth
 * Generate a new API key
 */
router.get('/auth', (req, res) => {
  try {
    const apiKey = db.generateApiKey();
    
    res.status(200).json({
      apiKey: apiKey
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

module.exports = router;

