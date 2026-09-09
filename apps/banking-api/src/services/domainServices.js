const dto = require('./dto');
const { paginate } = require('./pagination');
const { DomainRepositories } = require('../repositories/domainRepositories');

class DomainError extends Error {
  constructor(status, name, message) {
    super(message);
    this.status = status;
    this.name = name;
  }
}

class BaseService {
  constructor(db, runId, principal) {
    this.db = db;
    this.runId = runId;
    this.principal = principal;
    this.state = db.getRun(runId);
    this.repositories = new DomainRepositories(this.state);
  }

  owned(item) {
    return item && item.ownerPrincipalId === this.principal.principalId;
  }

  account(accountId) {
    const account = this.repositories.accounts.get(accountId);
    if (!account || account.deleted || account.status !== 'ACTIVE' || !this.owned(account)) throw new DomainError(404, 'notFoundError', 'Active account not found');
    return account;
  }

  beneficiary(beneficiaryId) {
    const value = this.repositories.beneficiaries.get(beneficiaryId);
    if (!this.owned(value) || value.status !== 'TRUSTED') throw new DomainError(400, 'validationError', 'A trusted beneficiary is required');
    return value;
  }

  audit(action, resourceType, resourceId) {
    const event = {
      eventId: this.db.nextId(this.runId, 'AUD'),
      actorPrincipalId: this.principal.principalId,
      action,
      resourceType,
      resourceId,
      createdAt: this.db.now(this.runId)
    };
    Object.freeze(event);
    this.repositories.auditEvents.append(event);
    return event;
  }

  list(collection, query, idField, mapper) {
    const values = this.repositories[collection].list().filter(item => this.owned(item));
    const page = paginate(values, query, idField, collection);
    return { items: page.items.map(mapper), page: page.page };
  }

  find(collection, id, label) {
    const value = this.repositories[collection].get(id);
    if (!this.owned(value)) throw new DomainError(404, 'notFoundError', `${label} not found`);
    return value;
  }
}

class AccountService extends BaseService {
  list(query) {
    let values = this.repositories.accounts.list().filter(value => this.owned(value) && !value.deleted);
    if (query.owner) values = values.filter(value => value.owner.toLowerCase().includes(query.owner.toLowerCase()));
    if (query.createdAt) values = values.filter(value => value.createdAt === query.createdAt);
    const page = paginate(values, query, 'accountId', 'accounts');
    return { items: page.items.map(dto.account), page: page.page };
  }
  get(id) { return dto.account(this.account(id)); }
  create(input) {
    const value = this.db.createAccount(input, this.principal.principalId, this.runId);
    this.audit('ACCOUNT_CREATED', 'account', value.accountId);
    return dto.account(value);
  }
  update(id, input) {
    const value = this.account(id);
    if (input.owner !== undefined) value.owner = input.owner;
    if (input.accountType !== undefined) value.accountType = input.accountType;
    this.repositories.accounts.save(id, value);
    this.audit('ACCOUNT_UPDATED', 'account', id);
    return dto.account(value);
  }
  deactivate(id) {
    const value = this.account(id);
    if (value.balance !== 0) throw new DomainError(409, 'accountNotEmpty', 'An account with a non-zero balance cannot be deactivated');
    value.deleted = true;
    value.status = 'INACTIVE';
    this.repositories.accounts.save(id, value);
    this.audit('ACCOUNT_DEACTIVATED', 'account', id);
    return dto.account(value);
  }
}

