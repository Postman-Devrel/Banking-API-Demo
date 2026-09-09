/**
 * Run-scoped in-memory database.
 * Each demo run receives an independent copy of the canonical fixture.
 */

const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Dispute = require('../models/Dispute');
const { hashApiKey, safeEqualHash } = require('../security/credentials');
const crypto = require('crypto');
const { createBankingSeed, seedVersions } = require('@intergalactic/demo-fixtures');

const DEFAULT_RUN_ID = 'default';
const SEED_VERSION = seedVersions.banking;
const CUSTOMER_KEY = process.env.DEMO_CUSTOMER_API_KEY || '1234';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin-demo-key';

class Database {
  constructor() {
    this.runs = new Map();
    this.resetRun(DEFAULT_RUN_ID);
  }

  createEmptyRun() {
    return {
      accounts: new Map(),
      transactions: new Map(),
      disputes: new Map(),
      customers: new Map(),
      beneficiaries: new Map(),
      cards: new Map(),
      scheduledPayments: new Map(),
      standingOrders: new Map(),
      directDebits: new Map(),
      notificationPreferences: new Map(),
      auditEvents: [],
      principals: new Map(),
      credentials: new Map(),
      idempotency: new Map(),
      metadata: {
        counters: {},
        clock: Date.parse('2026-09-08T12:00:00.000Z'),
        lastAccessedAt: Date.now()
      }
    };
  }

  getRun(runId = DEFAULT_RUN_ID) {
    if (!this.runs.has(runId)) this.resetRun(runId);
    const state = this.runs.get(runId);
    state.metadata.lastAccessedAt = Date.now();
    return state;
  }

  resetRun(runId = DEFAULT_RUN_ID) {
    if (!this.runs.has(runId) && runId !== DEFAULT_RUN_ID) {
      this.cleanupRuns();
      const maxRuns = parseInt(process.env.MAX_DEMO_RUNS, 10) || 100;
      const count = Array.from(this.runs.keys()).filter(id => id !== DEFAULT_RUN_ID).length;
      if (count >= maxRuns) throw Object.assign(new Error('Maximum active demo runs reached'), { status: 503, name: 'runCapacityExceeded' });
    }
    const state = this.createEmptyRun();
    this.runs.set(runId, state);
    this.initializeSampleData(runId);
    return this.getRunSummary(runId);
  }

