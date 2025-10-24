/**
 * Intergalactic Bank API Server
 * Main server file that initializes and starts the Express application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import middleware
const rateLimit = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const adminRoutes = require('./routes/admin');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============ Global Middleware ============

// CORS - Allow all origins (configure as needed for production)
app.use(cors());

// Body parser - Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Apply to all routes
app.use(rateLimit);

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============ API Routes ============

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Intergalactic Bank API! 🌌',
    version: '1.0.0',
    documentation: 'See README.md for API documentation',
    endpoints: {
      health: 'GET /health',
      auth: 'GET /api/v1/auth',
      accounts: 'GET /api/v1/accounts',
      transactions: 'GET /api/v1/transactions'
    }
  });
});

// Mount API routes
app.use('/api/v1', adminRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/transactions', transactionRoutes);

// ============ Error Handling ============

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============ Start Server ============

const server = app.listen(PORT, () => {
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
  console.log('  - PATCH /api/v1/accounts/:accountId');
  console.log('  - DELETE /api/v1/accounts/:accountId');
  console.log('  - GET  /api/v1/transactions');
  console.log('  - POST /api/v1/transactions');
  console.log('  - GET  /api/v1/transactions/:transactionId');
  console.log('');
  console.log('Press CTRL+C to stop the server');
  console.log('════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;

