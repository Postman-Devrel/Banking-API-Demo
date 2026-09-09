export type JsonSchema = boolean | {
  [key: string]: unknown;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  $ref?: string;
};

export interface BankingOperation {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  operationId: string;
  tag: string;
  summary: string;
  description: string;
  status: number;
  response?: string | null;
  request?: string | null;
  public: boolean;
  admin: boolean;
  mutation: boolean;
  paginated: boolean;
  queries: string[];
}
