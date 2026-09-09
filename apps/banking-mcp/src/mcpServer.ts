import {
  fromJsonSchema,
  McpServer,
  type CallToolResult,
  type ToolAnnotations
} from '@modelcontextprotocol/server';
import { BankingApiClient } from './bankingApiClient.js';
import { toolDefinitions } from './catalog.js';
import type { McpConfig, RequestScope, ToolDefinition } from './types.js';

export interface SafeLogger {
  info(event: Record<string, unknown>): void;
  error(event: Record<string, unknown>): void;
}

const writeDefaultLog = (event: Record<string, unknown>) => console.error(JSON.stringify(event));
const defaultLogger: SafeLogger = { info: writeDefaultLog, error: writeDefaultLog };

function annotationsFor(tool: ToolDefinition): ToolAnnotations {
  const id = tool.operation.operationId;
  const destructive = /^(delete|cancel|replace|createTransaction)/.test(id);
  return {
    title: tool.operation.summary,
    readOnlyHint: !tool.operation.mutation,
    destructiveHint: destructive,
    idempotentHint: tool.operation.mutation,
    openWorldHint: false
  };
}

export function createBankingMcpServer(
  config: McpConfig,
  scope: RequestScope,
  dependencies: { client?: BankingApiClient; logger?: SafeLogger } = {}
): McpServer {
  const client = dependencies.client || new BankingApiClient(config);
  const logger = dependencies.logger || defaultLogger;
  const server = new McpServer(
    { name: 'intergalactic-banking-mcp', version: '1.0.0' },
    {
      instructions: 'Customer-safe banking tools backed by the deterministic Intergalactic Banking API. Monetary values are integer minor units. Mutations are idempotent and run-scoped.'
    }
  );

  for (const tool of toolDefinitions) {
    server.registerTool(
      tool.name,
      {
        title: tool.operation.summary,
        description: `${tool.operation.description} Uses the authenticated customer and selected demo run; credentials and run identifiers are supplied by the server, not as tool arguments.`,
        inputSchema: fromJsonSchema(tool.inputJsonSchema as Parameters<typeof fromJsonSchema>[0]),
        outputSchema: fromJsonSchema(tool.outputJsonSchema as Parameters<typeof fromJsonSchema>[0]),
        annotations: annotationsFor(tool),
        _meta: {
          'com.postman.fabric/operationId': tool.operation.operationId,
          'com.postman.fabric/apiPath': tool.operation.path,
          'com.postman.fabric/apiMethod': tool.operation.method.toUpperCase()
        }
      },
      async (args, context): Promise<CallToolResult> => {
        const result = await client.execute(tool.operation, args, scope, context.mcpReq.id);
        const meta = { 'com.postman.fabric/telemetry': result.telemetry };
        logger.info({
          event: 'banking_mcp_tool_call',
          tool: tool.name,
          ok: result.ok,
          ...result.telemetry
        });

        if (!result.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `${result.error.code}: ${result.error.message}` }],
            structuredContent: { error: result.error },
            _meta: meta
          };
        }
        return {
          content: [{ type: 'text', text: `${tool.operation.summary} succeeded (HTTP ${result.telemetry.httpStatus}).` }],
          structuredContent: result.data,
          _meta: meta
        };
      }
    );
  }

  return server;
}
