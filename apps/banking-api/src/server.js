/**
 * Intergalactic Bank API Server
 * Main server file that initializes and starts the Express application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import middleware
const rateLimit = require('./middleware/rateLimit');
const requestContext = require('./middleware/requestContext');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const adminRoutes = require('./routes/admin');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const disputeRoutes = require('./routes/disputes');
const demoRoutes = require('./routes/demo');
const expandedBankingRoutes = require('./routes/expandedBanking');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============ Global Middleware ============

// CORS - Allow all origins (configure as needed for production)
app.use(cors());

// Body parser - Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate and echo demo-run/request correlation headers before other middleware.
app.use(requestContext);

// Rate limiting - Apply to all routes
app.use(rateLimit);

// ============ API Routes ============

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/openapi.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, '../openapi/openapi.yaml'));
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Intergalactic Bank API! 🌌',
    version: '1.0.0',
    documentation: '/openapi.yaml',
    endpoints: {
      health: 'GET /health',
      auth: 'GET /api/v1/auth',
      accounts: 'GET /api/v1/accounts',
      transactions: 'GET /api/v1/transactions',
      disputes: 'GET /api/v1/disputes'
    }
  });
});

// Mount API routes
app.use('/api/v1', adminRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/demo', demoRoutes);
app.use('/api/v1', expandedBankingRoutes);

// ============ Error Handling ============

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============ Start Server ============

let server;
if (require.main === module) server = app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🌌 Intergalactic Bank API Server 🌌    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  - GET  /api/v1/auth');
  console.log('  - GET  /api/v1/accounts');
  console.log('  - POST /api/v1/accounts');
  console.log('  - GET  /api/v1/accounts/:accountId');
  console.log('  - PUT/PATCH /api/v1/accounts/:accountId');
  console.log('  - DELETE /api/v1/accounts/:accountId');
  console.log('  - GET  /api/v1/transactions');
  console.log('  - POST /api/v1/transactions');
  console.log('  - GET  /api/v1/transactions/:transactionId');
  console.log('  - GET/POST /api/v1/disputes');
  console.log('  - POST /api/v1/admin/api-keys');
  console.log('  - POST /api/v1/demo/runs/:runId/reset');
  console.log('');
  console.log('Press CTRL+C to stop the server');
  console.log('════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  if (!server) return;
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