class TransactionService extends BaseService {
  list(query) {
    let values = this.db.getTransactions({ principalId: this.principal.principalId }, this.runId);
    for (const field of ['fromAccountId', 'toAccountId']) if (query[field]) values = values.filter(tx => tx[field] === query[field]);
    if (query.createdAt) values = values.filter(tx => tx.createdAt.startsWith(query.createdAt));
    const page = paginate(values, query, 'transactionId', 'transactions');
    return { items: page.items.map(tx => tx.toJSON()), page: page.page };
  }
  get(id) {
    const value = this.repositories.transactions.get(id);
    if (!value) throw new DomainError(404, 'notFoundError', 'Transaction not found');
    if (!this.db.canAccessTransaction(value, this.principal.principalId, this.runId)) throw new DomainError(403, 'forbiddenError', 'You do not have permission to access this transaction');
    return value.toJSON();
  }
  create(input) {
    const destination = this.repositories.accounts.get(input.toAccountId);
    if (!destination || destination.deleted || destination.status !== 'ACTIVE') throw new DomainError(404, 'notFoundError', 'Active destination account not found');
    if (destination.currency !== input.currency) throw new DomainError(400, 'validationError', 'Transaction currency must match both accounts');
    let source = null;
    if (input.fromAccountId === '0') {
      if (!this.owned(destination)) throw new DomainError(403, 'forbiddenError', 'You may only deposit into your own account');
    } else {
      source = this.repositories.accounts.get(input.fromAccountId);
      if (!source || source.deleted || source.status !== 'ACTIVE') throw new DomainError(404, 'notFoundError', 'Active source account not found');
      if (!this.owned(source)) throw new DomainError(403, 'forbiddenError', 'You may only transfer from your own account');
      if (source.currency !== input.currency) throw new DomainError(400, 'validationError', 'Transaction currency must match both accounts');
      if (source.balance < input.amount) throw new DomainError(409, 'txInsufficientFunds', 'Not enough funds in source account');
    }

    const value = this.db.createTransaction(input, this.runId);
    if (source) source.updateBalance(-input.amount);
    destination.updateBalance(input.amount);
    if (source) this.repositories.accounts.save(source.accountId, source);
    this.repositories.accounts.save(destination.accountId, destination);
    this.audit('TRANSACTION_POSTED', 'transaction', value.transactionId);
    return value.toJSON();
  }
}

class CustomerService extends BaseService {
  get() {
    const value = this.repositories.customers.get(this.principal.customerId);
    if (!this.owned(value)) throw new DomainError(404, 'notFoundError', 'Customer not found');
    return dto.customer(value);
  }

  update(input) {
    const value = this.repositories.customers.get(this.principal.customerId);
    for (const field of ['email', 'phone', 'address']) if (input[field] !== undefined) value[field] = input[field];
    this.repositories.customers.save(value.customerId, value);
    this.audit('CUSTOMER_UPDATED', 'customer', value.customerId);
    return dto.customer(value);
  }
}

class BeneficiaryService extends BaseService {
  list(query) { return super.list('beneficiaries', query, 'beneficiaryId', dto.beneficiary); }
  get(id) { return dto.beneficiary(this.find('beneficiaries', id, 'Beneficiary')); }
  create(input) {
    if (input.accountId && !this.repositories.accounts.has(input.accountId)) throw new DomainError(400, 'validationError', 'Destination account does not exist');
    const beneficiaryId = this.db.nextId(this.runId, 'BEN');
    const value = {
      beneficiaryId, ownerPrincipalId: this.principal.principalId, name: input.name,
      accountId: input.accountId, externalAccount: input.externalAccount,
      status: 'PENDING_VERIFICATION', createdAt: this.db.now(this.runId)
    };
    this.repositories.beneficiaries.save(beneficiaryId, value);
    this.audit('BENEFICIARY_CREATED', 'beneficiary', beneficiaryId);
    return dto.beneficiary(value);
  }
  update(id, input) {
    const value = this.principal.role === 'ADMIN' ? this.repositories.beneficiaries.get(id) : this.find('beneficiaries', id, 'Beneficiary');
    if (!value) throw new DomainError(404, 'notFoundError', 'Beneficiary not found');
    if (value.status === 'INACTIVE') throw new DomainError(409, 'invalidState', 'Inactive beneficiary cannot be updated');
    if (input.name !== undefined) value.name = input.name;
    if (input.status !== undefined) {
      if (this.principal.role !== 'ADMIN') throw new DomainError(403, 'forbiddenError', 'Only administrators may change beneficiary trust');
      const allowed = value.status === 'PENDING_VERIFICATION' ? ['TRUSTED', 'INACTIVE'] : ['INACTIVE'];
      if (!allowed.includes(input.status)) throw new DomainError(409, 'invalidState', `Beneficiary cannot transition from ${value.status} to ${input.status}`);
      value.status = input.status;
    }
    this.repositories.beneficiaries.save(id, value);
    this.audit('BENEFICIARY_UPDATED', 'beneficiary', id);
    return dto.beneficiary(value);
  }
  deactivate(id) {
    const value = this.find('beneficiaries', id, 'Beneficiary');
    value.status = 'INACTIVE';
    this.repositories.beneficiaries.save(id, value);
    this.audit('BENEFICIARY_DEACTIVATED', 'beneficiary', id);
    return dto.beneficiary(value);
  }
}

