# Architectural Patterns & Design Decisions

This document describes recurring patterns, conventions, and architectural decisions used throughout the codebase.

## Core Architecture Pattern

**Layered REST API with Middleware Pipeline**

Request flow:
```
Request → CORS → Body Parser → Rate Limiter → Request Logger →
Auth Middleware → Route Handler → Error Handler → Response
```

See: `src/server.js:23-38` for middleware setup

---

## Pattern 1: Model Design Pattern

Models serve as data validators and domain objects with three core responsibilities:

**Structure:**
```javascript
class ModelName {
  constructor(data) { /* initialize properties */ }
  static validate(data) { /* return { isValid, error } */ }
  toJSON() { /* return serializable object */ }
  // Domain-specific methods
}
```

**Implementation Examples:**
- `src/models/Account.js:1-88` - Account model with balance operations
- `src/models/Transaction.js:1-73` - Transaction model with status validation

**Key Conventions:**
1. Constructor accepts plain object, assigns properties
2. Static `validate()` returns `{ isValid: boolean, error?: string }`
3. `toJSON()` method for API serialization
4. Domain methods (e.g., `hasSufficientFunds()`, `updateBalance()`)
5. Immutable properties (use getters, no setters)

---

## Pattern 2: Route Handler Structure

All route handlers follow this consistent pattern:

```javascript
router.method('/path', validateApiKey, async (req, res) => {
  try {
    // 1. Extract and validate input
    const validation = Model.validate(data);
    if (!validation.isValid) {
      return res.status(400).json({
        error: { name: 'validationError', message: validation.error }
      });
    }

    // 2. Business logic
    const result = await database.operation();

    // 3. Success response
    res.status(200).json({ resource: result.toJSON() });

  } catch (error) {
    // 4. Error handling
    res.status(500).json({
      error: { name: 'serverError', message: 'Descriptive message' }
    });
  }
});
```

**Locations:**
- `src/routes/accounts.js:17-42` - POST /accounts example
- `src/routes/transactions.js:12-88` - POST /transactions/transfer example
- `src/routes/admin.js:10-23` - POST /admin/generate-key example

**Key Conventions:**
1. Always wrap in try-catch
2. Validate early, return early on errors
3. Use appropriate HTTP status codes
4. Consistent error response format
5. Return serialized data with `toJSON()`

---

## Pattern 3: Middleware Composition

Middleware functions are composable and applied per-route:

**Authentication Middleware:**
```javascript
// Applied to all protected routes
router.get('/', validateApiKey, handler);
router.post('/', validateApiKey, requireAdmin, handler);
```

See: `src/middleware/auth.js:12-40` for implementation

**Middleware Types:**
1. **Global** - Applied to all routes (CORS, body parser, error handler)
2. **Selective** - Applied per-route (auth, admin check)
3. **Factory** - Class methods returning middleware (rate limiter)

**Locations:**
- `src/server.js:23-28` - Global middleware setup
- `src/middleware/auth.js:12` - `validateApiKey` middleware
- `src/middleware/auth.js:28` - `requireAdmin` middleware
- `src/middleware/rateLimit.js:24` - Factory pattern `.middleware()`

---

## Pattern 4: Standardized Error Responses

All endpoints use consistent error response format:

```javascript
{
  error: {
    name: string,      // Error type identifier
    message: string,   // Human-readable message
    stack?: string     // Stack trace (development only)
  }
}
```

**Error Types & Status Codes:**
- `validationError` (400) - Invalid input data
- `authenticationError` (401) - Missing/invalid API key
- `authorizationError` (403) - Insufficient permissions
- `notFoundError` (404) - Resource not found
- `rateLimitError` (429) - Too many requests
- `serverError` (500) - Internal server error

**Implementation:**
- `src/middleware/errorHandler.js:7-21` - Global error handler
- Individual route handlers for specific errors

**Success Response Format:**
```javascript
{
  [resourceName]: data  // e.g., { account: {...} }
}
```

---

## Pattern 5: Singleton Database Pattern

Database is exported as a singleton instance to ensure shared state:

```javascript
// Database class with private constructor pattern
class Database {
  constructor() {
    this.accounts = new Map();
    this.transactions = new Map();
    this.apiKeys = new Map();
  }
  // CRUD methods
}

// Export single instance
export default new Database();
```

See: `src/database/db.js:3-150`

**Usage:**
```javascript
import database from '../database/db.js';
const account = database.getAccount(id);
```

**Key Points:**
1. Single source of truth for data
2. Map-based storage for O(1) lookups
3. Methods return null for not-found (not throwing)
4. Designed for easy database replacement (MongoDB, PostgreSQL)

---

## Pattern 6: Filter Object Pattern

Query parameters are transformed into filter objects for database queries:

```javascript
// Extract filters from query params
const filters = {};
if (req.query.owner) filters.owner = req.query.owner;
if (req.query.currency) filters.currency = req.query.currency;
if (req.query.createdAt) filters.createdAt = req.query.createdAt;

// Apply filters in database method
const results = database.getAccounts(filters);
```

**Locations:**
- `src/routes/accounts.js:53-58` - Account filtering
- `src/routes/transactions.js:96-104` - Transaction filtering
- `src/database/db.js:46-59` - Filter application

