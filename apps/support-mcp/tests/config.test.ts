import { describe, expect, it } from 'vitest';
import { loadConfig, resolveRequestScope } from '../src/config.js';

describe('Support MCP configuration', () => {
  it('provides documented local defaults', () => {
    expect(loadConfig({})).toMatchObject({ supportApiBaseUrl: 'http://127.0.0.1:8090', supportApiKey: 'support-demo-key', mcpApiKey: 'support-mcp-demo-key', defaultDemoRunId: 'default', port: 3200 });
  });
  it('requires explicit distinct production secrets', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('SUPPORT_API_KEY');
    expect(() => loadConfig({ NODE_ENV: 'production', SUPPORT_API_KEY: 'api' })).toThrow('SUPPORT_MCP_API_KEY');
    expect(() => loadConfig({ SUPPORT_API_KEY: 'same', SUPPORT_MCP_API_KEY: 'same' })).toThrow('must differ');
  });
  it('validates numeric, URL, and run configuration', () => {
    expect(() => loadConfig({ SUPPORT_MCP_PORT: 'zero' })).toThrow('SUPPORT_MCP_PORT');
    expect(() => loadConfig({ SUPPORT_API_BASE_URL: 'invalid' })).toThrow('SUPPORT_API_BASE_URL');
    expect(() => loadConfig({ DEFAULT_SUPPORT_DEMO_RUN_ID: 'bad run' })).toThrow('DEFAULT_SUPPORT_DEMO_RUN_ID');
  });
  it('resolves per-request lane and correlation context', () => {
    const request = new Request('http://localhost/mcp', { headers: { 'X-Demo-Run-Id': 'fabric-lane', 'X-Request-Id': 'compare-1' } });
    expect(resolveRequestScope(request, 'default')).toEqual({ runId: 'fabric-lane', inboundRequestId: 'compare-1' });
    expect(resolveRequestScope(undefined, 'default')).toEqual({ runId: 'default' });
    expect(() => resolveRequestScope(new Request('http://localhost', { headers: { 'X-Demo-Run-Id': 'bad run' } }), 'default')).toThrow();
    expect(() => resolveRequestScope(new Request('http://localhost', { headers: { 'X-Request-Id': 'x'.repeat(129) } }), 'default')).toThrow();
  });
});
