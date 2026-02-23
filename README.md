# 🌌 Intergalactic Bank API

REST API for managing bank accounts and transactions with multi-currency support (COSMIC_COINS, GALAXY_GOLD, MOON_BUCKS).

## Live API (Railway)

The API is deployed and ready to use:

| Resource | URL |
|----------|-----|
| **Base URL** | `https://api-production-6c87.up.railway.app` |
| **Health Check** | `https://api-production-6c87.up.railway.app/health` |
| **Generate API Key** | `https://api-production-6c87.up.railway.app/api/v1/auth` |
| **Accounts** | `https://api-production-6c87.up.railway.app/api/v1/accounts` |
| **Transactions** | `https://api-production-6c87.up.railway.app/api/v1/transactions` |

### Getting Started (Workshop)

1. **Get your API key:**
   ```
   GET https://api-production-6c87.up.railway.app/api/v1/auth
   ```

2. **Use your key in all requests:**
   ```
   Header: x-api-key: <your-key>
   ```

3. **Create an account:**
   ```
   POST https://api-production-6c87.up.railway.app/api/v1/accounts
   Header: x-api-key: <your-key>
   Body: { "owner": "Your Name", "currency": "COSMIC_COINS", "balance": 5000 }
   ```

4. **Import into Postman:** Set `baseUrl` variable to `https://api-production-6c87.up.railway.app`

### Pre-loaded API Keys

These keys come with pre-seeded accounts for demo purposes:

| API Key | Accounts | Description |
|---------|----------|-------------|
| `1234` | 5 accounts | Admin/demo key |
| `workshop-alpha` | 4 accounts | Workshop team A |
| `workshop-beta` | 3 accounts | Workshop team B |
| `workshop-gamma` | 3 accounts | Workshop team C |

Or generate a fresh key with `GET /api/v1/auth` and start from scratch.

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start the server (requires DATABASE_URL)
DATABASE_URL=postgresql://localhost:5432/intergalactic_bank npm run dev

# Verify it's running
curl http://localhost:3000/health
```

## Features

- **Account Management** - Create, view, update, delete accounts (ownership-based)
- **Transaction Processing** - Transfer funds between accounts or make deposits
- **Multi-Currency** - COSMIC_COINS, GALAXY_GOLD, MOON_BUCKS
- **API Key Auth** - Secure endpoints with API keys
- **Rate Limiting** - 300 requests/minute per key
- **Ownership Control** - Users can only access their own accounts
- **Persistent Storage** - PostgreSQL backend (data survives restarts)
- **Atomic Transactions** - Balance updates use SQL transactions for consistency

## API Testing

**Use the Postman Collection** for complete API documentation and testing:
1. Import `OpenAPI/Bank API Reference Documentation.postman_collection.json` into Postman
2. Set `baseUrl` variable to `https://api-production-6c87.up.railway.app` (or `http://localhost:3000` for local)
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

Create `.env` file (see `.env.example`):

```bash
PORT=3000
DATABASE_URL=postgresql://localhost:5432/intergalactic_bank
ADMIN_API_KEY=1234
RATE_LIMIT_REQUESTS=300
RATE_LIMIT_WINDOW_MS=60000
```

## Project Structure

```
src/
├── server.js              # Entry point
├── database/
│   ├── db.js              # PostgreSQL database layer
│   ├── pool.js            # Connection pool setup
│   ├── schema.sql         # Table definitions
│   ├── seed.js            # Seed data (15 accounts, 7 transactions)
│   ├── seed-runner.js     # Standalone seed script
│   └── reset.js           # Workshop reset (drop + recreate + seed)
├── models/
│   ├── Account.js         # Account model + validation
│   └── Transaction.js     # Transaction model
├── routes/
│   ├── admin.js           # API key generation
│   ├── accounts.js        # Account CRUD
│   └── transactions.js    # Transaction processing
└── middleware/
    ├── auth.js            # API key validation
    ├── errorHandler.js    # Error handling
    └── rateLimit.js       # Rate limiting
```

## Development

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test

# Seed the database
npm run seed

# Reset database (drop + recreate + seed)
npm run reset-db

# Lint code
npm run lint
```

## Sample Data

The database is pre-seeded with 15 accounts across 4 API keys:

**Admin key `1234`:**
| Account | Owner | Balance | Currency | Type |
|---------|-------|---------|----------|------|
| acc-001 | Nova Newman | 10,000 | COSMIC_COINS | STANDARD |
| acc-002 | Gary Galaxy | 237 | COSMIC_COINS | PREMIUM |
| acc-003 | Luna Starlight | 5,000 | GALAXY_GOLD | BUSINESS |
| acc-004 | Cosmo Nebula | 25,000 | MOON_BUCKS | PREMIUM |
| acc-005 | Stella Vortex | 1,500 | COSMIC_COINS | STANDARD |

**Workshop keys** (`workshop-alpha`, `workshop-beta`, `workshop-gamma`) each have 3-4 accounts with varied currencies and balances.

7 seed transactions are also included (transfers and deposits).

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
- **Persistent**: Data survives server restarts (PostgreSQL)

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
  "fromAccountId": "acc-001",
  "toAccountId": "acc-002",
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
- **PostgreSQL** via `pg` (node-postgres)
- **Railway** for hosting
- **API Key authentication**
- **Jest** for testing

## License

ISC

---

**Need detailed API docs?** Import the Postman collection
**Found a bug?** Check the tests with `npm test`
**Need help?** Review `CLAUDE.md` for architecture details
