/**
 * Account Routes Integration Tests
 */

const request = require('supertest');
const express = require('express');
const accountRoutes = require('../../src/routes/accounts');

// Mock auth middleware
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
app.use('/api/v1/accounts', accountRoutes);

describe('Account Routes', () => {
  describe('GET /api/v1/accounts', () => {
    test('should return all accounts', async () => {
      const response = await request(app)
        .get('/api/v1/accounts')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(response.body).toHaveProperty('accounts');
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts.length).toBeGreaterThan(0);
    });

    test('should filter accounts by owner', async () => {
      const response = await request(app)
        .get('/api/v1/accounts?owner=Nova')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(response.body.accounts.length).toBeGreaterThan(0);
      expect(response.body.accounts[0].owner).toContain('Nova');
    });

    test('should filter accounts by createdAt', async () => {
      const response = await request(app)
        .get('/api/v1/accounts?createdAt=2023-04-10')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(Array.isArray(response.body.accounts)).toBe(true);
      response.body.accounts.forEach(account => {
        expect(account.createdAt).toBe('2023-04-10');
      });
    });

    test('should return empty array for non-matching filters', async () => {
      const response = await request(app)
        .get('/api/v1/accounts?owner=NonExistent')
        .set('x-api-key', 'test-key')
        .expect(200);

      expect(response.body.accounts).toEqual([]);
    });
  });

  describe('GET /api/v1/accounts/:accountId', () => {
  });

  describe('POST /api/v1/accounts', () => {
    test('should create a new account', async () => {
      const newAccount = {
        owner: 'Test User',
        balance: 5000,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/accounts')
        .set('x-api-key', 'test-key')
        .send(newAccount)
        .expect(201);

      expect(response.body).toHaveProperty('account');
      expect(response.body.account).toHaveProperty('accountId');
    });

    test('should reject account with missing owner', async () => {
      const invalidAccount = {
        balance: 5000,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/accounts')
        .set('x-api-key', 'test-key')
        .send(invalidAccount)
        .expect(400);

      expect(response.body.error.name).toBe('validationError');
    });

    test('should reject account with invalid currency', async () => {
      const invalidAccount = {
        owner: 'Test User',
        balance: 5000,
        currency: 'INVALID_CURRENCY'
      };

      const response = await request(app)
        .post('/api/v1/accounts')
        .set('x-api-key', 'test-key')
        .send(invalidAccount)
        .expect(400);

      expect(response.body.error.name).toBe('validationError');
    });

    test('should reject account with negative balance', async () => {
      const invalidAccount = {
        owner: 'Test User',
        balance: -100,
        currency: 'COSMIC_COINS'
      };

      const response = await request(app)
        .post('/api/v1/accounts')
        .set('x-api-key', 'test-key')
        .send(invalidAccount)
        .expect(400);

      expect(response.body.error.name).toBe('validationError');
    });
  });

  describe('PATCH /api/v1/accounts/:accountId', () => {
    test('should update account with admin key', async () => {
      const updates = {
        owner: 'Updated Name'
      };

      const response = await request(app)
        .patch('/api/v1/accounts/1')
        .set('x-api-key', 'admin-key')
        .send(updates)
        .expect(200);

      expect(response.body.account.owner).toBe('Updated Name');
      expect(response.body.account.accountId).toBe('1');
    });

    test('should reject update without admin key', async () => {
      const updates = {
        owner: 'Updated Name'
      };

      await request(app)
        .patch('/api/v1/accounts/1')
        .set('x-api-key', 'regular-key')
        .send(updates)
        .expect(403);
    });

    test('should return 404 for non-existent account', async () => {
      const updates = {
        owner: 'Updated Name'
      };

      await request(app)
        .patch('/api/v1/accounts/999')
        .set('x-api-key', 'admin-key')
        .send(updates)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/accounts/:accountId', () => {
    test('should delete account with admin key', async () => {
      await request(app)
        .delete('/api/v1/accounts/1')
        .set('x-api-key', 'admin-key')
        .expect(204);

      // Verify account is deleted
      await request(app)
        .get('/api/v1/accounts/1')
        .set('x-api-key', 'test-key')
        .expect(404);
    });

    test('should reject delete without admin key', async () => {
      await request(app)
        .delete('/api/v1/accounts/1')
        .set('x-api-key', 'regular-key')
        .expect(403);
    });

    test('should return 404 for non-existent account', async () => {
      await request(app)
        .delete('/api/v1/accounts/999')
        .set('x-api-key', 'admin-key')
        .expect(404);
    });
  });
});

