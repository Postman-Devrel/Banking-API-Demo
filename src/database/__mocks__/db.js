/**
 * In-Memory Mock Database for Tests
 * Mirrors the PostgreSQL db.js interface but uses Maps for test isolation
 */

const { v4: uuidv4 } = require('uuid');
const Account = require('../../models/Account');
const Transaction = require('../../models/Transaction');

class MockDatabase {
  constructor() {
    this.accounts = new Map();
    this.transactions = new Map();
    this.apiKeys = new Set(['1234']);
    this.initializeSampleData();
  }

  initializeSampleData() {
    const account1 = new Account('1', 'Nova Newman', 10000, 'COSMIC_COINS', '2023-04-10', 'STANDARD', '1234', false);
    const account2 = new Account('2', 'Gary Galaxy', 237, 'COSMIC_COINS', '2023-04-10', 'PREMIUM', '1234', false);
    const account3 = new Account('3', 'Luna Starlight', 5000, 'GALAXY_GOLD', '2024-01-10', 'BUSINESS', '1234', false);

    this.accounts.set('1', account1);
    this.accounts.set('2', account2);
    this.accounts.set('3', account3);

    const transaction1 = new Transaction('1', '1', '2', 10000, 'COSMIC_COINS', '2024-01-10');
    this.transactions.set('1', transaction1);
  }

  async getAccounts(filters = {}) {
    let accounts = Array.from(this.accounts.values());
    accounts = accounts.filter(acc => !acc.deleted);

    if (filters.apiKey) {
      accounts = accounts.filter(acc => acc.apiKey === filters.apiKey);
    }
    if (filters.owner) {
      accounts = accounts.filter(acc => acc.owner.toLowerCase().includes(filters.owner.toLowerCase()));
    }
    if (filters.createdAt) {
      accounts = accounts.filter(acc => acc.createdAt === filters.createdAt);
    }

    return accounts;
  }

  async getAccountById(accountId) {
    return this.accounts.get(accountId) || null;
  }

  async createAccount(accountData, apiKey) {
    const accountId = uuidv4().split('-')[0];
    const account = new Account(
      accountId,
      accountData.owner,
      accountData.balance || 0,
      accountData.currency,
      new Date().toISOString().split('T')[0],
      accountData.accountType || 'STANDARD',
      apiKey,
      false
    );
    this.accounts.set(accountId, account);
    return account;
  }

  async updateAccount(accountId, updates) {
    const account = this.accounts.get(accountId);
    if (!account || account.deleted) return null;

    if (updates.owner) account.owner = updates.owner;
    if (updates.currency) account.currency = updates.currency;
    if (updates.accountType) account.accountType = updates.accountType;

    return account;
  }

  async deleteAccount(accountId) {
    const account = this.accounts.get(accountId);
    if (!account || account.deleted) return false;
    account.deleted = true;
    return true;
  }

  async getTransactions(filters = {}) {
    let transactions = Array.from(this.transactions.values());

    if (filters.fromAccountId) {
      transactions = transactions.filter(tx => tx.fromAccountId === filters.fromAccountId);
    }
    if (filters.toAccountId) {
      transactions = transactions.filter(tx => tx.toAccountId === filters.toAccountId);
    }
    if (filters.createdAt) {
      transactions = transactions.filter(tx => tx.createdAt === filters.createdAt);
    }

    return transactions;
  }

  async getTransactionById(transactionId) {
    return this.transactions.get(transactionId) || null;
  }

  async accountHasTransactions(accountId) {
    const transactions = Array.from(this.transactions.values());
    return transactions.some(tx =>
      tx.fromAccountId === accountId || tx.toAccountId === accountId
    );
  }

  async createTransaction(transactionData) {
    const transactionId = uuidv4().split('-')[0];

    // Handle balance updates (mirrors atomic SQL behavior)
    if (transactionData.fromAccountId !== '0') {
      const fromAccount = this.accounts.get(transactionData.fromAccountId);
      if (fromAccount) fromAccount.updateBalance(-transactionData.amount);
    }

    const toAccount = this.accounts.get(transactionData.toAccountId);
    if (toAccount) toAccount.updateBalance(transactionData.amount);

    const transaction = new Transaction(
      transactionId,
      transactionData.fromAccountId,
      transactionData.toAccountId,
      transactionData.amount,
      transactionData.currency,
      new Date().toISOString().split('T')[0]
    );
    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  async generateApiKey() {
    const apiKey = uuidv4().replace(/-/g, '').substring(0, 16);
    this.apiKeys.add(apiKey);
    return apiKey;
  }

  async addApiKey(apiKey) {
    this.apiKeys.add(apiKey);
  }

  async validateApiKey(apiKey) {
    return this.apiKeys.has(apiKey);
  }
}

module.exports = new MockDatabase();
