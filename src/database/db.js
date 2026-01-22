/**
 * In-Memory Database
 * Stores accounts and transactions in memory
 * In production, this would be replaced with a real database (PostgreSQL, MongoDB, etc.)
 */

const { v4: uuidv4 } = require('uuid');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

class Database {
  constructor() {
    console.log('🔄 Initializing Database...');
    this.accounts = new Map();
    this.transactions = new Map();
    this.apiKeys = new Set(['1234']); // Default API key
    this.initializeSampleData();
    console.log(`✅ Database initialized - Accounts: ${this.accounts.size}, API Keys: ${this.apiKeys.size}`);
  }

  /**
   * Initialize with sample data for testing
   */
  initializeSampleData() {
    // Create sample accounts (owned by default API key '1234')
    const account1 = new Account('1', 'Nova Newman', 10000, 'COSMIC_COINS', '2023-04-10', 'STANDARD', '1234', false);
    const account2 = new Account('2', 'Gary Galaxy', 237, 'COSMIC_COINS', '2023-04-10', 'PREMIUM', '1234', false);
    const account3 = new Account('3', 'Luna Starlight', 5000, 'GALAXY_GOLD', '2024-01-10', 'BUSINESS', '1234', false);

    this.accounts.set('1', account1);
    this.accounts.set('2', account2);
    this.accounts.set('3', account3);

    // Create sample transactions
    const transaction1 = new Transaction('1', '1', '2', 10000, 'COSMIC_COINS', '2024-01-10');
    this.transactions.set('1', transaction1);
  }

  // ============ Account Operations ============

  /**
   * Get all accounts with optional filters
   * @param {Object} filters - Optional filters (owner, createdAt, apiKey)
   * @returns {Array<Account>}
   */
  getAccounts(filters = {}) {
    let accounts = Array.from(this.accounts.values());

    // Exclude deleted accounts
    accounts = accounts.filter(acc => !acc.deleted);

    // Filter by API key for ownership
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

  /**
   * Get account by ID
   * @param {string} accountId
   * @returns {Account|null}
   */
  getAccountById(accountId) {
    return this.accounts.get(accountId) || null;
  }

  /**
   * Create new account
   * @param {Object} accountData
   * @param {string} apiKey - API key of the creator
   * @returns {Account}
   */
  createAccount(accountData, apiKey) {
    const accountId = uuidv4().split('-')[0]; // Generate short UUID
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
    console.log(`✓ Account created: ${accountId} - Total accounts: ${this.accounts.size}`);
    return account;
  }

  /**
   * Update account
   * @param {string} accountId
   * @param {Object} updates
   * @returns {Account|null}
   */
  updateAccount(accountId, updates) {
    const account = this.accounts.get(accountId);
    if (!account || account.deleted) {
      return null;
    }

    if (updates.owner) {
      account.owner = updates.owner;
    }

    if (updates.currency) {
      account.currency = updates.currency;
    }

    if (updates.accountType) {
      account.accountType = updates.accountType;
    }

    return account;
  }

  /**
   * Delete account (soft delete)
   * @param {string} accountId
   * @returns {boolean}
   */
  deleteAccount(accountId) {
    const account = this.accounts.get(accountId);
    if (!account || account.deleted) {
      return false;
    }
    account.deleted = true;
    console.log(`✓ Account soft deleted: ${accountId}`);
    return true;
  }

  // ============ Transaction Operations ============

  /**
   * Get all transactions with optional filters
   * @param {Object} filters - Optional filters (fromAccountId, toAccountId, createdAt)
   * @returns {Array<Transaction>}
   */
  getTransactions(filters = {}) {
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

  /**
   * Get transaction by ID
   * @param {string} transactionId
   * @returns {Transaction|null}
   */
  getTransactionById(transactionId) {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Check if account has any transactions
   * @param {string} accountId
   * @returns {boolean}
   */
  accountHasTransactions(accountId) {
    const transactions = Array.from(this.transactions.values());
    return transactions.some(tx =>
      tx.fromAccountId === accountId || tx.toAccountId === accountId
    );
  }

  /**
   * Create new transaction
   * @param {Object} transactionData
   * @returns {Transaction}
   */
  createTransaction(transactionData) {
    const transactionId = uuidv4().split('-')[0]; // Generate short UUID
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

  // ============ API Key Operations ============

  /**
   * Generate new API key
   * @returns {string}
   */
  generateApiKey() {
    const apiKey = uuidv4().replace(/-/g, '').substring(0, 16);
    this.apiKeys.add(apiKey);
    console.log(`✓ API Key generated: ${apiKey} - Total keys: ${this.apiKeys.size}`);
    return apiKey;
  }

  /**
   * Add an API key to the database
   * @param {string} apiKey
   */
  addApiKey(apiKey) {
    this.apiKeys.add(apiKey);
    console.log(`✓ API Key registered: ${apiKey} - Total keys: ${this.apiKeys.size}`);
  }

  /**
   * Validate API key
   * @param {string} apiKey
   * @returns {boolean}
   */
  validateApiKey(apiKey) {
    return this.apiKeys.has(apiKey);
  }
}

// Export singleton instance
module.exports = new Database();

