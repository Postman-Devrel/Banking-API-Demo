---
description: Import an OpenAPI spec into Postman as a fully configured workspace
allowed-tools: Bash, Read, Write, Glob, mcp__postman__*
---

# /collection-import - Import API Spec to Postman

Import your OpenAPI spec into Postman and set up a complete workspace: collection, environment, and optionally a mock server and monitor.

## Prerequisites

Postman MCP Server (full mode) must be configured:
```bash
claude mcp add --transport http postman https://mcp.postman.com/mcp --header "Authorization: Bearer <POSTMAN_API_KEY>"
```

## Workflow

### Step 1: Find the Spec

Look for OpenAPI specs in the project:
- `**/openapi.{json,yaml,yml}`
- `**/swagger.{json,yaml,yml}`
- `**/*-api.{json,yaml,yml}`

If the user provides a URL, fetch the spec.

### Step 2: Create Workspace (optional)

If the user wants a dedicated workspace:
- Call `createWorkspace` with name derived from the API title
- Use type "personal" by default, or "team" if they specify
- Save the workspace ID for subsequent calls

If using an existing workspace:
- Call `getWorkspaces` to get the user's workspace ID

### Step 3: Create Spec in Postman

Call `createSpec` with:
- `workspaceId`: the workspace ID from Step 2
- `name`: the spec name
- `type`: one of "OPENAPI:2.0", "OPENAPI:3.0", "OPENAPI:3.1", "ASYNCAPI:2.0"
- `files`: array of objects with `path` and `content` fields (plus optional `type` field for multi-file specs)

This stores the OpenAPI definition in Postman's Spec Hub.

### Step 4: Generate Collection

Call `generateCollection` from the spec. **This is an async operation (HTTP 202).** Poll `getAsyncSpecTaskStatus` or `getGeneratedCollectionSpecs` for completion before proceeding.

This auto-creates a collection with:
- Requests for every endpoint
- Request bodies from schema examples
- Organized by tags/folders

### Step 5: Create Environment

Extract variables from the spec and create an environment:

Call `createEnvironment` with:
- `workspace`: the workspace ID
- `environment`: object containing variables:
  - `base_url` - from spec's server URL
  - `api_key` - empty, marked as secret (if spec uses API key auth)
  - `auth_token` - empty, marked as secret (if spec uses Bearer auth)
  - Any path parameters used across multiple endpoints

### Step 6: Confirm and Suggest Next Steps

```
Workspace set up: "Pet Store API"
  Spec:         Pet Store API v3.0 (in Spec Hub)
  Collection:   15 requests, organized by tag
  Environment:  Development (base_url, api_key)

  Next steps:
  - /api-test    → Run the collection tests
  - /mock-server → Create a mock for frontend development
  - /api-docs    → Publish documentation
```

## Error Handling

- **MCP not configured:** This command requires MCP. Tell the user: "Run `/postman-setup` to configure the Postman MCP Server."
- **MCP timeout:** Retry the tool call once. If `createSpec` or `generateCollection` still times out, the spec may be too large. Suggest breaking it into smaller specs by domain. Check https://status.postman.com for outages.
- **API key invalid (401):** "Your Postman API key was rejected. Generate a new one at https://postman.postman.co/settings/me/api-keys and run `/postman-setup` to reconfigure."
- **Invalid spec:** If the spec has parse errors (invalid YAML/JSON, missing required OpenAPI fields), report the specific errors. Offer to fix common issues like missing `info` or `paths` fields.
- **Plan limitations:** Workspace creation may be limited on free plans. If `createWorkspace` fails, use the default "My Workspace" instead.
