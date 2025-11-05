/**
 * Account Routes
 * Handles all account-related operations
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const Account = require('../models/Account');
const { validateApiKey, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/v1/accounts
 * List all accounts with optional filters
 */
router.get('/', validateApiKey, (req, res) => {
  try {
    const { owner, createdAt } = req.query;
    
    const filters = {};
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
 * GET /api/v1/accounts/:accountId
 * Get a specific account by ID
 */
// router.get('/:accountId', validateApiKey, (req, res) => {
//   try {
//     const { accountId } = req.params;
    
//     const account = db.getAccountById(accountId);
    
//     if (!account) {
//       return res.status(404).json({
//         error: {
//           name: 'instanceNotFoundError',
//           message: 'The specified account does not exist.'
//         }
//       });
//     }

//     res.status(200).json({
//       account: account.toJSON()
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: {
//         name: 'serverError',
//         message: 'Failed to retrieve account'
//       }
//     });
//   }
// });

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

    // Create account
    const account = db.createAccount(accountData);
    
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
 * PATCH /api/v1/accounts/:accountId
 * Update an account (Admin only)
 */
router.patch('/:accountId', validateApiKey, requireAdmin, (req, res) => {
  try {
    const { accountId } = req.params;
    const updates = req.body;
    
    // Check if account exists
    const existingAccount = db.getAccountById(accountId);
    if (!existingAccount) {
      return res.status(404).json({
        error: {
          name: 'instanceNotFoundError',
          message: 'The specified account does not exist.'
        }
      });
    }

    // Update account
    const updatedAccount = db.updateAccount(accountId, updates);
    
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
 * DELETE /api/v1/accounts/:accountId
 * Delete an account (Admin only)
 */
router.delete('/:accountId', validateApiKey, requireAdmin, (req, res) => {
  try {
    const { accountId } = req.params;
    
    // Check if account exists
    const account = db.getAccountById(accountId);
    if (!account) {
      return res.status(404).json({
        error: {
          name: 'instanceNotFoundError',
          message: 'The specified account does not exist.'
        }
      });
    }

    // Delete account
    db.deleteAccount(accountId);
    
    res.status(204).send();
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

