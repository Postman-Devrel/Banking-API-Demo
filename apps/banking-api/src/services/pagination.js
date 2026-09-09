const encode = (scope, value) => Buffer.from(JSON.stringify({ v: 1, scope, after: value }), 'utf8').toString('base64url');
const decode = (cursor, scope) => {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return parsed.v === 1 && parsed.scope === scope && typeof parsed.after === 'string' ? parsed.after : null;
  } catch (_error) {
    return null;
  }
};

const paginate = (items, query = {}, idField, scope = idField) => {
  const requested = Number(query.limit === undefined ? 25 : query.limit);
  if (!Number.isInteger(requested) || requested < 1 || requested > 100) {
    const error = new Error('limit must be an integer between 1 and 100');
    error.status = 400;
    throw error;
  }
  const after = decode(query.cursor, scope);
  if (query.cursor && !after) {
    const error = new Error('cursor is invalid');
    error.status = 400;
    throw error;
  }
  const ordered = items.slice().sort((left, right) => String(left[idField]).localeCompare(String(right[idField])));
  const start = after ? ordered.findIndex(item => String(item[idField]) === after) + 1 : 0;
  if (after && start === 0) {
    const error = new Error('cursor does not reference this collection');
    error.status = 400;
    throw error;
  }
  const pageItems = ordered.slice(start, start + requested);
  const hasMore = start + requested < ordered.length;
  return {
    items: pageItems,
    page: {
      limit: requested,
      nextCursor: hasMore ? encode(scope, String(pageItems[pageItems.length - 1][idField])) : null,
      hasMore
    }
  };
};

module.exports = { paginate, encode, decode };
