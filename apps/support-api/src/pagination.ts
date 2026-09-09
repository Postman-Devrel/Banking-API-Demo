import { ApiError } from './errors.js';

export function paginate<T>(values: T[], query: Record<string, string | undefined>): { items: T[]; page: { limit: number; nextCursor: string | null; hasMore: boolean } } {
  const parsed = query.limit === undefined ? 25 : Number(query.limit);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) throw new ApiError(400, 'VALIDATION_ERROR', 'limit must be an integer from 1 to 100');
  let offset = 0;
  if (query.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')) as { offset?: unknown };
      if (!Number.isSafeInteger(decoded.offset) || Number(decoded.offset) < 0) throw new Error('invalid');
      offset = Number(decoded.offset);
    } catch { throw new ApiError(400, 'INVALID_CURSOR', 'cursor is invalid'); }
  }
  const items = values.slice(offset, offset + parsed);
  const hasMore = offset + parsed < values.length;
  return { items: structuredClone(items), page: { limit: parsed, nextCursor: hasMore ? Buffer.from(JSON.stringify({ offset: offset + parsed })).toString('base64url') : null, hasMore } };
}