  nextId(runId, prefix) {
    const state = this.getRun(runId);
    const sequence = (state.metadata.counters[prefix] || 0) + 1;
    state.metadata.counters[prefix] = sequence;
    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  now(runId, advanceMs = 1000) {
    const state = this.getRun(runId);
    const value = new Date(state.metadata.clock).toISOString();
    state.metadata.clock += advanceMs;
    return value;
  }

  peekNow(runId) {
    return new Date(this.getRun(runId).metadata.clock).toISOString();
  }

  cleanupRuns() {
    const ttl = parseInt(process.env.DEMO_RUN_TTL_MS, 10) || 3600000;
    const now = Date.now();
    for (const [runId, state] of this.runs.entries()) {
      if (runId !== DEFAULT_RUN_ID && now - state.metadata.lastAccessedAt > ttl) this.runs.delete(runId);
    }
  }

  initializeSampleData(runId = DEFAULT_RUN_ID) {
    const state = this.runs.get(runId) || this.createEmptyRun();
    this.runs.set(runId, state);
    const seed = createBankingSeed();

    for (const principal of seed.principals) state.principals.set(principal.principalId, principal);
    state.credentials.set(hashApiKey(CUSTOMER_KEY), 'PRN-CUSTOMER-1');
    state.credentials.set(hashApiKey(ADMIN_KEY), 'PRN-ADMIN-1');

    for (const value of seed.accounts) state.accounts.set(value.accountId, new Account(
      value.accountId, value.owner, value.balance, value.currency, value.createdAt,
      value.accountType, value.ownerPrincipalId, false
    ));
    for (const value of seed.transactions) state.transactions.set(value.transactionId, new Transaction(
      value.transactionId, value.fromAccountId, value.toAccountId, value.amount,
      value.currency, value.createdAt, value
    ));
    for (const value of seed.customers) state.customers.set(value.customerId, value);
    for (const value of seed.beneficiaries) state.beneficiaries.set(value.beneficiaryId, value);
    for (const value of seed.cards) state.cards.set(value.cardId, value);
    for (const value of seed.scheduledPayments) state.scheduledPayments.set(value.paymentId, value);
    for (const value of seed.standingOrders) state.standingOrders.set(value.standingOrderId, value);
    for (const value of seed.directDebits) state.directDebits.set(value.directDebitId, value);
    for (const value of seed.notificationPreferences) state.notificationPreferences.set(value.ownerPrincipalId, value);
    for (const value of seed.disputes) {
      const dispute = new Dispute(value.disputeId, value.transactionId, value.reason, value.notes, value.createdByPrincipalId, value.createdAt);
      dispute.status = value.status;
      dispute.updatedAt = value.updatedAt;
      dispute.evidence = value.evidence.map(item => Object.freeze(item));
      state.disputes.set(value.disputeId, dispute);
    }
    state.auditEvents.push(...seed.auditEvents.map(value => Object.freeze(value)));
  }

  getRunSummary(runId = DEFAULT_RUN_ID) {
    const state = this.getRun(runId);
    return {
      runId,
      seedVersion: SEED_VERSION,
      accounts: state.accounts.size,
      transactions: state.transactions.size,
      disputes: state.disputes.size
    };
  }

  getAccounts(filters = {}, runId = DEFAULT_RUN_ID) {
    let accounts = Array.from(this.getRun(runId).accounts.values()).filter(account => !account.deleted);
    if (filters.principalId) accounts = accounts.filter(account => account.ownerPrincipalId === filters.principalId);
    if (filters.owner) accounts = accounts.filter(account => account.owner.toLowerCase().includes(filters.owner.toLowerCase()));
    if (filters.createdAt) accounts = accounts.filter(account => account.createdAt === filters.createdAt);
    return accounts;
  }

  getAccountById(accountId, runId = DEFAULT_RUN_ID) {
    return this.getRun(runId).accounts.get(accountId) || null;
  }

  createAccount(accountData, principalId, runId = DEFAULT_RUN_ID) {
    const accountId = this.nextId(runId, 'ACC');
    const account = new Account(
      accountId,
      accountData.owner,
      accountData.balance || 0,
      accountData.currency,
      this.now(runId).split('T')[0],
      accountData.accountType || 'STANDARD',
      principalId,
      false
    );
    this.getRun(runId).accounts.set(accountId, account);
    return account;
  }

  getTransactions(filters = {}, runId = DEFAULT_RUN_ID) {
    let transactions = Array.from(this.getRun(runId).transactions.values());
    if (filters.fromAccountId) transactions = transactions.filter(tx => tx.fromAccountId === filters.fromAccountId);
    if (filters.toAccountId) transactions = transactions.filter(tx => tx.toAccountId === filters.toAccountId);
    if (filters.createdAt) transactions = transactions.filter(tx => tx.createdAt.startsWith(filters.createdAt));
    if (filters.principalId) transactions = transactions.filter(tx => this.canAccessTransaction(tx, filters.principalId, runId));
    return transactions;
  }

  getTransactionById(transactionId, runId = DEFAULT_RUN_ID) {
    return this.getRun(runId).transactions.get(transactionId) || null;
  }

  canAccessTransaction(transaction, principalId, runId = DEFAULT_RUN_ID) {
    const fromAccount = transaction.fromAccountId === '0' ? null : this.getAccountById(transaction.fromAccountId, runId);
    const toAccount = this.getAccountById(transaction.toAccountId, runId);
    return fromAccount?.ownerPrincipalId === principalId || toAccount?.ownerPrincipalId === principalId;
  }

  canDisputeTransaction(transaction, principalId, runId = DEFAULT_RUN_ID) {
    if (transaction.fromAccountId === '0') return false;
    return this.getAccountById(transaction.fromAccountId, runId)?.ownerPrincipalId === principalId;
  }

  createTransaction(transactionData, runId = DEFAULT_RUN_ID) {
    const transactionId = this.nextId(runId, 'TX');
    const transaction = new Transaction(
      transactionId,
      transactionData.fromAccountId,
      transactionData.toAccountId,
      transactionData.amount,
      transactionData.currency,
      this.now(runId),
      transactionData
    );
    this.getRun(runId).transactions.set(transactionId, transaction);
    return transaction;
  }

  getDisputeById(disputeId, runId = DEFAULT_RUN_ID) {
    return this.getRun(runId).disputes.get(disputeId) || null;
  }

  createDispute(disputeData, principalId, runId = DEFAULT_RUN_ID) {
    const disputeId = this.nextId(runId, 'DSP');
    const dispute = new Dispute(disputeId, disputeData.transactionId, disputeData.reason, disputeData.notes, principalId, this.now(runId));
    this.getRun(runId).disputes.set(disputeId, dispute);
    return dispute;
  }

  generateApiKey(runId = DEFAULT_RUN_ID, principalData = {}) {
    const state = this.getRun(runId);
    const sequence = (state.metadata.counters.credentials || 0) + 1;
    state.metadata.counters.credentials = sequence;
    const principalId = `PRN-GENERATED-${sequence}`;
    const role = principalData.role;
    if (!['CUSTOMER', 'ADMIN'].includes(role)) throw Object.assign(new Error('role must be CUSTOMER or ADMIN'), { status: 400, name: 'validationError' });
    if (role === 'CUSTOMER' && !state.customers.has(principalData.customerId)) {
      throw Object.assign(new Error('customerId must identify an existing customer'), { status: 400, name: 'validationError' });
    }
    const secret = process.env.API_KEY_DERIVATION_SECRET || 'local-demo-derivation-secret';
    const material = `${runId}:${role}:${sequence}`;
    const apiKey = `igb_${crypto.createHmac('sha256', secret).update(material).digest('base64url').slice(0, 32)}`;
    const principal = {
      principalId,
      role,
      ...(role === 'CUSTOMER' ? { customerId: principalData.customerId } : {})
    };
    state.principals.set(principalId, principal);
    state.credentials.set(hashApiKey(apiKey), principalId);
    return { apiKey, principal: Object.assign({}, principal) };
  }

  authenticate(apiKey, runId = DEFAULT_RUN_ID) {
    if (typeof apiKey !== 'string' || apiKey.length === 0) return null;
    this.cleanupRuns();
    const credentialHash = hashApiKey(apiKey);
    if (!this.runs.has(runId)) {
      const isBootstrapCredential = [CUSTOMER_KEY, ADMIN_KEY]
        .map(hashApiKey)
        .includes(credentialHash);
      if (!isBootstrapCredential) return null;
      const maxRuns = parseInt(process.env.MAX_DEMO_RUNS, 10) || 100;
      const nonDefaultRuns = Array.from(this.runs.keys()).filter(id => id !== DEFAULT_RUN_ID).length;
      if (runId !== DEFAULT_RUN_ID && nonDefaultRuns >= maxRuns) return null;
      this.resetRun(runId);
    }
    const state = this.runs.get(runId);
    const storedHash = Array.from(state.credentials.keys()).find(value => safeEqualHash(value, credentialHash));
    const principalId = state.credentials.get(storedHash);
    const principal = state.principals.get(principalId);
    return principal ? Object.assign({}, principal) : null;
  }

}

Database.DEFAULT_RUN_ID = DEFAULT_RUN_ID;
Database.SEED_VERSION = SEED_VERSION;

module.exports = new Database();
