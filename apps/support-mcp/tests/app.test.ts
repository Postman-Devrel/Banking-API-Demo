import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))); });

async function start() {
  const config = loadConfig({ SUPPORT_MCP_API_KEY: 'mcp-secret', SUPPORT_API_KEY: 'support-secret' });
  const app = createApp(config, { info() {}, error() {} });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server); return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const initializeBody = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'http-test', version: '1.0.0' } }
});

describe('Support MCP HTTP application', () => {
  it('serves a public health endpoint', async () => {
    const response = await fetch(`${await start()}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'healthy', service: 'intergalactic-support-mcp', tools: 53 });
  });

  it('rejects unauthenticated MCP requests before protocol processing', async () => {
    const response = await fetch(`${await start()}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: initializeBody });
    expect(response.status).toBe(401); expect(response.headers.get('www-authenticate')).toContain('Bearer');
  });

  it('authenticates and serves initialization with correlation headers', async () => {
    const response = await fetch(`${await start()}/mcp`, {
      method: 'POST', headers: {
        Authorization: 'Bearer mcp-secret', 'X-Demo-Run-Id': 'fabric-lane', 'X-Request-Id': 'compare-http-1',
        'Content-Type': 'application/json', Accept: 'application/json, text/event-stream'
      }, body: initializeBody
    });
    expect(response.status).toBe(200); expect(response.headers.get('x-demo-run-id')).toBe('fabric-lane');
    expect(response.headers.get('x-request-id')).toBe('compare-http-1'); expect(await response.text()).toContain('intergalactic-support-mcp');
  });

  it('supports X-API-Key authentication and generates omitted context', async () => {
    const response = await fetch(`${await start()}/mcp`, {
      method: 'POST', headers: { 'X-API-Key': 'mcp-secret', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: initializeBody
    });
    expect(response.status).toBe(200); expect(response.headers.get('x-request-id')).toMatch(/^mcp-support-http-/);
    expect(response.headers.get('x-demo-run-id')).toBe('default');
  });

  it('validates context only after successful authentication', async () => {
    const baseUrl = await start();
    const invalid = await fetch(`${baseUrl}/mcp`, {
      method: 'POST', headers: { Authorization: 'Bearer mcp-secret', 'X-Demo-Run-Id': 'invalid run', 'Content-Type': 'application/json' }, body: initializeBody
    });
    expect(invalid.status).toBe(400);
    const unauthenticated = await fetch(`${baseUrl}/mcp`, {
      method: 'POST', headers: { 'X-Demo-Run-Id': 'invalid run', 'Content-Type': 'application/json' }, body: '{}'
    });
    expect(unauthenticated.status).toBe(401);
    const longRequestId = await fetch(`${baseUrl}/mcp`, {
      method: 'POST', headers: { Authorization: 'Bearer mcp-secret', 'X-Request-Id': 'x'.repeat(129), 'Content-Type': 'application/json' }, body: '{}'
    });
    expect(longRequestId.status).toBe(400);
  });
});
