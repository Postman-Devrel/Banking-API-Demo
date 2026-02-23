---
description: Security audit your API spec and Postman collection for vulnerabilities
allowed-tools: Bash, Read, Write, Glob, mcp__postman__*
---

# /api-security - API Security Audit

Audit your API for security issues: missing auth, exposed sensitive data, insecure transport, weak validation, and OWASP API Security Top 10 alignment. Works with local OpenAPI specs and Postman collections.

## Prerequisites

Postman MCP Server (full mode) must be configured for collection auditing:
```bash
claude mcp add --transport http postman https://mcp.postman.com/mcp --header "Authorization: Bearer <POSTMAN_API_KEY>"
```

For local-only spec auditing, MCP is optional.

## Workflow

### Step 1: Find the Source

**Workspace Resolution:**
First, call `getWorkspaces` to get the user's workspace ID. If multiple workspaces exist, ask which to use. Use this workspace ID for all subsequent calls.

**Local spec:**
- Search for `**/openapi.{json,yaml,yml}`, `**/swagger.{json,yaml,yml}`

**Postman collection (via MCP):**
- Call `getCollections` with the `workspace` parameter to list collections
- Call `getCollection` for full detail including auth config
- Call `getEnvironment` to check for exposed secrets

### Step 2: Run Security Checks

**Authentication & Authorization:**
- [ ] Security schemes defined (OAuth2, API Key, Bearer, etc.)
- [ ] Security applied globally or per-endpoint
- [ ] No endpoints accidentally unprotected
- [ ] OAuth2 scopes defined and appropriate
- [ ] Admin endpoints have elevated auth requirements

**Transport Security:**
- [ ] All server URLs use HTTPS
- [ ] No mixed HTTP/HTTPS
- [ ] HSTS headers recommended in docs

**Sensitive Data Exposure:**
- [ ] No API keys, tokens, or passwords in example values
- [ ] No secrets in query parameters (should be headers/body)
- [ ] Password fields marked as `format: password`
- [ ] PII fields identified
- [ ] Check Postman environment variables for leaked secrets (via `getEnvironment`)

**Input Validation:**
- [ ] All parameters have defined types
- [ ] String parameters have `maxLength` (prevents buffer overflow/injection)
- [ ] Numeric parameters have `minimum`/`maximum`
- [ ] Array parameters have `maxItems`
- [ ] Enum values used where applicable
- [ ] Request body has required field validation

**Rate Limiting:**
- [ ] Rate limits documented
- [ ] Rate limit headers defined (X-RateLimit-Limit, X-RateLimit-Remaining)
- [ ] 429 Too Many Requests response defined

**Error Handling:**
- [ ] Error responses don't leak stack traces
- [ ] Error schemas don't expose internal field names
- [ ] 401 and 403 responses properly defined
- [ ] Error messages don't reveal implementation details

**OWASP API Top 10 Alignment:**
- [ ] API1: Broken Object Level Authorization (IDs predictable, no ownership checks)
- [ ] API2: Broken Authentication (weak auth schemes)
- [ ] API3: Broken Object Property Level Authorization (mass assignment)
- [ ] API4: Unrestricted Resource Consumption (no rate limits)
- [ ] API5: Broken Function Level Authorization (admin endpoints exposed)

### Step 3: Present Results

```
API Security Audit: pet-store-api.yaml

  CRITICAL (2):
    SEC-001: 3 endpoints have no security scheme applied
      - GET /admin/users
      - DELETE /admin/users/{id}
      - PUT /admin/config
    SEC-002: Server URL uses HTTP (http://api.example.com)

  HIGH (3):
    SEC-003: No rate limiting documentation or 429 response
    SEC-004: API key sent as query parameter (use header instead)
    SEC-005: No maxLength on 8 string inputs (injection risk)

  MEDIUM (2):
    SEC-006: Password field visible in GET /users/{id} response
    SEC-007: Environment variable 'db_password' not marked secret

  Score: 48/100 - Significant Issues
```

### Step 4: Fix

For each finding:
1. Explain the security risk in plain terms
2. Show the exact spec change needed
3. Apply the fix with user approval

For Postman-specific issues:
- Call `putEnvironment` to mark secrets properly
- Call `updateCollectionRequest` to fix auth configuration
- Call `updateCollectionResponse` to remove sensitive data from examples

### Step 5: Re-audit

After fixes, re-run the audit to show improvement.

## Error Handling

- **MCP not configured:** Local spec auditing works without MCP. For Postman-specific checks (environment secrets, collection auth), tell the user: "Run `/postman-setup` to configure the Postman MCP Server."
- **MCP timeout:** Retry the tool call once. If it still fails, fall back to local-only spec analysis and note which checks were skipped. Check https://status.postman.com for outages.
- **API key invalid (401):** "Your Postman API key was rejected. Generate a new one at https://postman.postman.co/settings/me/api-keys and run `/postman-setup` to reconfigure."
- **Plan limitations:** If a tool returns a 403 or plan-related error: "This feature may require a paid Postman plan. Check your plan at https://www.postman.com/pricing/"
- **No spec found:** Ask the user for the path. If they don't have a spec, offer to audit a Postman collection directly via MCP.
- **Spec too large:** For large specs (100+ endpoints), audit in batches by tag or path prefix. Present results per group.
