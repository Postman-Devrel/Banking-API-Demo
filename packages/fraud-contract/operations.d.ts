export interface FraudOperation {
  method: 'get' | 'post' | 'put'; path: string; operationId: string; tag: string; summary: string;
  request: string | null; response: string | null; status: number; public: boolean; admin: boolean; mutation: boolean;
}
declare const operations: FraudOperation[];
export = operations;
