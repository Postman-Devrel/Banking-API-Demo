import { fromJsonSchema, McpServer, type CallToolResult, type ToolAnnotations } from '@modelcontextprotocol/server';
import { SupportApiClient } from './supportApiClient.js';
import { toolDefinitions } from './catalog.js';
import { resolveToolScope } from './config.js';
import type { McpConfig, RequestScope, ToolDefinition } from './types.js';

export interface SafeLogger { info(event: Record<string, unknown>): void; error(event: Record<string, unknown>): void }
const writeLog = (event: Record<string, unknown>) => console.error(JSON.stringify(event));
const defaultLogger: SafeLogger = { info: writeLog, error: writeLog };
function annotations(tool: ToolDefinition): ToolAnnotations {
  return { title: tool.operation.summary, readOnlyHint: !tool.operation.mutation, destructiveHint: tool.operation.destructive, idempotentHint: tool.operation.mutation, openWorldHint: false };
}

export function createSupportMcpServer(config: McpConfig, scope: RequestScope, dependencies: { client?: SupportApiClient; logger?: SafeLogger } = {}): McpServer {
  const client = dependencies.client || new SupportApiClient(config); const logger = dependencies.logger || defaultLogger;
  const server = new McpServer(
    { name: 'intergalactic-support-mcp', version: '1.0.0' },
    { instructions: 'Customer-safe support investigation tools backed by the deterministic Intergalactic Support API. Credentials, run selection, request correlation, and idempotency are supplied by the server.' }
  );
  for (const tool of toolDefinitions) {
    server.registerTool(
      tool.name,
      {
        title: tool.operation.summary,
        description: `${tool.operation.description} Credentials, correlation data, run identifiers, and idempotency keys are supplied through protected connection or protocol metadata, never model-visible tool arguments.`,
        inputSchema: fromJsonSchema(tool.inputJsonSchema as Parameters<typeof fromJsonSchema>[0]),
        outputSchema: fromJsonSchema(tool.outputJsonSchema as Parameters<typeof fromJsonSchema>[0]), annotations: annotations(tool)
      },
      async (args, context): Promise<CallToolResult> => {
        const toolScope = resolveToolScope(scope, context.mcpReq._meta);
        const result = await client.execute(tool.operation, args, toolScope, context.mcpReq.id);
        logger.info({ event: 'support_mcp_tool_call', tool: tool.name, ok: result.ok, ...result.telemetry });
        if (!result.ok) return {
          isError: true, content: [{ type: 'text', text: `${result.error.code}: ${result.error.message}` }], structuredContent: { error: result.error }
        };
        return { content: [{ type: 'text', text: `${tool.operation.summary} succeeded.` }], structuredContent: result.data };
      }
    );
  }
  return server;
}
