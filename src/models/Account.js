/**
 * Account Model
 * Represents a bank account in the system
 */

class Account {
  constructor(accountId, owner, balance = 0, currency, createdAt = new Date().toISOString().split('T')[0], accountType = 'STANDARD', apiKey = null, deleted = false) {
    this.accountId = accountId;
    this.owner = owner;
    this.balance = balance;
    this.currency = currency;
    this.createdAt = createdAt;
    this.accountType = accountType;
    this.apiKey = apiKey;
    this.deleted = deleted;
  }

  /**
   * Validates account data
   * @param {Object} data - Account data to validate
   * @returns {Object} - Validation result with isValid and error properties
   */
  static validate(data) {
    const validCurrencies = ['COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS'];
    const validAccountTypes = ['STANDARD', 'PREMIUM', 'BUSINESS'];

    if (!data.owner || typeof data.owner !== 'string') {
      return { isValid: false, error: 'Owner name is required and must be a string' };
    }

    if (!data.currency || !validCurrencies.includes(data.currency)) {
      return { isValid: false, error: `Currency must be one of: ${validCurrencies.join(', ')}` };
    }

    if (data.balance !== undefined && (typeof data.balance !== 'number' || data.balance < 0)) {
      return { isValid: false, error: 'Balance must be a non-negative number' };
    }

    if (data.accountType && !validAccountTypes.includes(data.accountType)) {
      return { isValid: false, error: `Account type must be one of: ${validAccountTypes.join(', ')}` };
    }

    return { isValid: true };
  }

  /**
   * Updates account balance
   * @param {number} amount - Amount to add (positive) or subtract (negative)
   */
  updateBalance(amount) {
    this.balance += amount;
  }

  /**
   * Checks if account has sufficient funds
   * @param {number} amount - Amount to check
   * @returns {boolean}
   */
  hasSufficientFunds(amount) {
    return this.balance >= amount;
  }

  /**
   * Converts account to JSON representation
   * @returns {Object}
   */
  toJSON() {
    return {
      accountId: this.accountId,
      owner: this.owner,
      accountType: this.accountType,
      createdAt: this.createdAt,
      balance: this.balance,
      currency: this.currency
    };
  }
}

module.exports = Account;

