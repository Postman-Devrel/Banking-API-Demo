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

## Postman Collection Management

**IMPORTANT:** Whenever API endpoints are added, modified, or deleted, the Postman collection MUST be updated to maintain synchronization between implementation and documentation.

### When to Update Collections

After implementing endpoint changes, **ALWAYS ask the user** if they want to update the Postman collection before proceeding. Never update automatically without confirmation.

Example prompt:

```
I've completed the endpoint implementation. Would you like me to update the Postman collection
to reflect these changes?
```

### Collection Update Workflow

Follow this exact workflow when updating Postman collections:

**Step 1: Get Workspace Information**

- Ask user for workspace name (not ID initially)
- Use `mcp__postman__getWorkspaces` to search for workspaces
- Display matching workspaces and ask user to confirm the correct one
- If workspace name provided doesn't match, ask for clarification

**Step 2: Get Collection Information**

- Once workspace is confirmed, use `mcp__postman__getCollections` with the workspace ID
- Display available collections in that workspace
- Ask user to confirm which collection to update
- If collection name is ambiguous, show details and ask for confirmation

**Step 3: Read and Validate Current Collection**

- Use `mcp__postman__getCollection` with `model: "full"` parameter to retrieve complete collection data
- Review current structure, requests, and organization
- Identify which requests need to be added, updated, or removed
- Validate against the API implementation (check routes in `src/routes/` directory)

**Step 4: Prepare Updated Collection**

- Start with current collection structure
- **CRITICAL: Flatten all folders** - Extract all requests from nested folders to root level
- Remove all `item` entries that are folders (only keep request items)
- Update/add/remove requests as needed
- Ensure each request includes:
  - Correct HTTP method
  - Full URL with path parameters
  - Request headers (including `x-api-key` for auth)
  - Request body with examples
  - Response examples
- Maintain collection-level auth, variables, and scripts

**Step 5: Update Collection**

- **NEVER use `mcp__postman__updateCollectionRequest`** - it is too limited
- **ALWAYS use `mcp__postman__putCollection`** instead
- Pass the complete collection object with all required fields
- Include collection ID in the request
- Ensure `info` object has required `name` and `schema` properties

**Step 6: Verify Update**

- Read the collection again using `mcp__postman__getCollection`
- Confirm changes were applied correctly
- Report success to user with summary of changes

### Critical Rules for Collection Updates

1. **No Folders Allowed**

   - Collections MUST be flat (no nested folders or item groups)
   - If reading a collection with folders, automatically flatten it
   - Extract all requests from folders and place at root `item` array
   - Do not warn user - just flatten automatically

2. **Always Use putCollection**

   - `mcp__postman__updateCollectionRequest` cannot update: request body, URL, auth, headers, method
   - It's essentially useless for real updates
   - Always use `mcp__postman__putCollection` for ANY collection modification

3. **Preserve Collection IDs**

   - When updating, retain all existing IDs: `id`, `uid`, `_postman_id`
   - If IDs are missing, the API will generate new ones (breaking references)
   - Read collection first to get current IDs, then update with same IDs

4. **Collection Format Requirements**

   ```javascript
   {
     collection: {
       info: {
         name: "Collection Name",
         schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
         description: "Optional description"
       },
       item: [
         // Array of request objects ONLY (no folders)
         {
           name: "Request Name",
           request: {
             method: "GET|POST|PUT|DELETE",
             header: [...],
             url: {...},
             body: {...}  // for POST/PUT
           },
           response: []
         }
       ],
       auth: {...},      // Optional collection-level auth
       variable: [...],  // Optional collection variables
       event: [...]      // Optional pre-request/test scripts
     }
   }
   ```

5. **Request Structure**
   Each request must include:

   - `name` - Clear, descriptive name
   - `request.method` - HTTP method
   - `request.url` - Can be string or object with `raw`, `host`, `path`, `query`
   - `request.header` - Array of header objects with `key`, `value`
   - `request.body` (for POST/PUT) - Object with `mode` and content
   - `response` - Array of example responses (can be empty)

6. **Authentication**

   - Set collection-level auth if all requests use same auth
   - For this API: use `apikey` type with `x-api-key` header
   - Individual requests can override collection auth

7. **Variables**
   - Use collection variables for: `baseUrl`, `apiKey`
   - Format: `{ key: "varName", value: "default value", type: "string" }`

### Example Postman Update Flow

```
User: "Update the Postman collection with the new endpoints"

Assistant: "Which workspace should I update? Please provide the workspace name."

User: "My Team Workspace"

Assistant:
1. Call mcp__postman__getWorkspaces
2. Search results for matching name
3. Confirm: "Found workspace: My Team Workspace (ID: abc123). Is this correct?"

User: "Yes"

Assistant:
4. Call mcp__postman__getCollections with workspace ID
5. Display: "Found these collections: 1) Banking API Collection, 2) Test Collection"
6. Ask: "Which collection should I update?"

User: "Banking API Collection"

Assistant:
7. Call mcp__postman__getCollection with model: "full"
8. Review collection structure and identify folders
9. Flatten folders - extract all requests to root level
10. Read src/routes/accounts.js to see implemented endpoints
11. Add new GET /accounts/:id, PUT /accounts/:id, DELETE /accounts/:id requests
12. Update existing GET /accounts and POST /accounts requests if needed
13. Call mcp__postman__putCollection with updated collection
14. Verify by reading collection again
15. Report: "Collection updated successfully. Added 3 new endpoints, updated 2 existing endpoints."
```

### Common Pitfalls to Avoid

- **DO NOT** use updateCollectionRequest - always use putCollection
- **DO NOT** leave folders in collection - always flatten
- **DO NOT** forget to preserve IDs when updating
- **DO NOT** skip reading collection before updating
- **DO NOT** forget to validate against actual routes in codebase
- **DO NOT** update collection without asking user first
- **DO NOT** guess workspace/collection IDs - always search and confirm

### Validation Checklist

Before calling putCollection, verify:

- [ ] All folders flattened (item array contains only requests, no folders)
- [ ] All IDs preserved from original collection
- [ ] All new endpoints from codebase included
- [ ] Request URLs match route definitions in src/routes/
- [ ] HTTP methods correct (GET/POST/PUT/DELETE)
- [ ] Request bodies included for POST/PUT requests
- [ ] x-api-key header included in all requests
- [ ] Collection-level auth configured
- [ ] Variables defined (baseUrl, apiKey)
- [ ] info.name and info.schema present

## Development Notes

- Pre-commit hooks enforce linting and tests
- All routes require authentication except admin key generation
- Database uses singleton pattern with in-memory storage
- Models implement `validate()`, `toJSON()`, and domain-specific methods
- Error handling is centralized in middleware/errorHandler.js:7
- Account ownership is tracked via API key - users can only access their own accounts
- Soft delete is used for accounts (deleted flag) to preserve transaction history
