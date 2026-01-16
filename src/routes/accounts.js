/**
 * Account Routes
 * Handles all account-related operations
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const Account = require('../models/Account');
const { validateApiKey } = require('../middleware/auth');

/**
 * GET /api/v1/accounts
 * List all accounts with optional filters
 */
router.get('/', validateApiKey, (req, res) => {
  try {
    const { owner, createdAt } = req.query;

    // Filter by API key for ownership and other optional filters
    const filters = { apiKey: req.apiKey };
    if (owner) filters.owner = owner;
    if (createdAt) filters.createdAt = createdAt;

    const accounts = db.getAccounts(filters);

    res.status(200).json({
      accounts: accounts.map(acc => acc.toJSON())
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to retrieve accounts'
      }
    });
  }
});

/**
 * GET /api/v1/accounts/:id
 * Get a single account by ID
 */
router.get('/:id', validateApiKey, (req, res) => {
  try {
    const { id } = req.params;

    const account = db.getAccountById(id);

    if (!account || account.deleted) {
      return res.status(404).json({
        error: {
          name: 'notFoundError',
          message: 'Account not found'
        }
      });
    }

    // Check ownership
    if (account.apiKey !== req.apiKey) {
      return res.status(403).json({
        error: {
          name: 'forbiddenError',
          message: 'You do not have permission to access this account'
        }
      });
    }

    res.status(200).json({
      account: account.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to retrieve account'
      }
    });
  }
});

/**
 * POST /api/v1/accounts
 * Create a new account
 */
router.post('/', validateApiKey, (req, res) => {
  try {
    const accountData = req.body;

    // Validate account data
    const validation = Account.validate(accountData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: validation.error
        }
      });
    }

    // Create account with API key for ownership
    const account = db.createAccount(accountData, req.apiKey);

    res.status(201).json({
      account: {
        accountId: account.accountId
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to create account'
      }
    });
  }
});

/**
 * PUT /api/v1/accounts/:id
 * Update an existing account (owner name and account type only)
 */
router.put('/:id', validateApiKey, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const account = db.getAccountById(id);

    if (!account || account.deleted) {
      return res.status(404).json({
        error: {
          name: 'notFoundError',
          message: 'Account not found'
        }
      });
    }

    // Check ownership
    if (account.apiKey !== req.apiKey) {
      return res.status(403).json({
        error: {
          name: 'forbiddenError',
          message: 'You do not have permission to update this account'
        }
      });
    }

    // Only allow updating owner and accountType
    const allowedUpdates = {};
    if (updates.owner !== undefined) allowedUpdates.owner = updates.owner;
    if (updates.accountType !== undefined) allowedUpdates.accountType = updates.accountType;

    // Validate updates
    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: 'No valid fields to update. Only owner and accountType can be updated.'
        }
      });
    }

    // Validate account type if provided
    if (allowedUpdates.accountType) {
      const validation = Account.validate({ ...account, accountType: allowedUpdates.accountType });
      if (!validation.isValid) {
        return res.status(400).json({
          error: {
            name: 'validationError',
            message: validation.error
          }
        });
      }
    }

    // Validate owner if provided
    if (allowedUpdates.owner !== undefined && (typeof allowedUpdates.owner !== 'string' || allowedUpdates.owner.trim() === '')) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: 'Owner name must be a non-empty string'
        }
      });
    }

    const updatedAccount = db.updateAccount(id, allowedUpdates);

    res.status(200).json({
      account: updatedAccount.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to update account'
      }
    });
  }
});

/**
 * DELETE /api/v1/accounts/:id
 * Delete an account (soft delete)
 */
router.delete('/:id', validateApiKey, (req, res) => {
  try {
    const { id } = req.params;

    const account = db.getAccountById(id);

    if (!account || account.deleted) {
      return res.status(404).json({
        error: {
          name: 'notFoundError',
          message: 'Account not found'
        }
      });
    }

    // Check ownership
    if (account.apiKey !== req.apiKey) {
      return res.status(403).json({
        error: {
          name: 'forbiddenError',
          message: 'You do not have permission to delete this account'
        }
      });
    }

    db.deleteAccount(id);

    res.status(200).json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to delete account'
      }
    });
  }
});

module.exports = router;

