/**
 * End-to-End Workflow Integration Tests
 * Tests complete user scenarios across multiple endpoints
 */

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../src/routes/admin');
const accountRoutes = require('../../src/routes/accounts');
const transactionRoutes = require('../../src/routes/transactions');

// Mock auth middleware for testing
jest.mock('../../src/middleware/auth', () => ({
  validateApiKey: (req, res, next) => {
    req.apiKey = req.headers['x-api-key'] || 'test-key';
    next();
  },
  requireAdmin: (req, res, next) => {
    if (req.apiKey === 'admin-key') {
      next();
    } else {
      res.status(403).json({
        error: {
          name: 'forbiddenError',
          message: 'You do not have permissions to perform this action. Admin access required.'
        }
      });
    }
  }
}));

// Create fresh database for each test
let db;
beforeEach(() => {
  jest.resetModules();
  db = require('../../src/database/db');
  db.accounts.clear();
  db.transactions.clear();
  db.initializeSampleData();
});

// Create test app with all routes
const app = express();
app.use(express.json());
app.use('/api/v1', adminRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/transactions', transactionRoutes);

describe('End-to-End Workflows', () => {
  describe('Complete Banking Workflow', () => {
    test('should complete full account creation and transaction flow', async () => {
      // Step 1: Generate API key
      const authResponse = await request(app)
        .get('/api/v1/auth')
        .expect(200);

      const apiKey = authResponse.body.apiKey;
      expect(apiKey).toBeDefined();

      // Step 2: Create a new account
      const newAccount = {
        owner: 'Alice Wonderland',
        balance: 5000,
        currency: 'COSMIC_COINS'
      };

      const createAccountResponse = await request(app)
        .post('/api/v1/accounts')
        .set('x-api-key', apiKey)
        .send(newAccount)
        .expect(201);

      const accountId = createAccountResponse.body.account.accountId;
      expect(accountId).toBeDefined();

      // Step 3: Verify account was created
      const getAccountResponse = await request(app)
        .get(`/api/v1/accounts/${accountId}`)
        .set('x-api-key', apiKey)
        .expect(200);

      expect(getAccountResponse.body.account.owner).toBe('Alice Wonderland');
      expect(getAccountResponse.body.account.balance).toBe(5000);

      // Step 4: Make a deposit to the account
      const depositTransaction = {
        fromAccountId: '0',
        toAccountId: accountId,
        amount: 2000,
        currency: 'COSMIC_COINS'
      };

      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send(depositTransaction)
        .expect(201);

      // Step 5: Verify balance updated
      const afterDepositResponse = await request(app)
        .get(`/api/v1/accounts/${accountId}`)
        .set('x-api-key', apiKey)
        .expect(200);

      expect(afterDepositResponse.body.account.balance).toBe(7000);

      // Step 6: Transfer to another account
      const transferTransaction = {
        fromAccountId: accountId,
        toAccountId: '2',
        amount: 1000,
        currency: 'COSMIC_COINS'
      };

      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send(transferTransaction)
        .expect(201);

      // Step 7: Verify both balances updated
      const afterTransferResponse = await request(app)
        .get(`/api/v1/accounts/${accountId}`)
        .set('x-api-key', apiKey)
        .expect(200);

      expect(afterTransferResponse.body.account.balance).toBe(6000);

      const recipientResponse = await request(app)
        .get('/api/v1/accounts/2')
        .set('x-api-key', apiKey)
        .expect(200);

      expect(recipientResponse.body.account.balance).toBeGreaterThan(237);

      // Step 8: List all transactions for the account
      const transactionsResponse = await request(app)
        .get(`/api/v1/transactions?toAccountId=${accountId}`)
        .set('x-api-key', apiKey)
        .expect(200);

      expect(transactionsResponse.body.transactions.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Account Transfer Workflow', () => {
    test('should handle multiple transfers between accounts', async () => {
      const apiKey = 'test-key';

      // Get initial balances
      const account1Initial = await request(app)
        .get('/api/v1/accounts/1')
        .set('x-api-key', apiKey);

      const account2Initial = await request(app)
        .get('/api/v1/accounts/2')
        .set('x-api-key', apiKey);

      const initialBalance1 = account1Initial.body.account.balance;
      const initialBalance2 = account2Initial.body.account.balance;

      // Transfer 1: Account 1 -> Account 2
      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send({
          fromAccountId: '1',
          toAccountId: '2',
          amount: 500,
          currency: 'COSMIC_COINS'
        })
        .expect(201);

      // Transfer 2: Account 2 -> Account 1
      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send({
          fromAccountId: '2',
          toAccountId: '1',
          amount: 200,
          currency: 'COSMIC_COINS'
        })
        .expect(201);

      // Verify net changes
      const account1Final = await request(app)
        .get('/api/v1/accounts/1')
        .set('x-api-key', apiKey);

      const account2Final = await request(app)
        .get('/api/v1/accounts/2')
        .set('x-api-key', apiKey);

      expect(account1Final.body.account.balance).toBe(initialBalance1 - 500 + 200);
      expect(account2Final.body.account.balance).toBe(initialBalance2 + 500 - 200);
    });
  });

  describe('Admin Operations Workflow', () => {
    test('should complete admin workflow: create, update, delete', async () => {
      const adminKey = 'admin-key';

      // Create account
      const newAccount = {
        owner: 'Bob Builder',
        balance: 3000,
        currency: 'GALAXY_GOLD'
      };

      const createResponse = await request(app)
        .post('/api/v1/accounts')
        .set('x-api-key', adminKey)
        .send(newAccount)
        .expect(201);

      const accountId = createResponse.body.account.accountId;

      // Update account (admin only)
      await request(app)
        .patch(`/api/v1/accounts/${accountId}`)
        .set('x-api-key', adminKey)
        .send({ owner: 'Bob The Builder' })
        .expect(200);

      // Verify update
      const updatedAccount = await request(app)
        .get(`/api/v1/accounts/${accountId}`)
        .set('x-api-key', adminKey)
        .expect(200);

      expect(updatedAccount.body.account.owner).toBe('Bob The Builder');

      // Delete account (admin only)
      await request(app)
        .delete(`/api/v1/accounts/${accountId}`)
        .set('x-api-key', adminKey)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/v1/accounts/${accountId}`)
        .set('x-api-key', adminKey)
        .expect(404);
    });

    test('should prevent non-admin from performing admin operations', async () => {
      const regularKey = 'regular-key';

      // Try to update account without admin key
      await request(app)
        .patch('/api/v1/accounts/1')
        .set('x-api-key', regularKey)
        .send({ owner: 'Hacker' })
        .expect(403);

      // Try to delete account without admin key
      await request(app)
        .delete('/api/v1/accounts/1')
        .set('x-api-key', regularKey)
        .expect(403);

      // Verify account still exists
      await request(app)
        .get('/api/v1/accounts/1')
        .set('x-api-key', regularKey)
        .expect(200);
    });
  });

  describe('Error Handling Workflow', () => {
    test('should handle insufficient funds scenario gracefully', async () => {
      const apiKey = 'test-key';

      // Try to transfer more than available balance
      const overdraftAttempt = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send({
          fromAccountId: '2',
          toAccountId: '1',
          amount: 999999,
          currency: 'COSMIC_COINS'
        })
        .expect(403);

      expect(overdraftAttempt.body.error.name).toBe('txInsufficientFunds');

      // Verify no balance change occurred
      const accountCheck = await request(app)
        .get('/api/v1/accounts/2')
        .set('x-api-key', apiKey);

      expect(accountCheck.body.account.balance).toBe(237);
    });

    test('should handle currency mismatch across workflow', async () => {
      const apiKey = 'test-key';

      // Account 3 uses GALAXY_GOLD, try to transfer COSMIC_COINS
      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send({
          fromAccountId: '1',
          toAccountId: '3',
          amount: 100,
          currency: 'COSMIC_COINS'
        })
        .expect(400);
    });
  });

  describe('Query and Filter Workflow', () => {
    test('should filter and query data across multiple endpoints', async () => {
      const apiKey = 'test-key';

      // Create multiple transactions
      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send({
          fromAccountId: '1',
          toAccountId: '2',
          amount: 100,
          currency: 'COSMIC_COINS'
        });

      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', apiKey)
        .send({
          fromAccountId: '1',
          toAccountId: '3',
          amount: 200,
          currency: 'COSMIC_COINS'
        });

      // Filter transactions by source account
      const fromAccount1 = await request(app)
        .get('/api/v1/transactions?fromAccountId=1')
        .set('x-api-key', apiKey)
        .expect(200);

      expect(fromAccount1.body.transactions.length).toBeGreaterThanOrEqual(2);

      // Filter accounts by date
      const accountsByDate = await request(app)
        .get('/api/v1/accounts?createdAt=2023-04-10')
        .set('x-api-key', apiKey)
        .expect(200);

      expect(accountsByDate.body.accounts.length).toBeGreaterThan(0);

      // Filter accounts by owner
      const accountsByOwner = await request(app)
        .get('/api/v1/accounts?owner=Nova')
        .set('x-api-key', apiKey)
        .expect(200);

      expect(accountsByOwner.body.accounts.length).toBeGreaterThan(0);
    });
  });
});

