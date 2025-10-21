/**
 * Transaction Model
 * Represents a transaction between accounts
 */

class Transaction {
  constructor(transactionId, fromAccountId, toAccountId, amount, currency, createdAt = new Date().toISOString().split('T')[0]) {
    this.transactionId = transactionId;
    this.fromAccountId = fromAccountId;
    this.toAccountId = toAccountId;
    this.amount = amount;
    this.currency = currency;
    this.createdAt = createdAt;
  }

  /**
   * Validates transaction data
   * @param {Object} data - Transaction data to validate
   * @returns {Object} - Validation result with isValid and error properties
   */
  static validate(data) {
    if (!data.fromAccountId && data.fromAccountId !== '0') {
      return { isValid: false, error: 'fromAccountId is required' };
    }

    if (!data.toAccountId) {
      return { isValid: false, error: 'toAccountId is required' };
    }

    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
      return { isValid: false, error: 'Amount must be a positive number' };
    }

    if (!data.currency) {
      return { isValid: false, error: 'Currency is required' };
    }

    return { isValid: true };
  }

  /**
   * Checks if transaction is a deposit (from external source)
   * @returns {boolean}
   */
  isDeposit() {
    return this.fromAccountId === '0';
  }

  /**
   * Converts transaction to JSON representation
   * @returns {Object}
   */
  toJSON() {
    return {
      transactionId: this.transactionId,
      createdAt: this.createdAt,
      amount: this.amount,
      currency: this.currency,
      fromAccountId: this.fromAccountId,
      toAccountId: this.toAccountId
    };
  }
}

module.exports = Transaction;

