# 🌌 Intergalactic Bank API

REST API for managing bank accounts and transactions with multi-currency support (COSMIC_COINS, GALAXY_GOLD, MOON_BUCKS).

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm run dev

# Verify it's running
curl http://localhost:3000/health
```

Server runs on **http://localhost:3000** by default.

## Features

- **Account Management** - Create, view, update, delete accounts (ownership-based)
- **Transaction Processing** - Transfer funds between accounts or make deposits
- **Multi-Currency** - COSMIC_COINS, GALAXY_GOLD, MOON_BUCKS
- **API Key Auth** - Secure endpoints with API keys
- **Rate Limiting** - 300 requests/minute per key
- **Ownership Control** - Users can only access their own accounts

## API Testing

**Use the Postman Collection** for complete API documentation and testing:
1. Import `OpenAPI/Bank API Reference Documentation.postman_collection.json` into Postman
2. Set `baseUrl` variable to `http://localhost:3000`
3. Set `apiKey` variable to `1234` (default admin key)
4. All endpoints are pre-configured with examples

## Key Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/api/v1/auth` | GET | No | Generate API key |
| `/api/v1/accounts` | GET | Yes | List your accounts |
| `/api/v1/accounts/:id` | GET | Yes | Get single account |
| `/api/v1/accounts` | POST | Yes | Create account |
| `/api/v1/accounts/:id` | PUT | Yes | Update account (owner/type) |
| `/api/v1/accounts/:id` | DELETE | Yes | Delete account (soft) |
| `/api/v1/transactions` | GET | Yes | List transactions |
| `/api/v1/transactions/:id` | GET | Yes | Get transaction |
| `/api/v1/transactions` | POST | Yes | Transfer/deposit |

## Authentication

Include your API key in all authenticated requests:

```
Header: x-api-key: your-key-here
```

Generate a new key: `GET /api/v1/auth`
Default admin key: `1234`

## Configuration

Create `.env` file (optional):

```bash
PORT=3000
ADMIN_API_KEY=1234
RATE_LIMIT_REQUESTS=300
RATE_LIMIT_WINDOW_MS=60000
```

## Project Structure

```
src/
├── server.js              # Entry point
├── database/db.js         # In-memory storage
├── models/
│   ├── Account.js         # Account model + validation
│   └── Transaction.js     # Transaction model
├── routes/
│   ├── admin.js          # API key generation
│   ├── accounts.js       # Account CRUD
│   └── transactions.js   # Transaction processing
└── middleware/
    ├── auth.js           # API key validation
    ├── errorHandler.js   # Error handling
    └── rateLimit.js      # Rate limiting
```

## Development

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint
```

## Sample Data

On startup, the server creates sample accounts:
- **Account 1**: Nova Newman (10,000 COSMIC_COINS)
- **Account 2**: Gary Galaxy (237 COSMIC_COINS)
- **Account 3**: Luna Starlight (5,000 GALAXY_GOLD)

All owned by admin key `1234`.

## Account Types

- **STANDARD** - Basic account (default)
- **PREMIUM** - Premium features
- **BUSINESS** - Business account

## Currencies

- **COSMIC_COINS** - Universal currency
- **GALAXY_GOLD** - Premium currency
- **MOON_BUCKS** - Alternative currency

## Important Notes

- **Ownership**: Users can only access accounts created with their API key
- **Soft Delete**: Deleted accounts are marked as deleted (transaction history preserved)
- **Immutable Fields**: Balance and currency can only change via transactions
- **Account Updates**: Only owner name and account type are editable

## Common Tasks

### Create an Account
Use Postman collection or POST to `/api/v1/accounts`:
```json
{
  "owner": "John Doe",
  "currency": "COSMIC_COINS",
  "balance": 1000,
  "accountType": "STANDARD"
}
```

### Transfer Funds
POST to `/api/v1/transactions`:
```json
{
  "fromAccountId": "123",
  "toAccountId": "456",
  "amount": 500,
  "currency": "COSMIC_COINS"
}
```

### Deposit Money
Use `"0"` as `fromAccountId` to deposit from external source.

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "name": "errorType",
    "message": "Description of error"
  }
}
```

Common status codes:
- **400** - Validation error
- **401** - Missing/invalid API key
- **403** - Insufficient permissions
- **404** - Resource not found
- **429** - Rate limit exceeded
- **500** - Server error

## Tech Stack

- **Node.js** + **Express.js**
- **In-memory storage** (Map-based, easily replaceable)
- **API Key authentication**
- **Jest** for testing

## Replacing In-Memory Storage

To use a real database:
1. Install database driver (`pg`, `mongodb`, etc.)
2. Update `src/database/db.js` with connection logic
3. Implement CRUD methods using your DB client

## License

ISC

---

**Need detailed API docs?** → Import the Postman collection
**Found a bug?** → Check the tests with `npm test`
**Need help?** → Review `CLAUDE.md` for architecture details
