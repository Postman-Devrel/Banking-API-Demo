export interface ErrorDetail { field: string; issue: string }
export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly retryable = false, public readonly details?: ErrorDetail[], public readonly retryAfterMs?: number) { super(message); }
}
