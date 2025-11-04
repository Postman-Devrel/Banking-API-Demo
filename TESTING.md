# 🧪 Testing Guide

Quick guide to running and understanding tests for the Intergalactic Bank API.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode (for development)
npm run test:watch
```

## Test Output

When you run `npm test`, you'll see output like:

```
PASS  tests/unit/models/Account.test.js
PASS  tests/unit/models/Transaction.test.js
PASS  tests/unit/middleware/auth.test.js
PASS  tests/unit/middleware/errorHandler.test.js
PASS  tests/integration/admin.test.js
PASS  tests/integration/accounts.test.js
PASS  tests/integration/transactions.test.js
PASS  tests/integration/workflows.test.js

Test Suites: 8 passed, 8 total
Tests:       100+ passed, 100+ total
Snapshots:   0 total
Time:        X.XXXs
```

## Coverage Report

After running tests with `--coverage`, check the `coverage/` directory:

```bash
# View HTML coverage report
open coverage/lcov-report/index.html
```

Expected coverage:
- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## What's Being Tested

### ✅ Unit Tests (Fast, Isolated)

**Models** (`tests/unit/models/`)
- Account creation and validation
- Transaction creation and validation
- Business logic methods

**Middleware** (`tests/unit/middleware/`)
- Authentication checks
- Error handling
- Response formatting

### ✅ Integration Tests (API Endpoints)

**Routes** (`tests/integration/`)
- Admin: API key generation
- Accounts: CRUD operations
- Transactions: Create, list, retrieve
- Workflows: Complete user scenarios

## Running Specific Tests

```bash
# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run a specific test file
npx jest tests/unit/models/Account.test.js

# Run tests matching a pattern
npx jest -t "Account Model"
```

## Test Examples

### Unit Test
```javascript
test('should validate a correct account', () => {
  const data = {
    owner: 'John Doe',
    balance: 1000,
    currency: 'COSMIC_COINS'
  };
  
  const result = Account.validate(data);
  expect(result.isValid).toBe(true);
});
```

### Integration Test
```javascript
test('should create a new account', async () => {
  const response = await request(app)
    .post('/api/v1/accounts')
    .set('x-api-key', 'test-key')
    .send({
      owner: 'Test User',
      balance: 5000,
      currency: 'COSMIC_COINS'
    })
    .expect(201);

  expect(response.body.account).toHaveProperty('accountId');
});
```

## Debugging Failed Tests

If a test fails:

1. **Read the error message** - Jest provides detailed output
2. **Check the test file** - Look at the specific test that failed
3. **Run only that test** - `npx jest -t "test name"`
4. **Add console.logs** - Debug with logging
5. **Check recent changes** - What code was modified?

## Continuous Integration

Tests should pass before merging code. In CI/CD:

```bash
# Run in CI
npm ci              # Clean install
npm test            # Run tests
npm test -- --coverage  # Check coverage
```

## Test Data

Tests use sample data that's reset before each test:
- Account 1: Nova Newman (10,000 COSMIC_COINS)
- Account 2: Gary Galaxy (237 COSMIC_COINS)
- Account 3: Luna Starlight (5,000 GALAXY_GOLD)

## Need Help?

- See `tests/README.md` for detailed documentation
- Check individual test files for examples
- Run `npm test -- --help` for Jest options

--- 

**Keep tests green! 🟢**  

