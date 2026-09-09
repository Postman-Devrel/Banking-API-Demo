const { canonicalize } = require('json-canonicalize');
const db = require('../database/db');

const ttlMs = () => parseInt(process.env.IDEMPOTENCY_TTL_MS, 10) || 900000;
const capacity = () => parseInt(process.env.MAX_IDEMPOTENCY_RECORDS_PER_RUN, 10) || 1000;

const cleanup = state => {
  const now = Date.now();
  for (const [key, record] of state.idempotency.entries()) {
    if (now - record.createdAt > ttlMs()) state.idempotency.delete(key);
  }
  while (state.idempotency.size >= capacity()) {
    const completed = Array.from(state.idempotency.entries()).find(([, value]) => value.state === 'COMPLETED');
    if (!completed) break;
    state.idempotency.delete(completed[0]);
  }
};

const mutationIdempotency = operationId => (req, res, next) => {
  const key = req.get('idempotency-key');
  if (!key || key.length > 128) {
    return res.status(400).json({ error: { name: 'validationError', message: 'Idempotency-Key is required and must be at most 128 characters' } });
  }

  const state = db.getRun(req.runId);
  cleanup(state);
  if (state.idempotency.size >= capacity()) {
    return res.status(503).json({ error: { name: 'idempotencyCapacityExceeded', message: 'The run idempotency store is at capacity' } });
  }

  const fingerprint = canonicalize({ params: req.params || {}, query: req.query || {}, body: req.body || {} });
  const scope = canonicalize({ principalId: req.principal.principalId, operationId, key });
  const existing = state.idempotency.get(scope);
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return res.status(409).json({ error: { name: 'idempotencyConflict', message: 'Idempotency-Key was reused with a different request' } });
    }
    if (existing.state === 'IN_PROGRESS') {
      return res.status(409).json({ error: { name: 'idempotencyInProgress', message: 'An identical request is still in progress' } });
    }
    res.setHeader('Idempotency-Replayed', 'true');
    for (const [name, value] of Object.entries(existing.headers)) res.setHeader(name, value);
    return res.status(existing.status).json(existing.body);
  }

  const record = { state: 'IN_PROGRESS', fingerprint, createdAt: Date.now() };
  state.idempotency.set(scope, record);
  const originalJson = res.json.bind(res);
  res.json = body => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const headers = {};
      const location = res.getHeader('Location');
      if (location !== undefined) headers.Location = location;
      Object.assign(record, { state: 'COMPLETED', status: res.statusCode, headers, body });
    } else {
      state.idempotency.delete(scope);
    }
    return originalJson(body);
  };
  res.on('close', () => {
    if (!res.writableEnded && record.state === 'IN_PROGRESS') state.idempotency.delete(scope);
  });
  return next();
};

mutationIdempotency.cleanup = cleanup;
module.exports = mutationIdempotency;
