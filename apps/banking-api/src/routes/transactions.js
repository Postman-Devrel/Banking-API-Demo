const express = require('express');
const db = require('../database/db');
const { validateApiKey } = require('../middleware/auth');
const { validate } = require('../middleware/schemaValidation');
const idempotent = require('../middleware/mutationIdempotency');
const redactOwnership = require('../middleware/redactOwnership');
const { TransactionService } = require('../services/domainServices');

const router = express.Router();
router.use(validateApiKey);
router.use(redactOwnership);

const execute = handler => (req, res, next) => {
  try { return handler(req, res); } catch (error) { return next(error); }
};
const service = req => new TransactionService(db, req.runId, req.principal);

router.get('/', execute((req, res) => {
  const result = service(req).list(req.query);
  return res.json({ transactions: result.items, page: result.page });
}));
router.get('/:transactionId', execute((req, res) =>
  res.json({ transaction: service(req).get(req.params.transactionId) })));
router.post('/', idempotent('createTransaction'), validate('createTransaction'), execute((req, res) =>
  res.status(201).json({ transaction: service(req).create(req.body) })));

module.exports = router;
