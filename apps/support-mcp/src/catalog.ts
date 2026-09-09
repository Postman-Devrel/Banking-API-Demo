import operations from '@intergalactic/support-contract/operations';
import requestSchemas from '@intergalactic/support-contract/schemas';
import publicSchemas from '@intergalactic/support-contract/public-schemas';
import type { JsonSchema, ToolDefinition } from './types.js';

const TOOL_ERROR_SCHEMA: JsonSchema = {
  type: 'object', additionalProperties: false, required: ['error'],
  properties: {
    error: {
      type: 'object', additionalProperties: false, required: ['code', 'httpStatus', 'message', 'retryable', 'requestId'],
      properties: {
        code: { type: 'string' }, httpStatus: { type: 'integer' }, message: { type: 'string' }, retryable: { type: 'boolean' },
        requestId: { type: 'string' }, retryAfter: { type: 'integer', minimum: 0 }, details: { type: 'array', items: { type: 'object' } }
      }
    }
  }
};
const clone = <T>(value: T): T => structuredClone(value);
const toolName = (operationId: string) => `support_${operationId.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}`;
const pathNames = (path: string) => [...path.matchAll(/{([^}]+)}/g)].map(match => match[1]).filter((value): value is string => Boolean(value));

function bodySchema(operation: ToolDefinition['operation']): Exclude<JsonSchema, boolean> | undefined {
  if (!operation.request) return undefined;
  const schema = clone(requestSchemas[operation.request]) as JsonSchema | undefined;
  return !schema || typeof schema === 'boolean' ? undefined : schema;
}
function buildInputSchema(operation: ToolDefinition['operation']): JsonSchema {
  const properties: Record<string, JsonSchema> = {}; const required = new Set<string>();
  for (const name of pathNames(operation.path)) { properties[name] = { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' }; required.add(name); }
  if (operation.collection) {
    properties.limit = { type: 'integer', minimum: 1, maximum: 100, default: 25 };
    properties.cursor = { type: 'string', minLength: 1, description: 'Opaque cursor returned by the previous page. Omit for the first page.' };
  }
  for (const query of operation.queries) properties[query.name] = clone(query.schema) as JsonSchema;
  const body = bodySchema(operation);
  if (body?.properties) {
    Object.assign(properties, body.properties);
    for (const name of body.required || []) required.add(name);
  }
  const result: Exclude<JsonSchema, boolean> = { type: 'object', additionalProperties: false, properties };
  if (required.size) result.required = [...required];
  if (body?.anyOf) result.anyOf = clone(body.anyOf);
  if (body?.oneOf) result.oneOf = clone(body.oneOf);
  if (body?.allOf) result.allOf = clone(body.allOf);
  if (body?.minProperties === 1 && !(body.required?.length)) result.anyOf = Object.keys(body.properties || {}).map(name => ({ required: [name] }));
  return result;
}

export function dereferenceSchema(schema: JsonSchema): JsonSchema {
  if (typeof schema === 'boolean') return schema;
  if (schema.$ref && typeof schema.$ref === 'string') {
    const name = schema.$ref.match(/^#\/components\/schemas\/([^/]+)$/)?.[1];
    if (!name || !publicSchemas[name]) throw new Error(`Unsupported schema reference: ${schema.$ref}`);
    return dereferenceSchema(clone(publicSchemas[name]) as JsonSchema);
  }
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (Array.isArray(value)) output[key] = value.map(item => item && typeof item === 'object' ? dereferenceSchema(item as JsonSchema) : item);
    else if (value && typeof value === 'object') output[key] = key === 'properties'
      ? Object.fromEntries(Object.entries(value).map(([name, child]) => [name, dereferenceSchema(child as JsonSchema)]))
      : dereferenceSchema(value as JsonSchema);
    else output[key] = value;
  }
  return output as JsonSchema;
}
function buildOutputSchema(operation: ToolDefinition['operation']): JsonSchema {
  const success = operation.response ? publicSchemas[operation.response] : undefined;
  if (!success) throw new Error(`Missing response schema for ${operation.operationId}`);
  return { anyOf: [dereferenceSchema(clone(success) as JsonSchema), TOOL_ERROR_SCHEMA] };
}

export const toolDefinitions: ToolDefinition[] = operations.filter(operation => operation.mcpSafe).map(operation => ({
  name: toolName(operation.operationId), operation, inputJsonSchema: buildInputSchema(operation), outputJsonSchema: buildOutputSchema(operation)
}));
if (toolDefinitions.length !== 53) throw new Error(`Expected 53 customer-safe Support tools, found ${toolDefinitions.length}`);
if (new Set(toolDefinitions.map(tool => tool.name)).size !== toolDefinitions.length) throw new Error('Generated Support MCP tool names are not unique');
export const findTool = (name: string) => toolDefinitions.find(tool => tool.name === name);

export function catalogueStats() {
  const serialized = JSON.stringify(toolDefinitions.map(tool => ({ name: tool.name, description: tool.operation.description, inputSchema: tool.inputJsonSchema, outputSchema: tool.outputJsonSchema })));
  const inputBytes = toolDefinitions.reduce((total, tool) => total + Buffer.byteLength(JSON.stringify(tool.inputJsonSchema)), 0);
  const outputBytes = toolDefinitions.reduce((total, tool) => total + Buffer.byteLength(JSON.stringify(tool.outputJsonSchema)), 0);
  return {
    tools: toolDefinitions.length, serializedBytes: Buffer.byteLength(serialized), approximateTokens: Math.ceil(Buffer.byteLength(serialized) / 4),
    inputSchemaBytes: inputBytes, outputSchemaBytes: outputBytes,
    readOnlyTools: toolDefinitions.filter(tool => !tool.operation.mutation).length,
    mutatingTools: toolDefinitions.filter(tool => tool.operation.mutation).length,
    destructiveTools: toolDefinitions.filter(tool => tool.operation.destructive).length
  };
}
