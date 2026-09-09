import operations from '@intergalactic/banking-contract/operations';
import requestSchemas from '@intergalactic/banking-contract/schemas';
import publicSchemas from '@intergalactic/banking-contract/public-schemas';
import type { BankingOperation, JsonSchema, ToolDefinition } from './types.js';

const EXCLUDED_OPERATIONS = new Set([
  'checkHealth',
  'getOpenApiDocument',
  'generateLegacyApiKey',
  'createApiKey',
  'resetDemoRun',
  'updateDisputeStatus'
]);

const TOOL_ERROR_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'httpStatus', 'message', 'requestId'],
      properties: {
        code: { type: 'string' },
        httpStatus: { type: 'integer' },
        message: { type: 'string' },
        requestId: { type: 'string' },
        retryAfter: { type: 'integer', minimum: 0 }
      }
    }
  }
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function operationToToolName(operationId: string): string {
  return `banking_${operationId.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}`;
}

function pathParameterNames(path: string): string[] {
  return [...path.matchAll(/{([^}]+)}/g)].map(match => match[1]).filter((name): name is string => Boolean(name));
}

function requestBodySchema(operation: BankingOperation): Exclude<JsonSchema, boolean> | undefined {
  if (!operation.request) return undefined;
  const schema = clone(requestSchemas[operation.request]);
  if (!schema || typeof schema === 'boolean') return undefined;
  if (operation.operationId === 'updateBeneficiary') {
    schema.properties = { name: schema.properties?.name || { type: 'string', minLength: 1 } };
    schema.required = ['name'];
    delete schema.minProperties;
  }
  return schema;
}

function buildInputSchema(operation: BankingOperation): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required = new Set<string>();
  for (const name of pathParameterNames(operation.path)) {
    properties[name] = { type: 'string', minLength: 1 };
    required.add(name);
  }
  if (operation.paginated) {
    properties.limit = { type: 'integer', minimum: 1, maximum: 100, default: 25 };
    properties.cursor = { type: 'string', minLength: 1 };
  }
  for (const name of operation.queries) {
    properties[name] = name === 'base'
      ? clone((requestSchemas.fxQuote as Exclude<JsonSchema, boolean>).properties?.from || { type: 'string' })
      : { type: 'string' };
  }

  const body = requestBodySchema(operation);
  if (body?.properties) {
    Object.assign(properties, body.properties);
    for (const name of body.required || []) required.add(name);
  }

  const result: Exclude<JsonSchema, boolean> = {
    type: 'object',
    additionalProperties: false,
    properties
  };
  if (required.size > 0) result.required = [...required];
  if (body?.anyOf) result.anyOf = clone(body.anyOf);
  if (body?.oneOf) result.oneOf = clone(body.oneOf);
  if (body?.allOf) result.allOf = clone(body.allOf);
  if (body?.minProperties === 1 && (body.required?.length || 0) === 0 && body.properties) {
    result.anyOf = Object.keys(body.properties).map(name => ({ required: [name] }));
  }
  return result;
}

export function dereferenceSchema(schema: JsonSchema): JsonSchema {
  if (typeof schema === 'boolean') return schema;
  if (schema.$ref && typeof schema.$ref === 'string') {
    const match = schema.$ref.match(/^#\/components\/schemas\/([^/]+)$/);
    const name = match?.[1];
    if (!name || !publicSchemas[name]) throw new Error(`Unsupported schema reference: ${schema.$ref}`);
    return dereferenceSchema(clone(publicSchemas[name]));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (Array.isArray(value)) {
      result[key] = value.map(item => item && typeof item === 'object' ? dereferenceSchema(item as JsonSchema) : item);
    } else if (value && typeof value === 'object') {
      if (key === 'properties') {
        result[key] = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, dereferenceSchema(child as JsonSchema)]));
      } else if (key === 'additionalProperties') {
        result[key] = dereferenceSchema(value as JsonSchema);
      } else {
        result[key] = dereferenceSchema(value as JsonSchema);
      }
    } else {
      result[key] = value;
    }
  }
  return result as JsonSchema;
}

function buildOutputSchema(operation: BankingOperation): JsonSchema {
  const success = operation.response ? publicSchemas[operation.response] : { type: 'object' };
  if (!success) throw new Error(`Missing response schema for ${operation.operationId}`);
  return { anyOf: [dereferenceSchema(clone(success)), TOOL_ERROR_SCHEMA] };
}

export const toolDefinitions: ToolDefinition[] = operations
  .filter(operation => !EXCLUDED_OPERATIONS.has(operation.operationId))
  .map(operation => ({
    name: operationToToolName(operation.operationId),
    operation,
    inputJsonSchema: buildInputSchema(operation),
    outputJsonSchema: buildOutputSchema(operation)
  }));

if (toolDefinitions.length !== 50) {
  throw new Error(`Expected 50 customer-safe banking tools, found ${toolDefinitions.length}`);
}

if (new Set(toolDefinitions.map(tool => tool.name)).size !== toolDefinitions.length) {
  throw new Error('Generated MCP tool names are not unique');
}

export function findTool(name: string): ToolDefinition | undefined {
  return toolDefinitions.find(tool => tool.name === name);
}
