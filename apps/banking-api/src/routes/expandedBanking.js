const express = require('express');
const db = require('../database/db');
const { validateApiKey } = require('../middleware/auth');
const { validate } = require('../middleware/schemaValidation');
const idempotent = require('../middleware/mutationIdempotency');
const redactOwnership = require('../middleware/redactOwnership');
const {
  CustomerService, BeneficiaryService, CardService, PaymentService,
  StatementService, FxService, NotificationService, AuditService
} = require('../services/domainServices');

const router = express.Router();
router.use(validateApiKey);
router.use(redactOwnership);

const execute = handler => (req, res, next) => {
  try { return handler(req, res); } catch (error) { return next(error); }
};
const service = (Type, req, ...args) => new Type(db, req.runId, req.principal, ...args);
const respondList = (res, name, result) => res.json({ [name]: result.items, page: result.page });

router.get('/customers/me', execute((req, res) => res.json({ customer: service(CustomerService, req).get() })));
router.patch('/customers/me', idempotent('updateCurrentCustomer'), validate('updateCustomer'), execute((req, res) =>
  res.json({ customer: service(CustomerService, req).update(req.body) })));

router.get('/beneficiaries', execute((req, res) => respondList(res, 'beneficiaries', service(BeneficiaryService, req).list(req.query))));
router.post('/beneficiaries', idempotent('createBeneficiary'), validate('createBeneficiary'), execute((req, res) =>
  res.status(201).json({ beneficiary: service(BeneficiaryService, req).create(req.body) })));
router.get('/beneficiaries/:id', execute((req, res) => res.json({ beneficiary: service(BeneficiaryService, req).get(req.params.id) })));
router.patch('/beneficiaries/:id', idempotent('updateBeneficiary'), validate('updateBeneficiary'), execute((req, res) =>
  res.json({ beneficiary: service(BeneficiaryService, req).update(req.params.id, req.body) })));
router.delete('/beneficiaries/:id', idempotent('cancelBeneficiary'), execute((req, res) =>
  res.json({ beneficiary: service(BeneficiaryService, req).deactivate(req.params.id) })));

router.get('/cards', execute((req, res) => respondList(res, 'cards', service(CardService, req).list(req.query))));
router.post('/cards', idempotent('createCard'), validate('createCard'), execute((req, res) =>
  res.status(201).json({ card: service(CardService, req).create(req.body) })));
router.get('/cards/:id', execute((req, res) => res.json({ card: service(CardService, req).get(req.params.id) })));
router.post('/cards/:id/freeze', idempotent('freezeCard'), execute((req, res) => res.json({ card: service(CardService, req).freeze(req.params.id) })));
router.post('/cards/:id/unfreeze', idempotent('unfreezeCard'), execute((req, res) => res.json({ card: service(CardService, req).unfreeze(req.params.id) })));
router.patch('/cards/:id/limits', idempotent('updateCardLimit'), validate('cardLimit'), execute((req, res) =>
  res.json({ card: service(CardService, req).updateLimit(req.params.id, req.body) })));
router.post('/cards/:id/replace', idempotent('replaceCard'), execute((req, res) =>
  res.status(201).json({ card: service(CardService, req).replace(req.params.id) })));

const paymentDomains = [
  {
    path: 'scheduled-payments', response: 'scheduledPayments', schema: 'ScheduledPayment',
    config: { collection: 'scheduledPayments', idField: 'paymentId', label: 'Scheduled payment', prefix: 'PAY', initialStatus: 'SCHEDULED', mutable: ['amount', 'executeAt'] }
  },
  {
    path: 'standing-orders', response: 'standingOrders', schema: 'StandingOrder',
    config: { collection: 'standingOrders', idField: 'standingOrderId', label: 'Standing order', prefix: 'SO', initialStatus: 'ACTIVE', mutable: ['amount', 'frequency', 'nextExecutionAt'] }
  },
  {
    path: 'direct-debits', response: 'directDebits', schema: 'DirectDebit',
    config: { collection: 'directDebits', idField: 'directDebitId', label: 'Direct debit', prefix: 'DD', initialStatus: 'ACTIVE', mutable: ['amount'] }
  }
];

for (const domain of paymentDomains) {
  const make = req => service(PaymentService, req, domain.config);
  router.get(`/${domain.path}`, execute((req, res) => respondList(res, domain.response, make(req).list(req.query))));
  router.post(`/${domain.path}`, idempotent(`create${domain.schema}`), validate(`create${domain.schema}`), execute((req, res) =>
    res.status(201).json({ item: make(req).create(req.body) })));
  router.get(`/${domain.path}/:id`, execute((req, res) => res.json({ item: make(req).get(req.params.id) })));
  router.patch(`/${domain.path}/:id`, idempotent(`update${domain.schema}`), validate(`update${domain.schema}`), execute((req, res) =>
    res.json({ item: make(req).update(req.params.id, req.body) })));
  router.delete(`/${domain.path}/:id`, idempotent(`cancel${domain.schema}`), execute((req, res) =>
    res.json({ item: make(req).cancel(req.params.id) })));
}

router.get('/statements', execute((req, res) => {
  const result = service(StatementService, req).list(req.query);
  return res.json({ transactions: result.items, page: result.page });
}));
router.get('/statements/:accountId', execute((req, res) => {
  const result = service(StatementService, req).list(req.query, req.params.accountId);
  return res.json({ accountId: req.params.accountId, transactions: result.items, page: result.page });
}));
router.get('/fx/rates', execute((req, res) => res.json(service(FxService, req).rates(req.query.base || 'COSMIC_COINS'))));
router.post('/fx/quote', idempotent('createFxQuote'), validate('fxQuote'), execute((req, res) =>
  res.status(201).json({ quote: service(FxService, req).quote(req.body) })));
router.get('/notification-preferences', execute((req, res) => res.json({ preferences: service(NotificationService, req).get() })));
router.patch('/notification-preferences', idempotent('updateNotificationPreferences'), validate('notificationPreferences'), execute((req, res) =>
  res.json({ preferences: service(NotificationService, req).update(req.body) })));
router.get('/audit-events', execute((req, res) => respondList(res, 'events', service(AuditService, req).list(req.query))));

module.exports = router;
