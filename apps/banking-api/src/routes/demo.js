const express = require('express');
const router = express.Router();
const db = require('../database/db');
const rateLimit = require('../middleware/rateLimit');
const requestContext = require('../middleware/requestContext');
const { validateApiKey, requireAdmin } = require('../middleware/auth');
const idempotent = require('../middleware/mutationIdempotency');

router.post('/runs/:runId/reset', validateApiKey, requireAdmin, idempotent('resetDemoRun'), (req, res) => {
  const { runId } = req.params;
  if (!requestContext.RUN_ID_PATTERN.test(runId)) {
    return res.status(400).json({
      error: {
        name: 'validationError',
        message: 'runId must match [A-Za-z0-9_-]{1,64}'
      }
    });
  }

  const summary = db.resetRun(runId);
  rateLimit.reset(runId);
  requestContext.reset(runId);
  res.status(200).json({ run: summary });
});

module.exports = router;
