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
 * GET /api/v1/accounts/:id
 * Get a single account by ID
 */
router.get('/:id', validateApiKey, (req, res) => {
  try {
    const { id } = req.params;

    // Get account from database
    const account = db.getAccountById(id);

    // Check if account exists
    if (!account || account.deleted) {
      return res.status(404).json({
        error: {
          name: 'notFound',
          message: 'Account not found'
        }
      });
    }

    // Check ownership - users can only access their own accounts
    if (account.apiKey !== req.apiKey) {
      return res.status(403).json({
        error: {
          name: 'forbidden',
          message: 'Access denied. You can only access your own accounts.'
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
 * PUT /api/v1/accounts/:id
 * Update an existing account
 */
router.put('/:id', validateApiKey, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get account from database
    const account = db.getAccountById(id);

    // Check if account exists
    if (!account || account.deleted) {
      return res.status(404).json({
        error: {
          name: 'notFound',
          message: 'Account not found'
        }
      });
    }

    // Check ownership - users can only update their own accounts
    if (account.apiKey !== req.apiKey) {
      return res.status(403).json({
        error: {
          name: 'forbidden',
          message: 'Access denied. You can only update your own accounts.'
        }
      });
    }

    // Prevent balance updates (balance only changes via transactions)
    if (updates.balance !== undefined) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: 'Balance cannot be updated directly. Use transaction endpoints to modify balance.'
        }
      });
    }

    // Prevent updates to immutable fields
    if (updates.accountId || updates.createdAt || updates.apiKey || updates.deleted !== undefined) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: 'Cannot update accountId, createdAt, apiKey, or deleted fields.'
        }
      });
    }

    // Validate updatable fields
    const validationData = { ...account, ...updates };
    const validation = Account.validate(validationData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: validation.error
        }
      });
    }

    // Update account
    const updatedAccount = db.updateAccount(id, updates);

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

    // Get account from database
    const account = db.getAccountById(id);

    // Check if account exists
    if (!account || account.deleted) {
      return res.status(404).json({
        error: {
          name: 'notFound',
          message: 'Account not found'
        }
      });
    }

    // Check ownership - users can only delete their own accounts
    if (account.apiKey !== req.apiKey) {
      return res.status(403).json({
        error: {
          name: 'forbidden',
          message: 'Access denied. You can only delete your own accounts.'
        }
      });
    }

    // Check if account has transactions
    const hasTransactions = db.accountHasTransactions(id);

    // Always perform soft delete
    const deleted = db.deleteAccount(id);

    if (!deleted) {
      return res.status(500).json({
        error: {
          name: 'serverError',
          message: 'Failed to delete account'
        }
      });
    }

    res.status(200).json({
      message: 'Account deleted successfully',
      accountId: id,
      deletionType: hasTransactions ? 'soft (has transactions)' : 'soft'
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

