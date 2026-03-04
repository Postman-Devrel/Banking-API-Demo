# Intergalactic Bank API

REST API for managing bank accounts and transactions with multi-currency support (**COSMIC_COINS**, **GALAXY_GOLD**, **MOON_BUCKS**).

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Domain Reference](#domain-reference)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Tech Stack](#tech-stack)
- [Extending the API](#extending-the-api)

---

## Quick Start

```bash
npm install
npm run dev
```

Server: **http://localhost:3000**

Verify:

```bash
curl http://localhost:3000/health
```

**Postman:** Import `OpenAPI/Bank API Reference Documentation.postman_collection.json`, set `baseUrl` to `http://localhost:3000` and `apiKey` to `1234`.

---

## Features

| Area | Description |
|------|--------------|
| **Accounts** | Create, read, update, delete (ownership-based). |
| **Transactions** | Transfers between accounts; deposits from external source. |
| **Currencies** | COSMIC_COINS, GALAXY_GOLD, MOON_BUCKS. |
| **Auth** | API key in `x-api-key` header. |
| **Rate limit** | 300 requests per minute per key. |
| **Ownership** | Each key only accesses accounts created with that key. |

---

## API Overview

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check. |
| GET | `/api/v1/auth` | No | Generate a new API key. |
| GET | `/api/v1/accounts` | Yes | List accounts for the current key. |
| GET | `/api/v1/accounts/:id` | Yes | Get one account by ID. |
| POST | `/api/v1/accounts` | Yes | Create an account. |
| PUT | `/api/v1/accounts/:id` | Yes | Update account (owner name, account type only). |
| DELETE | `/api/v1/accounts/:id` | Yes | Soft-delete account. |
| GET | `/api/v1/transactions` | Yes | List transactions (query params supported). |
| GET | `/api/v1/transactions/:id` | Yes | Get one transaction by ID. |
| POST | `/api/v1/transactions` | Yes | Transfer funds or deposit (body defines type). |

Base URL: `http://localhost:3000` (or your configured `PORT`).

---

## Authentication

- **Header:** `x-api-key: <your-api-key>`
- **Get a key:** `GET /api/v1/auth` (no auth required).
- **Default admin key:** `1234` (from `ADMIN_API_KEY` in `.env`).

All endpoints except `/health`, `/`, and `/api/v1/auth` require this header.

---

## Configuration

Optional `.env` (copy from `.env.example` if present):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port. |
| `ADMIN_API_KEY` | `1234` | Admin API key. |
| `RATE_LIMIT_REQUESTS` | `300` | Max requests per window. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms). |

---

## Project Structure

```
src/
├── server.js              # Entry point, middleware, route mounting
├── database/
│   └── db.js              # In-memory storage (singleton)
├── models/
│   ├── Account.js         # Account model and validation
│   └── Transaction.js     # Transaction model
├── routes/
│   ├── admin.js           # GET /api/v1/auth (key generation)
│   ├── accounts.js        # Account CRUD
│   └── transactions.js    # Transactions list, get, transfer/deposit
└── middleware/
    ├── auth.js            # API key validation and admin check
    ├── errorHandler.js    # Central error handler
    └── rateLimit.js       # Per-key rate limiting
```

---

## Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run with auto-reload. |
| `npm start` | Run in production mode. |
| `npm test` | Run test suite. |
| `npm test -- --coverage` | Run tests with coverage. |
| `npm run lint` | Lint; use `npm run lint:fix` to fix. |

---

## Domain Reference

### Account types

- **STANDARD** — Default.
- **PREMIUM** — Premium features.
- **BUSINESS** — Business account.

### Currencies

- **COSMIC_COINS** — Universal.
- **GALAXY_GOLD** — Premium.
- **MOON_BUCKS** — Alternative.

### Sample data (on startup)

Three accounts are created, all owned by admin key `1234`:

- Account 1: Nova Newman — 10,000 COSMIC_COINS  
- Account 2: Gary Galaxy — 237 COSMIC_COINS  
- Account 3: Luna Starlight — 5,000 GALAXY_GOLD  

### Rules

- **Ownership:** A key can only access accounts created with that key.
- **Soft delete:** Deleted accounts are marked deleted; history is kept.
- **Balance/currency:** Change only via transactions, not via account update.
- **Editable fields:** Only owner name and account type on existing accounts.

---

## Usage Examples

### Create an account

`POST /api/v1/accounts` with body:

```json
{
  "owner": "John Doe",
  "currency": "COSMIC_COINS",
  "balance": 1000,
  "accountType": "STANDARD"
}
```

### Transfer between accounts

`POST /api/v1/transactions` with body:

```json
{
  "fromAccountId": "account-uuid-1",
  "toAccountId": "account-uuid-2",
  "amount": 500,
  "currency": "COSMIC_COINS"
}
```

### Deposit from external source

Same endpoint; use `fromAccountId: "0"`:

```json
{
  "fromAccountId": "0",
  "toAccountId": "account-uuid",
  "amount": 100,
  "currency": "COSMIC_COINS"
}
```

---

## Error Handling

All error responses use this shape:

```json
{
  "error": {
    "name": "errorType",
    "message": "Human-readable description"
  }
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation or bad request. |
| 401 | Missing or invalid API key. |
| 403 | Not allowed (e.g. wrong account owner). |
| 404 | Resource not found. |
| 429 | Rate limit exceeded. |
| 500 | Server error. |

---

## Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Storage:** In-memory (Map-based; swappable)  
- **Testing:** Jest  
- **Auth:** API key via header  

---

## Extending the API

**Using a real database:**

1. Install the driver (e.g. `pg`, `mongodb`).
2. Update `src/database/db.js` with connection and CRUD using the same interface so routes stay unchanged.

---

## License

ISC.

---

**Detailed API docs** → Postman collection  
**Architecture** → `CLAUDE.md`  
**Issues** → Run `npm test` and check tests
