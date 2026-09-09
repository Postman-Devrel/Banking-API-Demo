const pick = (source, fields) => fields.reduce((result, field) => {
  if (source[field] !== undefined) result[field] = source[field];
  return result;
}, {});

const account = value => value.toJSON();
const customer = value => pick(value, ['customerId', 'name', 'email', 'phone', 'address', 'kycStatus']);
const beneficiary = value => pick(value, ['beneficiaryId', 'name', 'accountId', 'externalAccount', 'status', 'createdAt']);
const card = value => pick(value, ['cardId', 'accountId', 'type', 'last4', 'status', 'spendingLimit', 'currency', 'replacedByCardId']);
const payment = value => pick(value, ['paymentId', 'standingOrderId', 'directDebitId', 'fromAccountId', 'accountId', 'beneficiaryId', 'merchant', 'mandateReference', 'amount', 'currency', 'executeAt', 'nextExecutionAt', 'frequency', 'status']);
const dispute = value => pick(value, ['disputeId', 'transactionId', 'reason', 'notes', 'status', 'createdAt']);
const auditEvent = value => pick(value, ['eventId', 'actorPrincipalId', 'action', 'resourceType', 'resourceId', 'createdAt']);
const preferences = value => pick(value, ['transactionAlerts', 'fraudAlerts', 'marketing', 'channels']);

module.exports = { account, customer, beneficiary, card, payment, dispute, auditEvent, preferences };
