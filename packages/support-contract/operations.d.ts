export interface SupportOperation {
  method: 'get' | 'post' | 'patch' | 'delete'; path: string; operationId: string; tag: string; summary: string; description: string;
  request: string | null; response: string | null; status: number; public: boolean; mutation: boolean;
  admin: boolean; mcpSafe: boolean; collection: boolean; demoOnly: boolean; destructive: boolean;
  queries: Array<{ name: string; schema: Record<string, unknown> }>;
}
declare const operations: SupportOperation[];
export = operations;
