# 🌌 Intergalactic Bank API

A REST API server implementation for the Intergalactic Bank, managing accounts and transactions with cosmic coins and galactic currencies.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Testing with Postman](#testing-with-postman)
- [Development](#development)

## ✨ Features

- **Account Management**: Create, read, update, and delete bank accounts
- **Transaction Processing**: Transfer funds between accounts or deposit to accounts
- **Multiple Currencies**: Support for COSMIC_COINS, GALAXY_GOLD, and MOON_BUCKS
- **API Key Authentication**: Secure endpoints with API key validation
- **Rate Limiting**: 300 requests per minute per API key
- **Admin Permissions**: Restricted operations for admin users only
- **In-Memory Database**: Fast data access (can be replaced with real database)
- **Error Handling**: Comprehensive error responses
- **CORS Enabled**: Cross-origin resource sharing support

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: API Key based
- **Data Storage**: In-memory (Map-based, replaceable with database)
- **Dependencies**:
  - `express` - Web framework
  - `cors` - CORS middleware
  - `dotenv` - Environment variable management
  - `uuid` - Unique ID generation

## 📁 Project Structure

```
Banking-API-Demo/
├── src/
│   ├── database/
│   │   └── db.js                  # In-memory database
│   ├── middleware/
│   │   ├── auth.js                # Authentication middleware
│   │   ├── errorHandler.js        # Error handling
│   │   └── rateLimit.js           # Rate limiting
│   ├── models/
│   │   ├── Account.js             # Account model
│   │   └── Transaction.js         # Transaction model
│   ├── routes/
│   │   ├── admin.js               # Admin endpoints
│   │   ├── accounts.js            # Account endpoints
│   │   └── transactions.js        # Transaction endpoints
│   └── server.js                  # Main server file
├── OpenAPI/
│   └── Bank API Reference...json  # Postman collection
├── package.json
├── .env                           # Environment variables
├── .gitignore
└── README.md
```

## 📦 Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd Banking-API-Demo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   # Copy and configure .env file
   PORT=3000
   NODE_ENV=development
   ADMIN_API_KEY=1234
   RATE_LIMIT_REQUESTS=300
   RATE_LIMIT_WINDOW_MS=60000
   ```

## ⚙️ Configuration

Environment variables can be configured in the `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment (development/production) |
| `ADMIN_API_KEY` | 1234 | API key with admin privileges |
| `RATE_LIMIT_REQUESTS` | 300 | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window in milliseconds (1 min) |

## 🚀 Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

You should see:
```
╔════════════════════════════════════════════╗
║   🌌 Intergalactic Bank API Server 🌌    ║
╚════════════════════════════════════════════╝

🚀 Server running on port 3000
📡 Environment: development
🔗 URL: http://localhost:3000
💚 Health Check: http://localhost:3000/health
```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Headers
All authenticated endpoints require:
```
x-api-key: your-api-key
```

---

## 🔐 Authentication

### Generate API Key

Generate a new API key for accessing the API.

**Endpoint**: `GET /api/v1/auth`

**Authentication**: None required

**Response**:
```json
{
  "apiKey": "123456789"
}
```

---

## 👤 Account Endpoints

### List All Accounts

Get all accounts, with optional filtering.

**Endpoint**: `GET /api/v1/accounts`

**Authentication**: Required

**Query Parameters**:
- `owner` (optional): Filter by account owner name
- `createdAt` (optional): Filter by creation date (YYYY-MM-DD)

**Example**:
```
GET /api/v1/accounts?owner=Nova%20Newman
```

**Response**:
```json
{
  "accounts": [
    {
      "accountId": "1",
      "owner": "Nova Newman",
      "createdAt": "2023-04-10",
      "balance": 10000,
      "currency": "COSMIC_COINS"
    }
  ]
}
```

---

### Get Account by ID

Retrieve details of a specific account.

**Endpoint**: `GET /api/v1/accounts/:accountId`

**Authentication**: Required

**Response**:
```json
{
  "account": {
    "accountId": "1",
    "owner": "Nova Newman",
    "createdAt": "2024-01-10",
    "balance": 10000,
    "currency": "COSMIC_COINS"
  }
}
```

**Error Responses**:
- `404 Not Found`: Account doesn't exist

---

### Create New Account

Create a new bank account.

**Endpoint**: `POST /api/v1/accounts`

**Authentication**: Required

**Request Body**:
```json
{
  "owner": "John Doe",
  "balance": 500,
  "currency": "COSMIC_COINS"
}
```

**Required Fields**:
- `owner` (string): Account owner's full name
- `currency` (string): One of: `COSMIC_COINS`, `GALAXY_GOLD`, `MOON_BUCKS`

**Optional Fields**:
- `balance` (number): Starting balance (defaults to 0)

**Response**:
```json
{
  "account": {
    "accountId": "123"
  }
}
```

---

### Update Account

Update account information (Admin only).

**Endpoint**: `PATCH /api/v1/accounts/:accountId`

**Authentication**: Required (Admin only)

**Request Body**:
```json
{
  "owner": "Jane Doe"
}
```

**Response**:
```json
{
  "account": {
    "accountId": "2",
    "owner": "Jane Doe",
    "balance": 300,
    "currency": "COSMIC_COINS",
    "createdAt": "2023-04-10"
  }
}
```

**Error Responses**:
- `403 Forbidden`: Non-admin user
- `404 Not Found`: Account doesn't exist

---

### Delete Account

Delete an account (Admin only).

**Endpoint**: `DELETE /api/v1/accounts/:accountId`

**Authentication**: Required (Admin only)

**Response**: `204 No Content`

**Error Responses**:
- `403 Forbidden`: Non-admin user
- `404 Not Found`: Account doesn't exist

---

## 💰 Transaction Endpoints

### List All Transactions

Get all transactions with optional filtering.

**Endpoint**: `GET /api/v1/transactions`

**Authentication**: Required

**Query Parameters**:
- `fromAccountId` (optional): Filter by source account
- `toAccountId` (optional): Filter by destination account
- `createdAt` (optional): Filter by date (YYYY-MM-DD)

**Response**:
```json
{
  "transactions": [
    {
      "transactionId": "1",
      "createdAt": "2024-01-10",
      "amount": 10000,
      "currency": "COSMIC_COINS",
      "fromAccountId": "11111111",
      "toAccountId": "22222222"
    }
  ]
}
```

---

### Get Transaction by ID

Retrieve details of a specific transaction.

**Endpoint**: `GET /api/v1/transactions/:transactionId`

**Authentication**: Required

**Response**:
```json
{
  "transaction": {
    "transactionId": "1",
    "createdAt": "2024-01-10",
    "amount": 10000,
    "currency": "COSMIC_COINS",
    "fromAccountId": "11111111",
    "toAccountId": "22222222"
  }
}
```

---

### Create Transaction

Create a new transaction (transfer or deposit).

**Endpoint**: `POST /api/v1/transactions`

**Authentication**: Required

**Request Body (Transfer)**:
```json
{
  "fromAccountId": "12345678",
  "toAccountId": "87654321",
  "amount": 10000,
  "currency": "COSMIC_COINS"
}
```

**Request Body (Deposit)**:
```json
{
  "fromAccountId": "0",
  "toAccountId": "87654321",
  "amount": 10000,
  "currency": "COSMIC_COINS"
}
```

**Note**: Use `"0"` as `fromAccountId` to deposit funds (add money from external source).

**Response**:
```json
{
  "transaction": {
    "transactionId": "123"
  }
}
```

**Error Responses**:
- `403 Forbidden`: Insufficient funds
- `404 Not Found`: Account doesn't exist
- `400 Bad Request`: Validation error (e.g., currency mismatch)

---

## 🔒 Authentication

The API uses API Key authentication. Include your API key in the request header:

```
x-api-key: your-api-key-here
```

### Admin Operations

Certain operations require admin privileges:
- Update Account (PATCH `/api/v1/accounts/:accountId`)
- Delete Account (DELETE `/api/v1/accounts/:accountId`)

By default, the API key `1234` has admin privileges (configurable via `ADMIN_API_KEY` environment variable).

### Error Responses

**401 Unauthorized**: Missing or invalid API key
```json
{
  "error": {
    "name": "authenticationError",
    "message": "API key is required. Please provide an API key in the x-api-key header."
  }
}
```

**403 Forbidden**: Insufficient permissions
```json
{
  "error": {
    "name": "forbiddenError",
    "message": "You do not have permissions to perform this action."
  }
}
```

---

## ⏱️ Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit**: 300 requests per minute per API key
- **Headers**: Each response includes rate limit information

**Response Headers**:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1678901234
```

**Error Response** (429 Too Many Requests):
```json
{
  "error": {
    "name": "rateLimitExceeded",
    "message": "Too many requests. Maximum 300 requests per minute allowed."
  }
}
```

---

## 🧪 Testing with Postman

The project includes a Postman collection in the `OpenAPI` directory:

1. **Import Collection**:
   - Open Postman
   - Click "Import"
   - Select `OpenAPI/Bank API Reference Documentation.postman_collection.json`

2. **Configure Variables**:
   - Go to collection variables
   - Set `baseUrl` to `http://localhost:3000`
   - Set `apiKey` to your generated API key (or use default `1234`)

3. **Run Requests**:
   - All requests are pre-configured
   - Authentication is set at collection level
   - Examples include various scenarios (success, errors, etc.)

---

## 🛠️ Development

### Sample Data

The server initializes with sample data:

**Accounts**:
- Account 1: Nova Newman (10,000 COSMIC_COINS)
- Account 2: Gary Galaxy (237 COSMIC_COINS)
- Account 3: Luna Starlight (5,000 GALAXY_GOLD)

**Transactions**:
- Transaction 1: Transfer from Account 1 to Account 2

### Adding a Database

To replace the in-memory database with a real database:

1. Install database driver (e.g., `pg` for PostgreSQL, `mongodb` for MongoDB)
2. Update `src/database/db.js` with database connection logic
3. Implement CRUD operations using your database client
4. Update models if needed for ORM integration

### Error Handling

All errors follow a consistent format:
```json
{
  "error": {
    "name": "errorType",
    "message": "Human-readable error message"
  }
}
```

Common error types:
- `authenticationError`: Authentication failures
- `forbiddenError`: Permission issues
- `validationError`: Invalid request data
- `instanceNotFoundError`: Resource not found
- `rateLimitExceeded`: Rate limit exceeded
- `serverError`: Internal server errors

---

## 📝 API Endpoints Summary

| Method | Endpoint | Auth | Admin | Description |
|--------|----------|------|-------|-------------|
| GET | `/health` | ❌ | ❌ | Health check |
| GET | `/api/v1/auth` | ❌ | ❌ | Generate API key |
| GET | `/api/v1/accounts` | ✅ | ❌ | List accounts |
| GET | `/api/v1/accounts/:id` | ✅ | ❌ | Get account |
| POST | `/api/v1/accounts` | ✅ | ❌ | Create account |
| PATCH | `/api/v1/accounts/:id` | ✅ | ✅ | Update account |
| DELETE | `/api/v1/accounts/:id` | ✅ | ✅ | Delete account |
| GET | `/api/v1/transactions` | ✅ | ❌ | List transactions |
| GET | `/api/v1/transactions/:id` | ✅ | ❌ | Get transaction |
| POST | `/api/v1/transactions` | ✅ | ❌ | Create transaction |

---

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Verify all dependencies are installed: `npm install`
- Check environment variables are set correctly

### Authentication errors
- Verify you're including the `x-api-key` header
- Check that the API key is valid (generate a new one if needed)
- For admin operations, use the admin API key (default: `1234`)

### Rate limit errors
- Wait for the rate limit window to reset (1 minute)
- Consider adjusting `RATE_LIMIT_REQUESTS` in `.env` for testing

---

## 📄 License

ISC

---

## 🤝 Contributing

This is a demo project. Feel free to fork and modify as needed for your use case.

---

## 📧 Support

For issues or questions, please refer to the API documentation above or check the Postman collection examples.

---

**Built with ❤️ for the Intergalactic Bank 🌌**

