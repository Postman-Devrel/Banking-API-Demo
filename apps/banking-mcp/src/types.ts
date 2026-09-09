import type { BankingOperation, JsonSchema } from '@intergalactic/banking-contract/types';

export type { BankingOperation, JsonSchema };

export interface McpConfig {
  nodeEnv: string;
  host: string;
  port: number;
  bankingApiBaseUrl: string;
  bankingApiKey: string;
  mcpApiKey: string;
  defaultDemoRunId: string;
  requestTimeoutMs: number;
}

export interface RequestScope {
  runId: string;
  inboundRequestId?: string;
}

export interface ToolDefinition {
  name: string;
  operation: BankingOperation;
  inputJsonSchema: JsonSchema;
  outputJsonSchema: JsonSchema;
}

export interface ToolTelemetry {
  operationId: string;
  httpStatus: number;
  durationMs: number;
  responseBytes: number;
  attempts: number;
  idempotencyReplayed: boolean;
  requestId: string;
  runId: string;
}

export interface BankingApiSuccess {
  ok: true;
  data: Record<string, unknown>;
  telemetry: ToolTelemetry;
}

export interface BankingApiFailure {
  ok: false;
  error: {
    code: string;
    httpStatus: number;
    message: string;
    requestId: string;
    retryAfter?: number;
  };
  telemetry: ToolTelemetry;
}

export type BankingApiResult = BankingApiSuccess | BankingApiFailure;
