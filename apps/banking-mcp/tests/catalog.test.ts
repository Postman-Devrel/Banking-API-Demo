import { describe, expect, it } from 'vitest';
import { dereferenceSchema, findTool, toolDefinitions } from '../src/catalog.js';

describe('MCP tool catalogue', () => {
  it('publishes exactly 50 unique customer-safe tools', () => {
    expect(toolDefinitions).toHaveLength(50);
    expect(new Set(toolDefinitions.map(tool => tool.name)).size).toBe(50);
    expect(toolDefinitions.every(tool => tool.name.startsWith('banking_'))).toBe(true);
    expect(toolDefinitions.map(tool => tool.operation.operationId)).not.toEqual(expect.arrayContaining([
      'createApiKey', 'resetDemoRun', 'updateDisputeStatus', 'generateLegacyApiKey'
    ]));
  });

  it('keeps credentials, run selection, and idempotency out of tool arguments', () => {
    for (const tool of toolDefinitions) {
      const text = JSON.stringify(tool.inputJsonSchema);
      expect(text).not.toMatch(/api.?key|authorization|idempotency|demo.?run/i);
    }
  });

  it('builds path, pagination, query, and body arguments from the contract', () => {
    const statement = findTool('banking_get_account_statement');
    expect(statement?.inputJsonSchema).toMatchObject({
      required: ['accountId'],
      properties: {
        accountId: { type: 'string' },
        limit: { type: 'integer', maximum: 100 },
        cursor: { type: 'string' }
      }
    });
    expect(findTool('banking_get_exchange_rates')?.inputJsonSchema).toMatchObject({
      properties: { base: { enum: ['COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS'] } }
    });
  });

  it('does not let a customer self-assign beneficiary trust', () => {
    const update = findTool('banking_update_beneficiary');
    expect(update?.inputJsonSchema).toMatchObject({
      required: expect.arrayContaining(['id', 'name']),
      properties: { id: expect.any(Object), name: expect.any(Object) }
    });
    expect(JSON.stringify(update?.inputJsonSchema)).not.toContain('status');
  });

  it('dereferences reusable response components for MCP output validation', () => {
    const schema = dereferenceSchema({ $ref: '#/components/schemas/AccountResponse' });
    expect(JSON.stringify(schema)).not.toContain('$ref');
    expect(schema).toMatchObject({ properties: { account: { properties: { accountId: { type: 'string' } } } } });
    expect(() => dereferenceSchema({ $ref: '#/components/schemas/DoesNotExist' })).toThrow('Unsupported schema reference');
  });
});