class CardService extends BaseService {
  list(query) { return super.list('cards', query, 'cardId', dto.card); }
  get(id) { return dto.card(this.find('cards', id, 'Card')); }
  create(input) {
    const account = this.account(input.accountId);
    if (account.currency !== input.currency) throw new DomainError(400, 'validationError', 'Card currency must match account currency');
    const cardId = this.db.nextId(this.runId, 'CARD');
    const sequence = this.state.metadata.counters.CARD;
    const value = {
      cardId, ownerPrincipalId: this.principal.principalId, accountId: input.accountId,
      type: input.type, last4: String(1000 + sequence).slice(-4), status: 'ACTIVE',
      spendingLimit: input.spendingLimit, currency: input.currency
    };
    this.repositories.cards.save(cardId, value);
    this.audit('CARD_CREATED', 'card', cardId);
    return dto.card(value);
  }
  transition(id, expected, next, action) {
    const card = this.find('cards', id, 'Card');
    if (!expected.includes(card.status)) throw new DomainError(409, 'invalidState', `Card cannot transition from ${card.status} to ${next}`);
    card.status = next;
    this.repositories.cards.save(id, card);
    this.audit(action, 'card', id);
    return dto.card(card);
  }
  freeze(id) { return this.transition(id, ['ACTIVE'], 'FROZEN', 'CARD_FROZEN'); }
  unfreeze(id) { return this.transition(id, ['FROZEN'], 'ACTIVE', 'CARD_UNFROZEN'); }
  updateLimit(id, input) {
    const card = this.find('cards', id, 'Card');
    if (card.status === 'REPLACED') throw new DomainError(409, 'invalidState', 'Replaced card cannot be updated');
    card.spendingLimit = input.spendingLimit;
    this.repositories.cards.save(id, card);
    this.audit('CARD_LIMIT_UPDATED', 'card', id);
    return dto.card(card);
  }
  replace(id) {
    const oldCard = this.find('cards', id, 'Card');
    if (!['ACTIVE', 'FROZEN'].includes(oldCard.status)) throw new DomainError(409, 'invalidState', 'Card cannot be replaced');
    const cardId = this.db.nextId(this.runId, 'CARD');
    const replacement = Object.assign({}, oldCard, {
      cardId, last4: String(1000 + this.state.metadata.counters.CARD).slice(-4), status: 'ACTIVE'
    });
    oldCard.status = 'REPLACED';
    oldCard.replacedByCardId = cardId;
    this.repositories.cards.save(id, oldCard);
    this.repositories.cards.save(cardId, replacement);
    this.audit('CARD_REPLACED', 'card', id);
    return dto.card(replacement);
  }
}

