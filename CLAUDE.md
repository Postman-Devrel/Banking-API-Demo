# Intergalactic Bank API

## Overview

REST API for managing bank accounts and financial transactions with multi-currency support (COSMIC_COINS, GALAXY_GOLD, MOON_BUCKS). Demonstrates professional Node.js/Express patterns with authentication, rate limiting, and comprehensive error handling.

Entry point: `src/server.js:1`

## Tech Stack

**Runtime & Framework:**
- Node.js with Express 4.18.2
- ES2021 JavaScript with ES modules

**Core Dependencies:**
- `express` - REST API framework
- `cors` - CORS middleware
- `dotenv` - Environment configuration
- `uuid` - ID generation

**Development:**
- `jest` + `supertest` - Testing with coverage
- `eslint` - Code linting
- `nodemon` - Auto-reload
- `husky` + `lint-staged` - Git hooks

**Data Storage:**
- In-memory Map-based storage (database-replaceable design)

## Project Structure

```
src/
├── server.js           # Entry point, middleware setup
├── database/
│   └── db.js          # Singleton database instance
├── models/
│   ├── Account.js     # Account domain model with validation
│   └── Transaction.js # Transaction domain model
├── routes/
│   ├── accounts.js    # Account CRUD endpoints
│   ├── transactions.js # Transaction processing
│   └── admin.js       # API key generation
└── middleware/
    ├── auth.js        # API key validation, admin check
    ├── errorHandler.js # Global error handler
    └── rateLimit.js   # Rate limiter (300 req/min)

tests/
├── unit/              # Model & middleware tests
└── integration/       # API endpoint tests

openapi/
└── openapi.yaml      # API specification
```

## Essential Commands

**Development:**
```bash
npm run dev          # Start with auto-reload
npm start            # Production start
```

**Testing:**
```bash
npm test             # Run all tests with coverage
npm run test:unit    # Unit tests only
npm run test:integration # Integration tests only
npm run test:watch   # Watch mode
```

**Code Quality:**
```bash
npm run lint         # Check code style
npm run lint:fix     # Auto-fix issues
```

**Environment Setup:**
```bash
cp .env.example .env # Create environment file
# Configure PORT (default 3000)
```

## Key Features

- **Authentication:** API key-based via `x-api-key` header (src/middleware/auth.js:12)
- **Rate Limiting:** 300 requests/minute per key (src/middleware/rateLimit.js:6)
- **Endpoints:**
  - `POST /admin/generate-key` - Generate API keys (admin only)
  - `GET|POST|PUT|DELETE /accounts` - Account management
  - `POST /transactions/transfer` - Transfer funds
  - `POST /transactions/deposit` - Deposit funds
  - `GET /transactions` - Query transactions

## Architecture

This codebase follows a layered REST architecture with middleware composition. Key patterns include:

- Route handlers contain business logic with validation
- Models provide data validation and domain methods
- Middleware handles cross-cutting concerns (auth, errors, rate limiting)
- Database layer abstracts data persistence
- Standard error responses across all endpoints

## Response Formats

**Success:** `{ resource: data }`
**Error:** `{ error: { name, message } }`

HTTP Status Codes:
- `200` - Success
- `400` - Validation error
- `401` - Authentication required
- `403` - Insufficient permissions
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Server error

## Additional Documentation

For deeper technical details, see:

- `.claude/docs/architectural_patterns.md` - Design patterns, conventions, and architectural decisions used throughout the codebase

## Development Notes

- Pre-commit hooks enforce linting and tests
- All routes require authentication except admin key generation
- Database uses singleton pattern with in-memory storage
- Models implement `validate()`, `toJSON()`, and domain-specific methods
- Error handling is centralized in middleware/errorHandler.js:7
