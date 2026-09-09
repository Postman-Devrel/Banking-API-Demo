const express = require('express');
const db = require('../database/db');
const { validateApiKey, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/schemaValidation');
const idempotent = require('../middleware/mutationIdempotency');
const redactOwnership = require('../middleware/redactOwnership');
const { DisputeService } = require('../services/domainServices');

const router = express.Router();
router.use(validateApiKey);
router.use(redactOwnership);

const execute = handler => (req, res, next) => {
  try { return handler(req, res); } catch (error) { return next(error); }
};
const service = req => new DisputeService(db, req.runId, req.principal);

router.get('/', execute((req, res) => {
  const result = service(req).list(req.query);
  return res.json({ disputes: result.items, page: result.page });
}));
router.post('/', idempotent('createDispute'), validate('createDispute'), execute((req, res) =>
  res.status(201).json({ dispute: service(req).create(req.body) })));
router.get('/:disputeId', execute((req, res) => res.json({ dispute: service(req).get(req.params.disputeId) })));
router.patch('/:disputeId/status', requireAdmin, idempotent('updateDisputeStatus'), validate('disputeStatus'), execute((req, res) =>
  res.json({ dispute: service(req).transition(req.params.disputeId, req.body) })));
router.get('/:disputeId/evidence', execute((req, res) => {
  const result = service(req).listEvidence(req.params.disputeId, req.query);
  return res.json({ evidence: result.items, page: result.page });
}));
router.post('/:disputeId/evidence', idempotent('addDisputeEvidence'), validate('disputeEvidence'), execute((req, res) =>
  res.status(201).json({ evidence: service(req).addEvidence(req.params.disputeId, req.body) })));

module.exports = router;
