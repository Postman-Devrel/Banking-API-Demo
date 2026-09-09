const express = require('express');
const db = require('../database/db');
const { validateApiKey } = require('../middleware/auth');
const { validate } = require('../middleware/schemaValidation');
const idempotent = require('../middleware/mutationIdempotency');
const redactOwnership = require('../middleware/redactOwnership');
const { AccountService } = require('../services/domainServices');

const router = express.Router();
router.use(validateApiKey);
router.use(redactOwnership);

const execute = handler => (req, res, next) => {
  try { return handler(req, res); } catch (error) { return next(error); }
};
const service = req => new AccountService(db, req.runId, req.principal);

router.get('/', execute((req, res) => {
  const result = service(req).list(req.query);
  return res.json({ accounts: result.items, page: result.page });
}));
router.get('/:id', execute((req, res) => res.json({ account: service(req).get(req.params.id) })));
router.post('/', idempotent('createAccount'), validate('createAccount'), execute((req, res) =>
  res.status(201).json({ account: service(req).create(req.body) })));
const update = execute((req, res) => res.json({ account: service(req).update(req.params.id, req.body) }));
router.put('/:id', idempotent('updateAccount'), validate('updateAccount'), update);
router.patch('/:id', idempotent('patchAccount'), validate('updateAccount'), update);
router.delete('/:id', idempotent('deleteAccount'), execute((req, res) =>
  res.json({ account: service(req).deactivate(req.params.id) })));

module.exports = router;
