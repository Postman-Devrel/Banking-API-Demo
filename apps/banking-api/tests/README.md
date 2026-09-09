# Test Suite Documentation

Comprehensive unit and integration tests for the Intergalactic Bank API.

## 📊 Test Coverage

The test suite covers:

- ✅ **Models** - Account and Transaction validation logic
- ✅ **Middleware** - Authentication and error handling
- ✅ **Routes** - All API endpoints (Admin, Accounts, Transactions)
- ✅ **Workflows** - End-to-end user scenarios

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run with Coverage Report
```bash
npm test -- --coverage
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## 📁 Test Structure

```
tests/
├── setup.js                         # Test environment configuration
├── unit/
│   ├── models/
│   │   ├── Account.test.js          # Account model tests
│   │   └── Transaction.test.js      # Transaction model tests
│   └── middleware/
│       ├── auth.test.js             # Authentication tests
│       └── errorHandler.test.js     # Error handling tests
└── integration/
    ├── admin.test.js                # Admin endpoint tests
    ├── accounts.test.js             # Account endpoint tests
    ├── transactions.test.js         # Transaction endpoint tests
    └── workflows.test.js            # End-to-end workflow tests
```

## 🧪 Test Categories

### Unit Tests

**Models**
- Account validation (owner, currency, balance)
- Account balance operations
- Transaction validation
- Transaction deposit detection

**Middleware**
- API key validation
- Admin permission checks
- Error response formatting
- 404 handler

### Integration Tests

**Admin Routes**
- API key generation
- Unique key generation

**Account Routes**
- List accounts with filters
- Get account by ID
- Create new accounts
- Update accounts (admin only)
- Delete accounts (admin only)
- Validation error handling

**Transaction Routes**
- List transactions with filters
- Get transaction by ID
- Create transfer transactions
- Create deposit transactions
- Balance updates
- Insufficient funds handling
- Currency mismatch validation

**End-to-End Workflows**
- Complete banking workflow (create account → deposit → transfer)
- Multi-account transfers
- Admin operations workflow
- Error handling scenarios
- Query and filter workflows

## 📈 Test Statistics

### Current Coverage

Total test suites: **8**
Total test cases: **100+**

Expected coverage:
- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## 🔧 Test Configuration

Tests are configured in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/server.js"
    ],
    "testMatch": [
      "**/tests/**/*.test.js"
    ]
  }
}
```

## 🎯 Testing Best Practices

### Followed in This Suite

1. **Isolation** - Each test is independent and can run in any order
2. **Mocking** - External dependencies are mocked appropriately
3. **Cleanup** - Database is reset before each test
4. **Clear Names** - Test descriptions clearly state what is being tested
5. **Comprehensive** - Both success and error cases are tested
6. **Fast** - Tests run quickly using in-memory database

## 🔍 Example Test Cases

### Model Test Example
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

### Integration Test Example
```javascript
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

  expect(response.body.account).toHaveProperty('accountId');
});
```

### Workflow Test Example
```javascript
test('should complete full account creation and transaction flow', async () => {
  // 1. Generate API key
  const authResponse = await request(app).get('/api/v1/auth');
  const apiKey = authResponse.body.apiKey;

  // 2. Create account
  const createResponse = await request(app)
    .post('/api/v1/accounts')
    .set('x-api-key', apiKey)
    .send(newAccount);

  // 3. Verify and continue workflow...
});
```

## 🐛 Debugging Tests

### Run Specific Test File
```bash
npx jest tests/unit/models/Account.test.js
```

### Run Specific Test Suite
```bash
npx jest -t "Account Model"
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## ✅ Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Upload coverage
  run: npm test -- --coverage --coverageReporters=lcov
```

## 📝 Adding New Tests

When adding new features:

1. **Write tests first** (TDD approach)
2. **Add unit tests** for new models/functions
3. **Add integration tests** for new endpoints
4. **Update workflow tests** if user flows change
5. **Verify coverage** remains above thresholds

## 🎓 Test Scenarios Covered

### Happy Path
- ✅ Create accounts successfully
- ✅ Transfer funds between accounts
- ✅ Deposit funds to accounts
- ✅ Query accounts and transactions
- ✅ Admin operations

### Error Cases
- ✅ Invalid API keys
- ✅ Missing required fields
- ✅ Invalid data types
- ✅ Insufficient funds
- ✅ Currency mismatches
- ✅ Non-existent resources
- ✅ Unauthorized operations

### Edge Cases
- ✅ Zero balances
- ✅ Zero amounts (rejected)
- ✅ Negative amounts (rejected)
- ✅ Empty result sets
- ✅ Multiple currency types
- ✅ Concurrent operations

## 🚨 Known Limitations

- Tests use mocked authentication (not testing actual API key storage)
- Rate limiting is increased for tests to avoid throttling
- Some edge cases with race conditions are not tested
- Server startup/shutdown not tested (server.js excluded from coverage)

## 🔄 Continuous Improvement

Future test enhancements:
- [ ] Load testing with many concurrent requests
- [ ] Performance benchmarks
- [ ] Database persistence tests (when real DB is added)
- [ ] Security penetration tests
- [ ] API contract tests

---

**Happy Testing! 🧪✨**

