import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))));
});

async function start() {
  const config = loadConfig({ MCP_API_KEY: 'mcp-secret', BANKING_API_KEY: 'banking-secret' });
  const logger = { info() {}, error() {} };
  const app = createApp(config, logger);
  const server = await new Promise<Server>(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe('MCP HTTP application', () => {
  it('serves a public health endpoint', async () => {
    const baseUrl = await start();
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'healthy', service: 'intergalactic-banking-mcp', tools: 50 });
  });

  it('rejects unauthenticated MCP requests before protocol processing', async () => {
    const baseUrl = await start();
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Bearer');
  });

  it('authenticates and serves MCP initialization with correlation headers', async () => {
    const baseUrl = await start();
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mcp-secret',
        'X-Demo-Run-Id': 'fabric-lane',
        'X-Request-Id': 'compare-http-1',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'http-test', version: '1.0.0' } }
      })
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-demo-run-id')).toBe('fabric-lane');
    expect(response.headers.get('x-request-id')).toBe('compare-http-1');
    expect(await response.text()).toContain('intergalactic-banking-mcp');
  });

  it('generates a correlation ID when one is omitted', async () => {
    const baseUrl = await start();
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { Authorization: 'Bearer mcp-secret', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'http-test', version: '1.0.0' } }
      })
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toMatch(/^mcp-http-/);
    expect(response.headers.get('x-demo-run-id')).toBe('default');
  });

  it('validates run headers only after successful authentication', async () => {
    const baseUrl = await start();
    const invalid = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { Authorization: 'Bearer mcp-secret', 'X-Demo-Run-Id': 'invalid run', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    expect(invalid.status).toBe(400);

    const unauthenticated = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'X-Demo-Run-Id': 'invalid run', 'Content-Type': 'application/json' },
      body: '{}'
    });
    expect(unauthenticated.status).toBe(401);

    const longRequestId = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { Authorization: 'Bearer mcp-secret', 'X-Request-Id': 'x'.repeat(129), 'Content-Type': 'application/json' },
      body: '{}'
    });
    expect(longRequestId.status).toBe(400);
  });
});
