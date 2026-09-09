import { describe, expect, it } from 'vitest';
import { loadConfig, resolveRequestScope } from '../src/config.js';

describe('configuration', () => {
  it('provides documented local demo defaults', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      bankingApiBaseUrl: 'http://127.0.0.1:3000',
      bankingApiKey: '1234',
      mcpApiKey: 'banking-mcp-demo-key',
      defaultDemoRunId: 'default',
      port: 3100
    });
  });

  it('requires both secrets in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('BANKING_API_KEY');
    expect(() => loadConfig({ NODE_ENV: 'production', BANKING_API_KEY: 'customer' })).toThrow('MCP_API_KEY');
  });

  it('validates numeric, URL, and run configuration', () => {
    expect(() => loadConfig({ MCP_PORT: 'zero' })).toThrow('MCP_PORT');
    expect(() => loadConfig({ BANKING_API_BASE_URL: 'not-a-url' })).toThrow('BANKING_API_BASE_URL');
    expect(() => loadConfig({ DEFAULT_DEMO_RUN_ID: 'spaces are invalid' })).toThrow('DEFAULT_DEMO_RUN_ID');
  });

  it('resolves and validates per-request correlation context', () => {
    const request = new Request('http://localhost/mcp', {
      headers: { 'X-Demo-Run-Id': 'fabric-lane', 'X-Request-Id': 'comparison-1' }
    });
    expect(resolveRequestScope(request, 'default')).toEqual({ runId: 'fabric-lane', inboundRequestId: 'comparison-1' });
    expect(resolveRequestScope(undefined, 'default')).toEqual({ runId: 'default' });
    expect(() => resolveRequestScope(new Request('http://localhost', { headers: { 'X-Demo-Run-Id': 'bad run' } }), 'default')).toThrow();
    expect(() => resolveRequestScope(new Request('http://localhost', { headers: { 'X-Request-Id': 'x'.repeat(129) } }), 'default')).toThrow();
  });
});
