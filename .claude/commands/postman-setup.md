---
description: First-run setup — configure Postman MCP Server, validate API key, verify workspace access
allowed-tools: Bash, Read, Write
---

# /postman-setup — First-Run Configuration

Walk the user through setting up the Postman MCP Server for Claude Code. Validate everything works before they start using other commands.

## Workflow

### Step 1: Check Current MCP Configuration

Look for existing Postman MCP configuration:

```bash
claude mcp list 2>/dev/null | grep -i postman
```

If already configured, verify it works by calling `getWorkspaces`. If that succeeds:
```
✓ Postman MCP Server is configured and working.
  Connected to workspace: <workspace name>
  You're all set! Try /postman or any other command.
```

If the call fails, the API key may be invalid — proceed to Step 2.

### Step 2: Get API Key

If not configured:
```
Let's set up the Postman MCP Server.

1. Go to: https://postman.postman.co/settings/me/api-keys
2. Click "Generate API Key"
3. Give it a name (e.g., "Claude Code")
4. Copy the key and paste it here

I'll configure the MCP server for you.
```

Wait for the user to provide the key.

### Step 3: Configure MCP Server

Once the user provides their API key:

```bash
claude mcp add --transport http postman https://mcp.postman.com/mcp \
  --header "Authorization: Bearer <USER_API_KEY>"
```

### Step 4: Validate Connection

Test the connection by calling `getWorkspaces`.

**If it works:**
```
✓ Connected successfully!
  
  Your workspaces:
    - My Workspace (personal)
    - Team APIs (team)
  
  Setup complete. Here's what you can do:
    /postman          — Swiss army knife for Postman operations
    /api-test         — Run collection tests
    /api-docs         — Generate API documentation
    /api-security     — Security audit
    /collection-import — Import specs into Postman
    /mock-server      — Create mock servers
```

**If it fails with 401:**
```
✗ API key was rejected. Common causes:
  - Key was copied incorrectly (check for extra spaces)
  - Key was revoked or expired
  - Key doesn't have sufficient permissions

  Try generating a new key at:
  https://postman.postman.co/settings/me/api-keys
```

**If it fails with timeout:**
```
✗ Couldn't reach the Postman MCP Server. Common causes:
  - Network/firewall blocking the connection
  - Postman services may be temporarily down
  - Check https://status.postman.com for outages

  Try again in a few minutes.
```

### Step 5: Workspace Verification

After successful connection, confirm the user's workspace has content:

1. Get the workspace ID from the `getWorkspaces` response
2. Call `getCollections` with the `workspace` parameter — show count
3. Call `getAllSpecs` with the workspaceId — show count

```
Your workspace has:
  - 12 collections
  - 3 API specs

You're ready to go!
```

If the workspace is empty:
```
Your workspace is empty — that's fine! You can:
  - /collection-import to import an OpenAPI spec
  - /postman create a collection from my code
```

### Step 6: Suggest First Command

After workspace verification, give the user a concrete next action based on what they have:

**If they have collections:**
```
Try one of these to get started:
  /api-test         — Run tests on one of your 12 collections
  /postman          — Browse and manage your APIs
  /api-security     — Audit a collection for security issues
```

**If they have specs but no collections:**
```
Try this first:
  /collection-import — Turn one of your specs into a full collection with environment
```

**If workspace is empty:**
```
Try this first:
  /collection-import — Import an OpenAPI spec from your project

  Don't have a spec? Try:
  /postman create a basic REST API collection for my project
```

## Error Handling

- **Claude Code not installed:** "This command requires Claude Code CLI. Install it from https://claude.ai/claude-code"
- **MCP add command fails:** "Make sure you're running Claude Code v1.0+ which supports MCP servers."
- **Postman Free plan limitations:** "Some features (monitors, team workspaces) require a paid Postman plan. Core commands work on all plans."
