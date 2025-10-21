# 📘 OpenAPI Specification

This project includes a complete OpenAPI 3.0 specification for the Intergalactic Bank API.

## 📄 Files

- **`openapi.yaml`** - OpenAPI 3.0 specification in YAML format

## 🔍 What's Included

The OpenAPI specification includes:

### ✅ Complete API Documentation
- All endpoints (Admin, Accounts, Transactions)
- Request/response schemas with validation rules
- Detailed descriptions for all operations
- Multiple examples for each endpoint
- Error responses with status codes

### 🔐 Security Definitions
- API key authentication scheme
- Admin permission requirements
- Rate limiting documentation

### 📊 Schemas
- **Account** - Account object with all properties
- **Transaction** - Transaction object with validation
- **Error** - Standardized error response format
- **Request Models** - Create and update request bodies

### 🎯 Features
- Multiple server configurations (local, production, demo)
- Enum validation for currencies
- Date format specifications
- Numeric constraints (min/max values)
- Required vs optional fields
- Default values

## 🚀 Using the OpenAPI Spec

### Viewing the Documentation

#### Option 1: Swagger UI (Local)
```bash
# Using npx (no installation needed)
npx swagger-ui-watcher openapi.yaml
```

Then open: http://localhost:8080

#### Option 2: Swagger Editor Online
1. Go to https://editor.swagger.io/
2. File → Import File
3. Select `openapi.yaml`

#### Option 3: VS Code Extension
Install "OpenAPI (Swagger) Editor" extension and open `openapi.yaml`

### Generating Client SDKs

Use the OpenAPI Generator to create client libraries:

```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate JavaScript client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g javascript \
  -o ./client-sdk/javascript

# Generate Python client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./client-sdk/python

# Generate TypeScript client
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./client-sdk/typescript
```

### Generating Server Stubs

Generate server boilerplate in various languages:

```bash
# Generate Node.js Express server
openapi-generator-cli generate \
  -i openapi.yaml \
  -g nodejs-express-server \
  -o ./generated-server

# Generate Python Flask server
openapi-generator-cli generate \
  -i openapi.yaml \
  -g python-flask \
  -o ./generated-server-python
```

### API Testing with OpenAPI

#### Using Postman
1. Import `openapi.yaml` into Postman
2. Postman will automatically create a collection
3. Configure authentication and environment variables
4. Run requests directly

#### Using Insomnia
1. Create → Import from → File
2. Select `openapi.yaml`
3. All endpoints will be imported

#### Using curl with examples
The spec includes examples that can be used with curl:

```bash
# Generate API key
curl http://localhost:3000/api/v1/auth

# List accounts
curl -H "x-api-key: 1234" \
  http://localhost:3000/api/v1/accounts

# Create account
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -H "x-api-key: 1234" \
  -d '{
    "owner": "John Doe",
    "balance": 1000,
    "currency": "COSMIC_COINS"
  }'
```

### Contract Testing

Use the OpenAPI spec for contract testing:

```bash
# Install Dredd
npm install -g dredd

# Run contract tests
dredd openapi.yaml http://localhost:3000
```

### Mock Server

Create a mock server from the OpenAPI spec:

```bash
# Using Prism
npm install -g @stoplight/prism-cli

# Start mock server
prism mock openapi.yaml

# Mock server will run on http://127.0.0.1:4010
```

## 📚 OpenAPI Features Used

### Path Parameters
```yaml
/api/v1/accounts/{accountId}:
  parameters:
    - name: accountId
      in: path
      required: true
```

### Query Parameters
```yaml
parameters:
  - name: owner
    in: query
    required: false
    schema:
      type: string
```

### Request Bodies
```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/CreateAccountRequest'
```

### Response Headers
```yaml
headers:
  X-RateLimit-Limit:
    description: Rate limit information
    schema:
      type: integer
```

### Reusable Components
```yaml
components:
  schemas:
    Account:
      type: object
      properties:
        accountId:
          type: string
```

### Multiple Examples
```yaml
examples:
  transfer:
    summary: Transfer between accounts
    value: { ... }
  deposit:
    summary: Deposit to account
    value: { ... }
```

## 🔧 Validation Rules

The OpenAPI spec includes comprehensive validation:

### String Validation
- `minLength`: Minimum string length
- `maxLength`: Maximum string length  
- `pattern`: Regex patterns
- `enum`: Allowed values

### Number Validation
- `minimum`: Minimum value
- `maximum`: Maximum value
- `exclusiveMinimum`: Greater than (not equal)
- `exclusiveMaximum`: Less than (not equal)

### Object Validation
- `required`: Required properties
- `additionalProperties`: Allow extra properties
- `properties`: Define object structure

### Array Validation
- `items`: Array item schema
- `minItems`: Minimum array length
- `maxItems`: Maximum array length

## 🎨 Customization

### Updating Servers
Edit the `servers` section in `openapi.yaml`:

```yaml
servers:
  - url: https://api.yourcompany.com
    description: Production
  - url: https://staging-api.yourcompany.com
    description: Staging
```

### Adding Custom Headers
Add to `components/headers`:

```yaml
X-Custom-Header:
  description: Your custom header
  schema:
    type: string
```

### Extending Schemas
Add new schemas or properties:

```yaml
components:
  schemas:
    CustomModel:
      type: object
      properties:
        field1:
          type: string
```

## 📊 Validation Tools

### Validate the OpenAPI Spec

```bash
# Using Swagger CLI
npm install -g @apidevtools/swagger-cli
swagger-cli validate openapi.yaml

# Using OpenAPI CLI
npm install -g @redocly/cli
openapi lint openapi.yaml
```

### Check for Breaking Changes

```bash
# Compare with previous version
openapi diff openapi-v1.yaml openapi-v2.yaml
```

## 🌐 Hosting Documentation

### GitHub Pages
1. Generate static HTML:
   ```bash
   npx redoc-cli bundle openapi.yaml -o docs/index.html
   ```
2. Enable GitHub Pages on the `docs/` folder

### Netlify/Vercel
Deploy Swagger UI or ReDoc with the spec file

### Docker
```dockerfile
FROM swaggerapi/swagger-ui
COPY openapi.yaml /usr/share/nginx/html/openapi.yaml
ENV SWAGGER_JSON=/usr/share/nginx/html/openapi.yaml
```

## 🔍 Additional Resources

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Swagger Editor](https://editor.swagger.io/)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [ReDoc](https://redocly.com/redoc/)
- [Stoplight Studio](https://stoplight.io/studio)

## ✅ Compliance

This OpenAPI specification is:
- ✅ OpenAPI 3.0.3 compliant
- ✅ Valid against JSON Schema
- ✅ Includes all required fields
- ✅ Uses standard HTTP status codes
- ✅ Follows REST best practices
- ✅ Includes comprehensive examples
- ✅ Documents all error responses

---

**The OpenAPI spec is the single source of truth for the API contract! 📘**

