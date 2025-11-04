/**
 * Transaction Routes Integration Tests
 */

const request = require('supertest');
const express = require('express');
const transactionRoutes = require('../../src/routes/transactions');

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  validateApiKey: (req, res, next) => {
    req.apiKey = req.headers['x-api-key'] || 'test-key';
    next();
  }
}));

const db = require('../../src/database/db');

// Create fresh database for each test
beforeEach(() => {
  // Clear and reinitialize
  db.accounts.clear();
  db.transactions.clear();
  db.apiKeys.clear();
  db.apiKeys.add('1234'); // Re-add default API key
  db.initializeSampleData();
});

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/transactions', transactionRoutes);

describe('Transaction Routes', () => {
  describe('GET /api/v1/transactions', () => {
    test('should return all transactions', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
    });

    test('should filter transactions by fromAccountId', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?fromAccountId=1')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      response.body.transactions.forEach(tx => {
        expect(tx.fromAccountId).toBe('1');
      });
    });

    test('should filter transactions by toAccountId', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?toAccountId=2')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      response.body.transactions.forEach(tx => {
        expect(tx.toAccountId).toBe('2');
      });
    });

    test('should filter transactions by createdAt', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?createdAt=2024-01-10')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(Array.isArray(response.body.transactions)).toBe(true);
      response.body.transactions.forEach(tx => {
        expect(tx.createdAt).toBe('2024-01-10');
      });
    });

    test('should return empty array for non-matching filters', async () => {
      const response = await request(app)
        .get('/api/v1/transactions?fromAccountId=999')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(response.body.transactions).toEqual([]);
    });
  });

  describe('GET /api/v1/transactions/:transactionId', () => {
    test('should return a specific transaction', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/1')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(response.body).toHaveProperty('transaction');
      expect(response.body.transaction.transactionId).toBe('1');
      expect(response.body.transaction).toHaveProperty('amount');
      expect(response.body.transaction).toHaveProperty('currency');
      expect(response.body.transaction).toHaveProperty('fromAccountId');
      expect(response.body.transaction).toHaveProperty('toAccountId');
    });

    test('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/v1/transactions/999')
        .set('x-api-key', 'test-key')
        .expect(404);

      expect(response.body.error.name).toBe('instanceNotFoundError');
    });
  });

  describe('POST /api/v1/transactions', () => {
    test('should create a transfer transaction', async () => {
      const transaction = {
        fromAccountId: '1',
        toAccountId: '2',
        amount: 500,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(201);

      expect(response.body).toHaveProperty('transaction');
      expect(response.body.transaction).toHaveProperty('transactionId');
    });

    test('should update balances after transfer', async () => {
      // Get initial balances
      const account1Before = db.getAccountById('1');
      const account2Before = db.getAccountById('2');
      const initialBalance1 = account1Before.balance;
      const initialBalance2 = account2Before.balance;

      const transaction = {
        fromAccountId: '1',
        toAccountId: '2',
        amount: 500,
        currency: 'COSMIC_COINS'
      };

      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(201);

      // Check updated balances
      const account1After = db.getAccountById('1');
      const account2After = db.getAccountById('2');

      expect(account1After.balance).toBe(initialBalance1 - 500);
      expect(account2After.balance).toBe(initialBalance2 + 500);
    });

    test('should create a deposit transaction', async () => {
      const transaction = {
        fromAccountId: '0',
        toAccountId: '2',
        amount: 1000,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(201);

      expect(response.body.transaction).toHaveProperty('transactionId');
    });

    test('should update balance after deposit', async () => {
      const accountBefore = db.getAccountById('2');
      const initialBalance = accountBefore.balance;

      const transaction = {
        fromAccountId: '0',
        toAccountId: '2',
        amount: 1000,
        currency: 'COSMIC_COINS'
      };

      await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(201);

      const accountAfter = db.getAccountById('2');
      expect(accountAfter.balance).toBe(initialBalance + 1000);
    });

    test('should reject transaction with insufficient funds', async () => {
      const transaction = {
        fromAccountId: '1',
        toAccountId: '2',
        amount: 999999999,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(403);

      expect(response.body.error.name).toBe('txInsufficientFunds');
    });

    test('should reject transaction with non-existent source account', async () => {
      const transaction = {
        fromAccountId: '999',
        toAccountId: '2',
        amount: 500,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(404);

      expect(response.body.error.name).toBe('instanceNotFoundError');
    });

    test('should reject transaction with non-existent destination account', async () => {
      const transaction = {
        fromAccountId: '1',
        toAccountId: '999',
        amount: 500,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(404);

      expect(response.body.error.name).toBe('instanceNotFoundError');
    });

    test('should reject transaction with currency mismatch', async () => {
      const transaction = {
        fromAccountId: '1',
        toAccountId: '2',
        amount: 500,
        currency: 'GALAXY_GOLD'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(400);

      expect(response.body.error.name).toBe('validationError');
    });

    test('should reject transaction with missing amount', async () => {
      const transaction = {
        fromAccountId: '1',
        toAccountId: '2',
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(400);

      expect(response.body.error.name).toBe('validationError');
    });

    test('should reject transaction with zero amount', async () => {
      const transaction = {
        fromAccountId: '1',
        toAccountId: '2',
        amount: 0,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(400);

      expect(response.body.error.name).toBe('validationError');
    });

    test('should reject transaction with negative amount', async () => {
      const transaction = {
        fromAccountId: '1',
        toAccountId: '2',
        amount: -500,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .set('x-api-key', 'test-key')
        .send(transaction)
        .expect(400);

      expect(response.body.error.name).toBe('validationError');
    });
  });
});

