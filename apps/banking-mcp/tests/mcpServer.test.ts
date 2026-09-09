import { describe, expect, it, vi } from 'vitest';
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, type JSONRPCMessage } from '@modelcontextprotocol/server';
import { BankingApiClient } from '../src/bankingApiClient.js';
import { loadConfig } from '../src/config.js';
import { createBankingMcpServer } from '../src/mcpServer.js';

async function protocolHarness(server: ReturnType<typeof createBankingMcpServer>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const messages: JSONRPCMessage[] = [];
  let wake: (() => void) | undefined;
  clientTransport.onmessage = message => {
    messages.push(message);
    wake?.();
    wake = undefined;
  };
  await server.connect(serverTransport);
  await clientTransport.start();

  async function request(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    const before = messages.length;
    await clientTransport.send(message);
    if (messages.length === before) await new Promise<void>(resolve => { wake = resolve; });
    const response = messages.at(-1);
    if (!response) throw new Error('MCP server did not respond');
    return response;
  }
  return { clientTransport, request };
}

describe('Banking MCP protocol server', () => {
  it('advertises 50 annotated contract-generated tools and executes one', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      accounts: [], page: { limit: 25, nextCursor: null, hasMore: false }
    }), { status: 200, headers: { 'X-Request-Id': 'banking-1' } }));
    const config = loadConfig({ BANKING_API_BASE_URL: 'http://banking.test', BANKING_API_KEY: 'secret', MCP_API_KEY: 'mcp-secret' });
    const logger = { info: vi.fn(), error: vi.fn() };
    const server = createBankingMcpServer(config, { runId: 'fabric-lane', inboundRequestId: 'compare-1' }, {
      client: new BankingApiClient(config, fetchMock as typeof fetch),
      logger
    });
    const harness = await protocolHarness(server);

    const initialized = await harness.request({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'test-client', version: '1.0.0' } }
    });
    expect(initialized).toHaveProperty('result.serverInfo.name', 'intergalactic-banking-mcp');
    await harness.clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized' });

    const listed = await harness.request({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const tools = (listed as unknown as { result: { tools: Array<Record<string, unknown>> } }).result.tools;
    expect(tools).toHaveLength(50);
    const listAccounts = tools.find(tool => tool.name === 'banking_list_accounts');
    expect(listAccounts).toMatchObject({
      title: 'List owned accounts',
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    });
    expect(JSON.stringify(tools)).not.toContain('secret');
    expect(tools.find(tool => tool.name === 'banking_create_transaction')).toMatchObject({
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
    });

    const called = await harness.request({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'banking_list_accounts', arguments: { limit: 25 } }
    });
    expect(called).toMatchObject({
      result: {
        structuredContent: { accounts: [], page: { limit: 25, nextCursor: null, hasMore: false } }
      }
    });
    expect((called as { result: Record<string, unknown> }).result).not.toHaveProperty('_meta');
    expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ tool: 'banking_list_accounts', ok: true, attempts: 1 }));
    await harness.clientTransport.close();
  });

  it('returns downstream failures as MCP tool errors', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { name: 'NotFoundError', message: 'Not found' } }), { status: 404 }));
    const config = loadConfig({ BANKING_API_BASE_URL: 'http://banking.test', BANKING_API_KEY: 'secret', MCP_API_KEY: 'mcp-secret' });
    const server = createBankingMcpServer(config, { runId: 'default' }, {
      client: new BankingApiClient(config, fetchMock as typeof fetch),
      logger: { info: vi.fn(), error: vi.fn() }
    });
    const harness = await protocolHarness(server);
    await harness.request({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'test-client', version: '1.0.0' } }
    });
    await harness.clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const called = await harness.request({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'banking_get_card', arguments: { id: 'CARD-404' } }
    });
    expect(called).toMatchObject({
      result: {
        isError: true,
        structuredContent: { error: { code: 'NotFoundError', httpStatus: 404, message: 'Not found' } }
      }
    });
    await harness.clientTransport.close();
  });
});
