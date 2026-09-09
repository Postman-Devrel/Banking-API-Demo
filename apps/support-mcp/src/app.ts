import { randomUUID } from 'node:crypto';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { requireMcpApiKey } from './auth.js';
import { resolveRequestScope } from './config.js';
import { createSupportMcpServer, type SafeLogger } from './mcpServer.js';
import type { McpConfig } from './types.js';

function requestContext(defaultRunId: string): RequestHandler {
  return (req, res, next) => {
    try {
      const requestId = req.get('x-request-id')?.trim() || `mcp-support-http-${randomUUID()}`; const runId = req.get('x-demo-run-id') || defaultRunId;
      resolveRequestScope(new Request('http://localhost', { headers: { 'x-demo-run-id': runId, 'x-request-id': requestId } }), defaultRunId);
      req.headers['x-request-id'] = requestId; req.headers['x-demo-run-id'] = runId;
      res.set('X-Request-Id', requestId).set('X-Demo-Run-Id', runId); next();
    } catch (error) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST_CONTEXT', message: error instanceof Error ? error.message : 'Invalid request context' } });
    }
  };
}

export function createApp(config: McpConfig, logger?: SafeLogger) {
  const app = createMcpExpressApp({ host: config.host, jsonLimit: '256kb' });
  const handler = createMcpHandler(
    context => createSupportMcpServer(config, resolveRequestScope(context.requestInfo, config.defaultDemoRunId), logger ? { logger } : {}),
    { legacy: 'stateless', onerror: error => (logger || console).error({ event: 'support_mcp_protocol_error', message: error.message }) }
  );
  const nodeHandler = toNodeHandler(handler, { onerror: error => (logger || console).error({ event: 'support_mcp_adapter_error', message: error.message }) });
  app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'intergalactic-support-mcp', tools: 53 }));
  app.all('/mcp', requireMcpApiKey(config.mcpApiKey), requestContext(config.defaultDemoRunId), async (req, res, next) => {
    try { await nodeHandler(req, res, req.body); } catch (error) { next(error); }
  });
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    (logger || console).error({ event: 'support_mcp_http_error', message: error instanceof Error ? error.message : 'Unknown error' });
    if (!res.headersSent) res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'MCP request failed' } });
  };
  app.use(errorHandler); return app;
}