class PaymentService extends BaseService {
  constructor(db, runId, principal, config) {
    super(db, runId, principal);
    this.config = config;
  }
  list(query) { return super.list(this.config.collection, query, this.config.idField, dto.payment); }
  get(id) { return dto.payment(this.find(this.config.collection, id, this.config.label)); }
  validate(input) {
    const accountId = input.fromAccountId || input.accountId;
    const account = this.account(accountId);
    if (account.currency !== input.currency && input.currency !== undefined) throw new DomainError(400, 'validationError', 'Payment currency must match account currency');
    if (input.beneficiaryId) this.beneficiary(input.beneficiaryId);
    const execution = input.executeAt || input.nextExecutionAt;
    if (execution && execution <= this.db.peekNow(this.runId)) throw new DomainError(400, 'validationError', 'Execution time must be in the future');
  }
  create(input) {
    this.validate(input);
    const resourceId = this.db.nextId(this.runId, this.config.prefix);
    const value = Object.assign({}, input, {
      [this.config.idField]: resourceId,
      ownerPrincipalId: this.principal.principalId,
      status: this.config.initialStatus
    });
    this.repositories[this.config.collection].save(resourceId, value);
    this.audit(`${this.config.prefix}_CREATED`, this.config.collection, resourceId);
    return dto.payment(value);
  }
  update(id, input) {
    const value = this.find(this.config.collection, id, this.config.label);
    if (!['ACTIVE', 'SCHEDULED', 'PAUSED'].includes(value.status)) throw new DomainError(409, 'invalidState', 'Cancelled instruction cannot be updated');
    this.validate(Object.assign({}, value, input));
    for (const field of this.config.mutable) if (input[field] !== undefined) value[field] = input[field];
    this.repositories[this.config.collection].save(id, value);
    this.audit(`${this.config.prefix}_UPDATED`, this.config.collection, id);
    return dto.payment(value);
  }
  cancel(id) {
    const value = this.find(this.config.collection, id, this.config.label);
    if (value.status === 'CANCELLED') throw new DomainError(409, 'invalidState', 'Instruction is already cancelled');
    value.status = 'CANCELLED';
    this.repositories[this.config.collection].save(id, value);
    this.audit(`${this.config.prefix}_CANCELLED`, this.config.collection, id);
    return dto.payment(value);
  }
}

class StatementService extends BaseService {
  list(query, accountId) {
    if (accountId) this.account(accountId);
    const values = this.db.getTransactions({ principalId: this.principal.principalId }, this.runId)
      .filter(tx => !accountId || tx.fromAccountId === accountId || tx.toAccountId === accountId)
      .map(tx => tx.toJSON());
    return paginate(values, query, 'transactionId', accountId ? `statement:${accountId}` : 'statements');
  }
}

class FxService extends BaseService {
  rates(base) {
    const table = { COSMIC_COINS: [1, 1], GALAXY_GOLD: [4, 5], MOON_BUCKS: [5, 4] };
    if (!table[base]) throw new DomainError(400, 'validationError', 'Unsupported base currency');
    const rates = {};
    for (const currency of Object.keys(table)) {
      rates[currency] = (table[currency][0] * table[base][1]) / (table[currency][1] * table[base][0]);
    }
    return { base, rates };
  }
  quote(input) {
    const table = { COSMIC_COINS: [1, 1], GALAXY_GOLD: [4, 5], MOON_BUCKS: [5, 4] };
    const from = table[input.from]; const to = table[input.to];
    const numerator = input.amount * to[0] * from[1];
    const denominator = to[1] * from[0];
    return {
      quoteId: this.db.nextId(this.runId, 'FX'), from: input.from, to: input.to,
      amount: input.amount, convertedAmount: Math.floor(numerator / denominator),
      rounding: 'FLOOR', expiresAt: new Date(Date.parse(this.db.peekNow(this.runId)) + 60000).toISOString()
    };
  }
}

class NotificationService extends BaseService {
  get() { return dto.preferences(this.repositories.notificationPreferences.get(this.principal.principalId)); }
  update(input) {
    const value = this.repositories.notificationPreferences.get(this.principal.principalId);
    for (const field of ['transactionAlerts', 'fraudAlerts', 'marketing', 'channels']) if (input[field] !== undefined) value[field] = input[field];
    this.repositories.notificationPreferences.save(this.principal.principalId, value);
    this.audit('NOTIFICATIONS_UPDATED', 'customer', this.principal.customerId);
    return dto.preferences(value);
  }
}

