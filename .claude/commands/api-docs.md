---
description: Generate or improve API documentation and publish to Postman
allowed-tools: Bash, Read, Write, Glob, mcp__postman__*
---

# /api-docs - Generate API Documentation

Generate comprehensive API documentation from your OpenAPI spec or Postman collection. Optionally publish via Postman.

## Prerequisites

Postman MCP Server (full mode) must be configured:
```bash
claude mcp add --transport http postman https://mcp.postman.com/mcp --header "Authorization: Bearer <POSTMAN_API_KEY>"
```

## Workflow

### Step 1: Find the Source

**Workspace Resolution:**
First, call `getWorkspaces` to get the user's workspace ID. If multiple workspaces exist, ask which to use. Use this workspace ID for all subsequent calls.

Check for API definitions in this order:

**Local specs:**
- Search for `**/openapi.{json,yaml,yml}`, `**/swagger.{json,yaml,yml}`

**Postman specs:**
- Call `getAllSpecs` with the workspaceId to find specs already in Postman
- Call `getSpecDefinition` to pull the full spec

**Postman collections:**
- Call `getCollections` with the `workspace` parameter to find relevant collections
- Call `getCollection` to get full collection detail

### Step 2: Analyze Documentation Completeness

Read the spec/collection and assess:

```
Documentation Coverage: 60%
  Endpoints with descriptions:     8/15
  Parameters with descriptions:    22/45
  Endpoints with examples:         3/15
  Error responses documented:      2/15
  Authentication documented:       Yes
  Rate limits documented:          No
```

### Step 3: Generate or Improve

**If spec is sparse:** Generate documentation for each endpoint:
- Operation summary and description
- Parameter table (name, type, required, description)
- Request body schema with examples
- Response schemas with examples for each status code
- Error response documentation
- Authentication requirements per endpoint

**If spec is partial:** Fill the gaps:
- Add missing descriptions (infer from naming and schemas)
- Generate realistic examples from schemas
- Add error responses
- Document authentication and rate limits

### Step 4: Apply Changes

Ask the user which output they want:

1. **Update the spec file** - Write improved docs back into the OpenAPI spec directly
2. **Update in Postman** - Use `updateCollectionRequest` to add descriptions, examples, and documentation to each request in the collection
3. **Publish public docs** - Call `publishDocumentation` with:
   - `collectionId`: the collection's unique ID
   - `customColor`: `{ topBar: "#FF6C37", rightSidebar: "#FFFFFF", highlight: "#FF6C37" }` (Postman orange, or ask user preference)
   - `customization`: `{ appearance: { default: "light", themes: [{ name: "light", colors: { topBar: "#FF6C37", rightSidebar: "#FFFFFF", highlight: "#FF6C37" } }] } }`

   This makes collection docs publicly accessible and returns a public URL.
4. **Generate markdown** - Create a `docs/api-reference.md` file for the project

### Step 5: Sync Spec and Collection

If both a spec and collection exist, keep them in sync:
- Call `syncCollectionWithSpec` with `collectionUid` and `specId` to update collection from spec changes. **This is an async operation (HTTP 202).** Poll `getCollectionUpdatesTasks` for completion before proceeding. **Note:** This only works with OpenAPI 3.0 specs.
- Or call `syncSpecWithCollection` to update spec from collection changes

## Error Handling

- **MCP not configured:** Local markdown docs can be generated without MCP. For Postman publishing, tell the user: "Run `/postman-setup` to configure the Postman MCP Server."
- **MCP timeout:** Retry the tool call once. If it still fails, check https://status.postman.com for outages.
- **API key invalid (401):** "Your Postman API key was rejected. Generate a new one at https://postman.postman.co/settings/me/api-keys and run `/postman-setup` to reconfigure."
- **Plan limitations:** If a tool returns a 403 or plan-related error: "This feature may require a paid Postman plan. Check your plan at https://www.postman.com/pricing/"
- **Invalid spec:** If the OpenAPI spec has parse errors, report them and ask the user to fix syntax issues first. Offer to help fix common YAML/JSON errors.
- **Too many results:** If `getCollections` returns many collections, ask the user to specify by name rather than listing all.
