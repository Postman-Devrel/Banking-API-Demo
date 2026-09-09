import { describe, expect, it, vi } from 'vitest';
import { keysEqual, requireMcpApiKey } from '../src/auth.js';

function invoke(headers: Record<string, string>) {
  const req = {
    get: (name: string) => headers[name.toLowerCase()],
    auth: undefined
  } as never;
  const response = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    set(name: string, value: string) { this.headers[name] = value; return this; },
    json(body: unknown) { this.body = body; return this; }
  };
  const next = vi.fn();
  requireMcpApiKey('mcp-secret')(req, response as never, next);
  return { req: req as { auth?: { token: string } }, response, next };
}

describe('MCP API-key authentication', () => {
  it('compares credentials safely', () => {
    expect(keysEqual('same', 'same')).toBe(true);
    expect(keysEqual('wrong', 'same')).toBe(false);
  });

  it('accepts canonical Bearer and X-API-Key credentials', () => {
    for (const headers of [
      { authorization: 'Bearer mcp-secret' },
      { 'x-api-key': 'mcp-secret' },
      { authorization: 'Bearer mcp-secret', 'x-api-key': 'mcp-secret' }
    ]) {
      const result = invoke(headers);
      expect(result.next).toHaveBeenCalledOnce();
      expect(result.req.auth?.token).toBe('[validated]');
    }
  });

  it('rejects missing, invalid, or conflicting credentials without retaining them', () => {
    for (const headers of [
      {},
      { authorization: 'Bearer wrong' },
      { authorization: 'Basic mcp-secret' },
      { authorization: 'Bearer mcp-secret', 'x-api-key': 'different' }
    ]) {
      const result = invoke(headers);
      expect(result.response.statusCode).toBe(401);
      expect(result.response.headers['WWW-Authenticate']).toContain('Bearer');
      expect(JSON.stringify(result.response.body)).not.toContain('mcp-secret');
      expect(result.next).not.toHaveBeenCalled();
    }
  });
});
