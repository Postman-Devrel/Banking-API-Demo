import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
export const keysEqual = (provided: string, expected: string) => timingSafeEqual(digest(provided), digest(expected));
function readCredential(authorization: string | undefined, apiKey: string | undefined): string | undefined {
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim(); const headerKey = apiKey?.trim();
  if (bearer && headerKey && bearer !== headerKey) return undefined; return bearer || headerKey;
}
export function requireMcpApiKey(expectedKey: string): RequestHandler {
  return (req, res, next) => {
    const credential = readCredential(req.get('authorization'), req.get('x-api-key'));
    if (!credential || !keysEqual(credential, expectedKey)) {
      res.status(401).set('Cache-Control', 'no-store').set('WWW-Authenticate', 'Bearer realm="support-mcp"').json({ error: { code: 'UNAUTHORIZED', message: 'A valid Support MCP API key is required' } }); return;
    }
    req.auth = { token: '[validated]', clientId: 'support-mcp-api-key', scopes: ['support:agent'] }; next();
  };
}
