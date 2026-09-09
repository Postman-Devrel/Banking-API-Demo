import { describe, expect, it } from 'vitest';
import operations from '@intergalactic/support-contract/operations';
import { CredentialRegistry, secureEqual } from '../src/auth.js';
import { loadConfig } from '../src/config.js';

describe('Support configuration and catalogue', () => {
  it('defines 62 unique operations with 53 customer-safe MCP candidates', () => {
    expect(operations).toHaveLength(62);
    expect(new Set(operations.map(value => value.operationId)).size).toBe(62);
    expect(operations.filter(value => value.mcpSafe)).toHaveLength(53);
    expect(operations.filter(value => value.mcpSafe && (value.admin || value.public))).toEqual([]);
  });

  it('uses distinct bounded local defaults and validates production configuration', () => {
    expect(loadConfig({})).toMatchObject({ host: '127.0.0.1', port: 8090, agentApiKey: 'support-demo-key', adminApiKey: 'support-admin-demo-key', maxRuns: 100 });
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('SUPPORT_API_KEY');
    expect(() => loadConfig({ NODE_ENV: 'production', SUPPORT_API_KEY: 'one' })).toThrow('SUPPORT_ADMIN_API_KEY');
    expect(() => loadConfig({ SUPPORT_API_KEY: 'same', SUPPORT_ADMIN_API_KEY: 'same' })).toThrow('must differ');
    expect(() => loadConfig({ SUPPORT_PORT: '0' })).toThrow('SUPPORT_PORT');
  });

  it('resolves static and generated credentials without retaining raw keys', () => {
    const registry = new CredentialRegistry(loadConfig({}));
    expect(registry.resolve('support-demo-key')).toMatchObject({ role: 'SUPPORT_AGENT' });
    expect(registry.resolve('wrong')).toBeUndefined();
    const created = registry.create('SUPPORT_AGENT', 'Generated');
    expect(created.apiKey).not.toContain('Generated');
    expect(registry.resolve(created.apiKey)).toEqual(created.principal);
    expect(secureEqual('same', 'same')).toBe(true);
    expect(secureEqual('same', 'other')).toBe(false);
  });
});
