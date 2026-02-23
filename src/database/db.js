/**
 * PostgreSQL Database
 * Stores accounts and transactions in PostgreSQL via pg pool
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

class Database {
  constructor() {
    console.log('Initializing PostgreSQL Database...');
    this.pool = null;
  }

  /**
   * Initialize database: create tables and seed if empty
   */
  async initialize() {
    this.pool = require('./pool');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await this.pool.query(schema);
    console.log('Database schema initialized');

    const { rows } = await this.pool.query('SELECT COUNT(*) FROM accounts');
    if (parseInt(rows[0].count) === 0) {
      await this.initializeSampleData();
    }

    const accountCount = await this.pool.query('SELECT COUNT(*) FROM accounts');
    const keyCount = await this.pool.query('SELECT COUNT(*) FROM api_keys');
    console.log(`Database ready - Accounts: ${accountCount.rows[0].count}, API Keys: ${keyCount.rows[0].count}`);
  }

  _rowToAccount(row) {
    return new Account(
      row.account_id,
      row.owner,
      parseFloat(row.balance),
      row.currency,
      row.created_at,
      row.account_type,
      row.api_key,
      row.deleted
    );
  }

  _rowToTransaction(row) {
    return new Transaction(
      row.transaction_id,
      row.from_account_id,
      row.to_account_id,
      parseFloat(row.amount),
      row.currency,
      row.created_at
    );
  }

  // ============ Account Operations ============

  async getAccounts(filters = {}) {
    let query = 'SELECT * FROM accounts WHERE deleted = FALSE';
    const params = [];
    let i = 1;

    if (filters.apiKey) {
      query += ` AND api_key = $${i++}`;
      params.push(filters.apiKey);
    }
    if (filters.owner) {
      query += ` AND owner ILIKE $${i++}`;
      params.push(`%${filters.owner}%`);
    }
    if (filters.createdAt) {
      query += ` AND created_at = $${i++}`;
      params.push(filters.createdAt);
    }

    const { rows } = await this.pool.query(query, params);
    return rows.map(row => this._rowToAccount(row));
  }

  async getAccountById(accountId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM accounts WHERE account_id = $1',
      [accountId]
    );
    if (rows.length === 0) return null;
    return this._rowToAccount(rows[0]);
  }

  async createAccount(accountData, apiKey) {
    const accountId = uuidv4().split('-')[0];
    const createdAt = new Date().toISOString().split('T')[0];
    const balance = accountData.balance || 0;
    const accountType = accountData.accountType || 'STANDARD';

    await this.pool.query(
      `INSERT INTO accounts (account_id, owner, balance, currency, created_at, account_type, api_key, deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
      [accountId, accountData.owner, balance, accountData.currency, createdAt, accountType, apiKey]
    );

    console.log(`Account created: ${accountId}`);
    return new Account(accountId, accountData.owner, balance, accountData.currency, createdAt, accountType, apiKey, false);
  }

  async updateAccount(accountId, updates) {
    const setClauses = [];
    const params = [];
    let i = 1;

    if (updates.owner) {
      setClauses.push(`owner = $${i++}`);
      params.push(updates.owner);
    }
    if (updates.currency) {
      setClauses.push(`currency = $${i++}`);
      params.push(updates.currency);
    }
    if (updates.accountType) {
      setClauses.push(`account_type = $${i++}`);
      params.push(updates.accountType);
    }

    if (setClauses.length === 0) return await this.getAccountById(accountId);

    params.push(accountId);
    await this.pool.query(
      `UPDATE accounts SET ${setClauses.join(', ')} WHERE account_id = $${i} AND deleted = FALSE`,
      params
    );

    return await this.getAccountById(accountId);
  }

  async deleteAccount(accountId) {
    const result = await this.pool.query(
      'UPDATE accounts SET deleted = TRUE WHERE account_id = $1 AND deleted = FALSE',
      [accountId]
    );
    if (result.rowCount === 0) return false;
    console.log(`Account soft deleted: ${accountId}`);
    return true;
  }

  // ============ Transaction Operations ============

  async getTransactions(filters = {}) {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    let i = 1;

    if (filters.fromAccountId) {
      query += ` AND from_account_id = $${i++}`;
      params.push(filters.fromAccountId);
    }
    if (filters.toAccountId) {
      query += ` AND to_account_id = $${i++}`;
      params.push(filters.toAccountId);
    }
    if (filters.createdAt) {
      query += ` AND created_at = $${i++}`;
      params.push(filters.createdAt);
    }

    const { rows } = await this.pool.query(query, params);
    return rows.map(row => this._rowToTransaction(row));
  }

  async getTransactionById(transactionId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [transactionId]
    );
    if (rows.length === 0) return null;
    return this._rowToTransaction(rows[0]);
  }

  async accountHasTransactions(accountId) {
    const { rows } = await this.pool.query(
      'SELECT EXISTS(SELECT 1 FROM transactions WHERE from_account_id = $1 OR to_account_id = $1) AS has_tx',
      [accountId]
    );
    return rows[0].has_tx;
  }

  async createTransaction(transactionData) {
    const transactionId = uuidv4().split('-')[0];
    const createdAt = new Date().toISOString().split('T')[0];

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Deduct from source (if not a deposit)
      if (transactionData.fromAccountId !== '0') {
        await client.query(
          'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2',
          [transactionData.amount, transactionData.fromAccountId]
        );
      }

      // Add to destination
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2',
        [transactionData.amount, transactionData.toAccountId]
      );

      // Insert transaction record
      await client.query(
        `INSERT INTO transactions (transaction_id, from_account_id, to_account_id, amount, currency, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [transactionId, transactionData.fromAccountId, transactionData.toAccountId,
          transactionData.amount, transactionData.currency, createdAt]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return new Transaction(
      transactionId, transactionData.fromAccountId, transactionData.toAccountId,
      transactionData.amount, transactionData.currency, createdAt
    );
  }

  // ============ API Key Operations ============

  async generateApiKey() {
    const apiKey = uuidv4().replace(/-/g, '').substring(0, 16);
    await this.pool.query(
      'INSERT INTO api_keys (key) VALUES ($1) ON CONFLICT (key) DO NOTHING',
      [apiKey]
    );
    console.log(`API Key generated: ${apiKey}`);
    return apiKey;
  }

  async addApiKey(apiKey) {
    await this.pool.query(
      'INSERT INTO api_keys (key) VALUES ($1) ON CONFLICT (key) DO NOTHING',
      [apiKey]
    );
    console.log(`API Key registered: ${apiKey}`);
  }

  async validateApiKey(apiKey) {
    const { rows } = await this.pool.query(
      'SELECT EXISTS(SELECT 1 FROM api_keys WHERE key = $1) AS valid',
      [apiKey]
    );
    return rows[0].valid;
  }

  // ============ Seed Data ============

  async initializeSampleData() {
    const seed = require('./seed');
    await seed(this.pool);
  }
}

module.exports = new Database();
