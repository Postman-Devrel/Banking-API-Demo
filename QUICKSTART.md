# 🚀 Quick Start Guide

Get the Intergalactic Bank API up and running in 3 simple steps!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment (Optional)

Create a `.env` file in the project root (or use defaults):

```bash
PORT=3000
NODE_ENV=development
ADMIN_API_KEY=1234
RATE_LIMIT_REQUESTS=300
RATE_LIMIT_WINDOW_MS=60000
```

## Step 3: Start the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**OR Production mode**:
```bash
npm start
```

## ✅ Verify Installation

Once the server starts, visit:
```
http://localhost:3000/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-10T12:00:00.000Z",
  "uptime": 1.234
}
```

## 🎯 Try Your First Request

### 1. Generate an API Key
```bash
curl http://localhost:3000/api/v1/auth
```

Response:
```json
{
  "apiKey": "abc123def456"
}
```

### 2. List Accounts
```bash
curl -H "x-api-key: 1234" http://localhost:3000/api/v1/accounts
```

### 3. Create a New Account
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: 1234" \
  -d '{
    "owner": "John Doe",
    "balance": 1000,
    "currency": "COSMIC_COINS"
  }'
```

### 4. Create a Transaction
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "x-api-key: 1234" \
  -d '{
    "fromAccountId": "1",
    "toAccountId": "2",
    "amount": 500,
    "currency": "COSMIC_COINS"
  }'
```

## 📚 Next Steps

- Read the full [API Documentation](./API_README.md)
- Import the [Postman Collection](./OpenAPI/Bank%20API%20Reference%20Documentation.postman_collection.json)
- Explore sample accounts (IDs: 1, 2, 3)

## 🎉 You're Ready!

The API is now running with sample data. Happy coding! 🌌

