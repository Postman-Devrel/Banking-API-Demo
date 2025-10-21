/**
 * Admin Routes Integration Tests
 */

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../src/routes/admin');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1', adminRoutes);

describe('Admin Routes', () => {
  describe('GET /api/v1/auth', () => {
    test('should generate a new API key', async () => {
      const response = await request(app)
        .get('/api/v1/auth')
        .expect(200);

      expect(response.body).toHaveProperty('apiKey');
      expect(typeof response.body.apiKey).toBe('string');
      expect(response.body.apiKey.length).toBeGreaterThan(0);
    });

    test('should return valid JSON', async () => {
      const response = await request(app)
        .get('/api/v1/auth')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeInstanceOf(Object);
    });

    test('should generate different API keys on subsequent requests', async () => {
      const response1 = await request(app).get('/api/v1/auth');
      const response2 = await request(app).get('/api/v1/auth');

      expect(response1.body.apiKey).not.toBe(response2.body.apiKey);
    });
  });
});

