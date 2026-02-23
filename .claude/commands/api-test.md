---
description: Run Postman collection tests and fix failures
allowed-tools: Bash, Read, Write, Glob, mcp__postman__*
---

# /api-test - Run Postman Collection Tests

Run your Postman collection tests directly from Claude Code using the Postman MCP Server. Analyze failures and fix them.

## Prerequisites

Postman MCP Server (full mode) must be configured:
```bash
claude mcp add --transport http postman https://mcp.postman.com/mcp --header "Authorization: Bearer <POSTMAN_API_KEY>"
```

## Workflow

### Step 1: Find the Collection

Use Postman MCP tools to locate collections:

1. **List workspaces:** Call `getWorkspaces` to find the target workspace
2. **List collections:** Call `getCollections` with the `workspace` parameter to see available collections
3. **Search by name:** If the user names a specific collection, call `getCollections` with the `workspace` parameter and use the `name` filter parameter to search by name. Only use `searchPostmanElements` as a fallback to search the public Postman network.

If the user provides a collection ID directly, skip to Step 2.

### Step 2: Run Tests

Call `runCollection` with the collection ID in `OWNER_ID-UUID` format (e.g., `12345-33823532ab9e41c9b6fd12d0fd459b8b`). Get the UID from the `getCollection` response's `uid` field. This runs synchronously and returns test results directly.

If the collection uses environment variables:
1. Call `getEnvironments` to list available environments
2. Ask which environment to use (or detect from naming convention)
3. Pass the environment ID to `runCollection`

### Step 3: Parse Results

The `runCollection` response includes test results. Present them clearly:

```
Test Results: Pet Store API
  Requests:  15 executed
  Passed:    12 (80%)
  Failed:    3

  Failures:
  1. POST /users → "Status code is 201" → Got 400
     Request: createUser
     Folder: User Management

  2. GET /users/{id} → "Response has email field" → Missing
     Request: getUser
     Folder: User Management

  3. DELETE /users/{id} → "Status code is 204" → Got 403
     Request: deleteUser
     Folder: User Management
```

### Step 4: Diagnose Failures

For each failure:
1. Call `getCollectionRequest` to see the full request definition
2. Call `getCollectionResponse` to see expected responses
3. Check if the API source code is in the current project
4. Explain what the test expected vs what happened
5. If code is local, find the handler and suggest the fix

### Step 5: Fix and Re-run

After fixing code:
1. Offer to re-run: "Tests fixed. Want me to run the collection again?"
2. Call `runCollection` again
3. Show before/after comparison

### Step 6: Update Collection (if needed)

If tests themselves need updating (not the API):
- Call `updateCollectionRequest` to fix request bodies, headers, or test scripts
- Call `updateCollectionResponse` to update expected responses

## Error Handling

- **MCP not configured:** This command requires MCP. Tell the user: "Run `/postman-setup` to configure the Postman MCP Server."
- **MCP timeout:** Retry the tool call once. For `runCollection`, large collections may take longer. If it times out again, suggest running a single folder to narrow the run. Check https://status.postman.com for outages.
- **API key invalid (401):** "Your Postman API key was rejected. Generate a new one at https://postman.postman.co/settings/me/api-keys and run `/postman-setup` to reconfigure."
- **Collection not found:** If `getCollections` returns no matches, ask the user for the collection ID or suggest `/collection-import` to create one.
- **Plan limitations:** Some Postman plans limit collection runs. If you get a 403 or plan-related error, inform the user: "Collection runs may require a Postman Basic plan or higher."
