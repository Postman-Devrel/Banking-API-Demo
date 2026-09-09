import { describe, expect, it } from 'vitest';
import { catalogueStats, dereferenceSchema, findTool, toolDefinitions } from '../src/catalog.js';

describe('Support MCP catalogue', () => {
  it('publishes exactly 53 unique contract-selected tools', () => {
    expect(toolDefinitions).toHaveLength(53); expect(new Set(toolDefinitions.map(tool => tool.name)).size).toBe(53);
    expect(toolDefinitions.every(tool => tool.name.startsWith('support_') && tool.operation.mcpSafe)).toBe(true);
    expect(findTool('support_list_cases')).toBeDefined(); expect(findTool('support_create_case')).toBeUndefined();
    expect(toolDefinitions.map(tool => tool.operation.operationId)).not.toEqual(expect.arrayContaining(['createSupportApiKey', 'resetSupportRun', 'resolveCase', 'closeCase', 'reopenCase', 'completeVerificationRequest']));
  });
  it('keeps all transport and credential concerns out of arguments', () => {
    for (const tool of toolDefinitions) expect(JSON.stringify(tool.inputJsonSchema)).not.toMatch(/api.?key|authorization|idempotency|demo.?run|request.?id/i);
  });
  it('builds typed search, pagination, path, and evidence inputs', () => {
    expect(findTool('support_list_cases')?.inputJsonSchema).toMatchObject({ properties: { limit: { maximum: 100 }, cursor: { type: 'string' }, status: { enum: expect.arrayContaining(['OPEN', 'ESCALATED']) }, priority: { enum: expect.arrayContaining(['HIGH']) } } });
    expect(findTool('support_get_case')?.inputJsonSchema).toMatchObject({ required: ['caseId'], properties: { caseId: { type: 'string' } } });
    expect(findTool('support_search_knowledge_articles')?.inputJsonSchema).toMatchObject({ properties: { q: { maxLength: 120 } } });
    const evidence = findTool('support_attach_case_evidence')?.inputJsonSchema as Record<string, unknown>; expect(evidence).toHaveProperty('allOf'); expect(evidence).toHaveProperty('properties.facts');
  });
  it('marks the three destructive tools in canonical metadata', () => {
    expect(toolDefinitions.filter(tool => tool.operation.destructive).map(tool => tool.name).sort()).toEqual(['support_cancel_case_task', 'support_remove_case_tag', 'support_unlink_related_case']);
  });
  it('dereferences all reusable output schemas and rejects unknown references', () => {
    const schema = dereferenceSchema({ $ref: '#/components/schemas/CaseCollection' }); expect(JSON.stringify(schema)).not.toContain('$ref'); expect(schema).toHaveProperty('properties.cases.items.properties.caseId');
    expect(() => dereferenceSchema({ $ref: '#/components/schemas/Missing' })).toThrow('Unsupported schema reference');
  });
  it('reports a measurable context-heavy catalogue baseline', () => {
    expect(catalogueStats()).toMatchObject({ tools: 53, readOnlyTools: 33, mutatingTools: 20, destructiveTools: 3, serializedBytes: expect.any(Number), approximateTokens: expect.any(Number) });
    expect(catalogueStats().approximateTokens).toBeGreaterThan(20_000);
  });
});
