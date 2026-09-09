const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const counters = new Map();

const requestContext = (req, res, next) => {
  const runId = req.get('x-demo-run-id') || 'default';
  if (!RUN_ID_PATTERN.test(runId)) {
    return res.status(400).json({
      error: {
        name: 'validationError',
        message: 'X-Demo-Run-Id must match [A-Za-z0-9_-]{1,64}'
      }
    });
  }

  req.runId = runId;
  const sequence = (counters.get(runId) || 0) + 1;
  counters.set(runId, sequence);
  req.requestId = req.get('x-request-id') || `REQ-${runId}-${String(sequence).padStart(6, '0')}`;
  res.setHeader('X-Demo-Run-Id', req.runId);
  res.setHeader('X-Request-Id', req.requestId);

  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      runId: req.runId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });

  next();
};

requestContext.RUN_ID_PATTERN = RUN_ID_PATTERN;
requestContext.reset = runId => {
  if (runId) counters.delete(runId);
  else counters.clear();
};

module.exports = requestContext;