class AuditService extends BaseService {
  list(query) {
    const values = this.repositories.auditEvents.list().filter(event =>
      this.principal.role === 'ADMIN' || event.actorPrincipalId === this.principal.principalId);
    const page = paginate(values, query, 'eventId', 'audit-events');
    return { items: page.items.map(dto.auditEvent), page: page.page };
  }
}

class DisputeService extends BaseService {
  visible(value) {
    const tx = value && this.repositories.transactions.get(value.transactionId);
    return tx && (this.principal.role === 'ADMIN' || this.db.canAccessTransaction(tx, this.principal.principalId, this.runId));
  }
  list(query) {
    let values = this.repositories.disputes.list().filter(value => this.visible(value));
    if (query.transactionId) values = values.filter(value => value.transactionId === query.transactionId);
    const page = paginate(values, query, 'disputeId', 'disputes');
    return { items: page.items.map(dto.dispute), page: page.page };
  }
  findVisible(id) {
    const value = this.repositories.disputes.get(id);
    if (!this.visible(value)) throw new DomainError(404, 'notFoundError', 'Dispute not found');
    return value;
  }
  get(id) { return dto.dispute(this.findVisible(id)); }
  create(input) {
    const tx = this.repositories.transactions.get(input.transactionId);
    if (!tx) throw new DomainError(404, 'notFoundError', 'Transaction not found');
    if (!this.db.canDisputeTransaction(tx, this.principal.principalId, this.runId)) throw new DomainError(403, 'forbiddenError', 'Only the source-account owner may dispute this transaction');
    const active = this.repositories.disputes.list().find(value => value.transactionId === input.transactionId && !['RESOLVED', 'REJECTED'].includes(value.status));
    if (active) throw new DomainError(409, 'duplicateDispute', 'An active dispute already exists for this transaction');
    return dto.dispute(this.db.createDispute(input, this.principal.principalId, this.runId));
  }
  transition(id, input) {
    const value = this.findVisible(id);
    const transitions = { OPEN: ['UNDER_REVIEW'], UNDER_REVIEW: ['RESOLVED', 'REJECTED'] };
    if (!(transitions[value.status] || []).includes(input.status)) throw new DomainError(409, 'invalidState', `Dispute cannot transition from ${value.status} to ${input.status}`);
    value.status = input.status;
    value.updatedAt = this.db.now(this.runId);
    this.repositories.disputes.save(id, value);
    this.audit('DISPUTE_STATUS_UPDATED', 'dispute', id);
    return dto.dispute(value);
  }
  listEvidence(id, query) {
    const value = this.findVisible(id);
    const page = paginate(value.evidence || [], query, 'evidenceId', `dispute-evidence:${id}`);
    return { items: page.items.map(item => Object.assign({}, item)), page: page.page };
  }
  addEvidence(id, input) {
    const value = this.findVisible(id);
    if (this.principal.role !== 'ADMIN' && value.createdByPrincipalId !== this.principal.principalId) throw new DomainError(403, 'forbiddenError', 'You cannot add evidence to this dispute');
    if (['RESOLVED', 'REJECTED'].includes(value.status)) throw new DomainError(409, 'invalidState', 'Evidence cannot be added to a closed dispute');
    const evidence = {
      evidenceId: this.db.nextId(this.runId, 'EVD'), type: input.type,
      description: input.description, createdAt: this.db.now(this.runId)
    };
    value.evidence = value.evidence || [];
    value.evidence.push(Object.freeze(evidence));
    this.repositories.disputes.save(id, value);
    this.audit('DISPUTE_EVIDENCE_ADDED', 'dispute', id);
    return Object.assign({}, evidence);
  }
}

module.exports = {
  DomainError, AccountService, TransactionService, CustomerService, BeneficiaryService,
  CardService, PaymentService, StatementService, FxService, NotificationService,
  AuditService, DisputeService
};
