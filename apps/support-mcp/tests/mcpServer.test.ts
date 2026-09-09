import { describe, expect, it, vi } from 'vitest';
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, type JSONRPCMessage } from '@modelcontextprotocol/server';
import { SupportApiClient } from '../src/supportApiClient.js';
import { loadConfig } from '../src/config.js';
import { createSupportMcpServer } from '../src/mcpServer.js';

async function protocolHarness(server: ReturnType<typeof createSupportMcpServer>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const messages: JSONRPCMessage[] = []; let wake: (() => void) | undefined;
  clientTransport.onmessage = message => { messages.push(message); wake?.(); wake = undefined; };
  await server.connect(serverTransport); await clientTransport.start();
  async function request(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    const before = messages.length; await clientTransport.send(message);
    if (messages.length === before) await new Promise<void>(resolve => { wake = resolve; });
    const response = messages.at(-1); if (!response) throw new Error('MCP server did not respond'); return response;
  }
  return { clientTransport, request };
}

async function initialize(harness: Awaited<ReturnType<typeof protocolHarness>>) {
  const initialized = await harness.request({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'test-client', version: '1.0.0' } }
  });
  await harness.clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return initialized;
}

describe('Support MCP protocol server', () => {
  it('advertises 53 annotated tools, executes one, and keeps telemetry internal', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ cases: [], page: { limit: 25, nextCursor: null, hasMore: false } }), {
      status: 200, headers: { 'X-Request-Id': 'support-1' }
    }));
    const config = loadConfig({ SUPPORT_API_BASE_URL: 'http://support.test', SUPPORT_API_KEY: 'secret', SUPPORT_MCP_API_KEY: 'mcp-secret' });
    const logger = { info: vi.fn(), error: vi.fn() };
    const server = createSupportMcpServer(config, { runId: 'fabric-lane', inboundRequestId: 'compare-1' }, {
      client: new SupportApiClient(config, fetchMock as typeof fetch), logger
    });
    const harness = await protocolHarness(server);
    const initialized = await initialize(harness);
    expect(initialized).toHaveProperty('result.serverInfo.name', 'intergalactic-support-mcp');

    const listed = await harness.request({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const tools = (listed as unknown as { result: { tools: Array<Record<string, unknown>> } }).result.tools;
    expect(tools).toHaveLength(53);
    expect(tools.find(tool => tool.name === 'support_list_cases')).toMatchObject({
      title: 'Search support cases', annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    });
    expect(tools.find(tool => tool.name === 'support_cancel_case_task')).toMatchObject({
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
    });
    expect(JSON.stringify(tools)).not.toContain('secret');
    expect(JSON.stringify(tools)).not.toContain('com.postman.fabric/telemetry');

    const called = await harness.request({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'support_list_cases', arguments: { limit: 25 } } });
    expect(called).toMatchObject({ result: { structuredContent: { cases: [], page: { limit: 25, nextCursor: null, hasMore: false } } } });
    expect(JSON.stringify(called)).not.toContain('"_meta"');
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ tool: 'support_list_cases', ok: true, attempts: 1, requestId: 'support-1' }));
    await harness.clientTransport.close();
  });

  it('returns downstream failures as MCP errors without result telemetry', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: {
      code: 'CASE_NOT_FOUND', message: 'Not found', retryable: false, requestId: 'support-404'
    } }), { status: 404 }));
    const config = loadConfig({ SUPPORT_API_BASE_URL: 'http://support.test', SUPPORT_API_KEY: 'secret', SUPPORT_MCP_API_KEY: 'mcp-secret' });
    const harness = await protocolHarness(createSupportMcpServer(config, { runId: 'default' }, {
      client: new SupportApiClient(config, fetchMock as typeof fetch), logger: { info: vi.fn(), error: vi.fn() }
    }));
    await initialize(harness);
    const called = await harness.request({
      jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'support_get_case', arguments: { caseId: 'CASE-404' } }
    });
    expect(called).toMatchObject({ result: { isError: true, structuredContent: {
      error: { code: 'CASE_NOT_FOUND', httpStatus: 404, message: 'Not found', retryable: false, requestId: 'support-404' }
    } } });
    expect(JSON.stringify(called)).not.toContain('"_meta"');
    await harness.clientTransport.close();
  });
});
