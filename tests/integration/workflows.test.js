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

const db = require('../../src/database/db');

// Create fresh database for each test
beforeEach(() => {
  db.accounts.clear();
  db.transactions.clear();
  db.apiKeys.clear();
  db.apiKeys.add('1234'); // Re-add default API key
  db.initializeSampleData();
});

// Create test app with all routes
const app = express();
app.use(express.json());
app.use('/api/v1', adminRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/transactions', transactionRoutes);

describe('End-to-End Workflows', () => {
  describe('Error Handling Workflow', () => {
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