**Benefits:**
- Flexible, optional query parameters
- Type-safe filtering in database layer
- Easy to extend with new filter criteria

---

## Pattern 7: Rate Limiting with Class-Based Design

Rate limiter uses class with internal state and factory method:

```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.requests = new Map(); // apiKey -> { count, resetTime }
  }

  middleware() {
    return (req, res, next) => {
      // Rate limiting logic
    };
  }
}

// Create and export middleware instance
const limiter = new RateLimiter(300, 60000);
export default limiter.middleware();
```

See: `src/middleware/rateLimit.js:6-41`

**Features:**
- Per-API-key rate limiting
- Sliding window implementation
- Automatic cleanup of expired entries
- Configurable limits and windows

---

## Pattern 8: UUID Generation with Truncation

IDs are generated using truncated UUIDs for readability:

```javascript
import { v4 as uuidv4 } from 'uuid';

const accountId = uuidv4().split('-')[0];  // e.g., "a1b2c3d4"
```

**Locations:**
- `src/routes/accounts.js:29` - Account ID generation
- `src/routes/transactions.js:36` - Transaction ID generation
- `src/routes/admin.js:18` - API key generation

**Trade-offs:**
- Shorter IDs (8 chars vs 36)
- Still globally unique in practice
- More user-friendly for testing/debugging
- Collision risk extremely low for demo purposes

---

## Pattern 9: Model Serialization

Models control their own serialization via `toJSON()`:

```javascript
class Account {
  toJSON() {
    return {
      id: this.id,
      owner: this.owner,
      balance: this.balance,
      currency: this.currency,
      createdAt: this.createdAt
    };
  }
}
```

**Used in:**
- `src/models/Account.js:70-78`
- `src/models/Transaction.js:55-64`

**Benefits:**
- Consistent API responses
- Hide internal properties
- Control over serialization logic
- Works with JSON.stringify() and res.json()

---

## Pattern 10: Validation Before Persistence

All data is validated before database operations:

```javascript
// Always validate first
const validation = Account.validate(accountData);
if (!validation.isValid) {
  return res.status(400).json({ error: {...} });
}

// Then create and persist
const account = new Account(accountData);
const created = database.createAccount(account);
```

**Locations:**
- `src/routes/accounts.js:24-27` - Account creation
- `src/routes/transactions.js:28-31` - Transaction creation

**Validation Rules:**
- Required fields check
- Type validation
- Business rule validation (e.g., positive amounts)
- Returns descriptive error messages

---

## Architectural Decisions

### Why In-Memory Storage?

Decision: Use Map-based in-memory storage instead of a database.

**Rationale:**
- Educational/demo purpose
- Zero setup requirements
- Fast iteration during development
- Database-agnostic API design for easy replacement

**Migration Path:**
Database class methods are designed to match typical ORM patterns:
```javascript
database.getAccount(id) → db.accounts.findOne({ _id: id })
database.createAccount(account) → db.accounts.insertOne(account)
```

See: `src/database/db.js:1-150`

### Why API Key Authentication?

Decision: Simple API key in header vs JWT/OAuth.

**Rationale:**
- Stateless authentication
- Simple to implement and test
- Suitable for API-to-API communication
- Admin role flag stored with key
- Rate limiting per key

See: `src/middleware/auth.js:12-40`

### Why Route-Level Business Logic?

Decision: Business logic in route handlers vs service layer.

**Rationale:**
- Small codebase (< 500 lines total)
- Clear request-response flow
- Easy to understand for educational purposes
- Models handle domain logic
- Can refactor to services if complexity grows

**When to Refactor:**
If handlers exceed ~50 lines or logic is duplicated, extract to service layer.

### Why Global Error Handler?

Decision: Centralized error handling vs try-catch everywhere.

**Rationale:**
- Consistent error responses
- Automatic stack traces in development
- Catches unhandled promise rejections
- Single point for error logging/monitoring
- Reduces boilerplate in routes

See: `src/middleware/errorHandler.js:7-21`

---

## Testing Conventions

**Unit Tests:**
- Test models in isolation (validation, methods)
- Test middleware in isolation (mocked req/res)
- Use descriptive test names: "should reject negative amounts"
- Group related tests in describe blocks

Locations:
- `tests/unit/models/Account.test.js`
- `tests/unit/middleware/auth.test.js`

**Integration Tests:**
- Test full request-response cycle
- Use supertest for HTTP assertions
- Test happy path and error cases
- Set up/tear down database state

Location:
- `tests/integration/`

---

## Extending the Codebase

### Adding New Endpoints

1. Create route handler in `src/routes/`
2. Implement validation in models if needed
3. Add database methods in `src/database/db.js`
4. Apply middleware (auth, rate limiting)
5. Add tests in `tests/`
6. Update OpenAPI spec in `openapi/openapi.yaml`

### Adding New Middleware

1. Create in `src/middleware/`
2. Export middleware function(s)
3. Register in `src/server.js` (global or per-route)
4. Add unit tests
5. Document error responses if applicable

### Replacing In-Memory Storage

1. Create database client in `src/database/`
2. Update Database class methods to use client
3. Maintain same method signatures
4. Add connection management
5. Update tests with database fixtures
6. Add migration scripts if needed
