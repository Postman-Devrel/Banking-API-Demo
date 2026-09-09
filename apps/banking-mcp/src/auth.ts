import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function keysEqual(provided: string, expected: string): boolean {
  return timingSafeEqual(digest(provided), digest(expected));
}

function readCredential(authorization: string | undefined, apiKey: string | undefined): string | undefined {
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerKey = apiKey?.trim();
  if (bearer && headerKey && bearer !== headerKey) return undefined;
  return bearer || headerKey;
}

export function requireMcpApiKey(expectedKey: string): RequestHandler {
  return (req, res, next) => {
    const authorization = req.get('authorization');
    const apiKey = req.get('x-api-key');
    const credential = readCredential(authorization, apiKey);
    if (!credential || !keysEqual(credential, expectedKey)) {
      res
        .status(401)
        .set('Cache-Control', 'no-store')
        .set('WWW-Authenticate', 'Bearer realm="banking-mcp"')
        .json({ error: { code: 'UNAUTHORIZED', message: 'A valid MCP API key is required' } });
      return;
    }

    req.auth = {
      token: '[validated]',
      clientId: 'banking-mcp-api-key',
      scopes: ['banking:customer']
    };
    next();
  };
}
