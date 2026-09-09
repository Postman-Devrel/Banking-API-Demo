import type { SupportOperation } from '@intergalactic/support-contract/operations';

export type JsonSchema = boolean | {
  $ref?: string; type?: string | string[]; const?: unknown; enum?: unknown[]; description?: string;
  properties?: Record<string, JsonSchema>; required?: string[]; additionalProperties?: JsonSchema;
  items?: JsonSchema; anyOf?: JsonSchema[]; oneOf?: JsonSchema[]; allOf?: JsonSchema[];
  if?: JsonSchema; then?: JsonSchema; else?: JsonSchema; minProperties?: number;
  [key: string]: unknown;
};

export interface McpConfig {
  nodeEnv: string; host: string; port: number; supportApiBaseUrl: string; supportApiKey: string;
  mcpApiKey: string; defaultDemoRunId: string; requestTimeoutMs: number;
}
export interface RequestScope { runId: string; inboundRequestId?: string }
export interface ToolDefinition { name: string; operation: SupportOperation; inputJsonSchema: JsonSchema; outputJsonSchema: JsonSchema }
export interface ToolTelemetry { operationId: string; httpStatus: number; durationMs: number; responseBytes: number; attempts: 1; idempotencyReplayed: boolean; requestId: string; runId: string }
export interface SupportApiSuccess { ok: true; data: Record<string, unknown>; telemetry: ToolTelemetry }
export interface SupportApiFailure { ok: false; error: { code: string; httpStatus: number; message: string; retryable: boolean; requestId: string; retryAfter?: number; details?: unknown[] }; telemetry: ToolTelemetry }
export type SupportApiResult = SupportApiSuccess | SupportApiFailure;
