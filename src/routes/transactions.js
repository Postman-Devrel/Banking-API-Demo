/**
 * Transaction Routes
 * Handles all transaction-related operations
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const Transaction = require('../models/Transaction');
const { validateApiKey } = require('../middleware/auth');

/**
 * GET /api/v1/transactions
 * List all transactions with optional filters
 */
router.get('/', validateApiKey, (req, res) => {
  try {
    const { fromAccountId, toAccountId, createdAt } = req.query;
    
    const filters = {};
    if (fromAccountId) filters.fromAccountId = fromAccountId;
    if (toAccountId) filters.toAccountId = toAccountId;
    if (createdAt) filters.createdAt = createdAt;

    const transactions = db.getTransactions(filters);
    
    res.status(200).json({
      transactions: transactions.map(tx => tx.toJSON())
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to retrieve transactions'
      }
    });
  }
});

/**
 * GET /api/v1/transactions/:transactionId
 * Get a specific transaction by ID
 */
router.get('/:transactionId', validateApiKey, (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = db.getTransactionById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        error: {
          name: 'instanceNotFoundError',
          message: 'The specified transaction does not exist.'
        }
      });
    }

    res.status(200).json({
      transaction: transaction.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to retrieve transaction'
      }
    });
  }
});

/**
 * POST /api/v1/transactions
 * Create a new transaction (transfer or deposit)
 */
router.post('/', validateApiKey, (req, res) => {
  try {
    const transactionData = req.body;
    
    // Validate transaction data
    const validation = Transaction.validate(transactionData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: validation.error
        }
      });
    }

    // Check if destination account exists
    const toAccount = db.getAccountById(transactionData.toAccountId);
    if (!toAccount) {
      return res.status(404).json({
        error: {
          name: 'instanceNotFoundError',
          message: 'Destination account does not exist.'
        }
      });
    }

    // Check if currencies match
    if (toAccount.currency !== transactionData.currency) {
      return res.status(400).json({
        error: {
          name: 'validationError',
          message: `Currency mismatch. Account uses ${toAccount.currency} but transaction uses ${transactionData.currency}`
        }
      });
    }

    // If not a deposit, validate source account and check funds
    if (transactionData.fromAccountId !== '0') {
      const fromAccount = db.getAccountById(transactionData.fromAccountId);
      
      if (!fromAccount) {
        return res.status(404).json({
          error: {
            name: 'instanceNotFoundError',
            message: 'Source account does not exist.'
          }
        });
      }

      // Check if source account has sufficient funds
      if (!fromAccount.hasSufficientFunds(transactionData.amount)) {
        return res.status(403).json({
          error: {
            name: 'txInsufficientFunds',
            message: 'Not enough funds in source account to complete transaction.'
          }
        });
      }

      // Check if currencies match
      if (fromAccount.currency !== transactionData.currency) {
        return res.status(400).json({
          error: {
            name: 'validationError',
            message: 'Currency mismatch between accounts'
          }
        });
      }

      // Deduct from source account
      fromAccount.updateBalance(-transactionData.amount);
    }

    // Add to destination account
    toAccount.updateBalance(transactionData.amount);

    // Create transaction record
    const transaction = db.createTransaction(transactionData);
    
    res.status(201).json({
      transaction: {
        transactionId: transaction.transactionId
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        name: 'serverError',
        message: 'Failed to create transaction'
      }
    });
  }
});

module.exports = router;

