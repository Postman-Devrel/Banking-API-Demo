/**
 * Test Setup
 * Global configuration for tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.ADMIN_API_KEY = 'test-admin-key';
process.env.RATE_LIMIT_REQUESTS = '1000'; // Higher limit for tests
process.env.RATE_LIMIT_WINDOW_MS = '60000';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };

