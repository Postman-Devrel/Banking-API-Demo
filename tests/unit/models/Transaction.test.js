/**
 * Transaction Model Tests
 */

const Transaction = require('../../../src/models/Transaction');

describe('Transaction Model', () => {
  describe('Constructor', () => {
    test('should create a transaction with all properties', () => {
      const transaction = new Transaction(
        '1',
        'acc1',
        'acc2',
        1000,
        'COSMIC_COINS',
        '2024-01-10'
      );
      
      expect(transaction.transactionId).toBe('1');
      expect(transaction.fromAccountId).toBe('acc1');
      expect(transaction.toAccountId).toBe('acc2');
      expect(transaction.amount).toBe(1000);
      expect(transaction.currency).toBe('COSMIC_COINS');
      expect(transaction.createdAt).toBe('2024-01-10');
    });

    test('should create a transaction with default createdAt', () => {
      const transaction = new Transaction(
        '1',
        'acc1',
        'acc2',
        1000,
        'COSMIC_COINS'
      );
      
      expect(transaction.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('validate()', () => {
    test('should validate a correct transaction', () => {
      const data = {
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
        amount: 1000,
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(true);
    });

    test('should validate a deposit transaction (fromAccountId = "0")', () => {
      const data = {
        fromAccountId: '0',
        toAccountId: 'acc2',
        amount: 1000,
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject missing fromAccountId', () => {
      const data = {
        toAccountId: 'acc2',
        amount: 1000,
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('fromAccountId');
    });

    test('should reject missing toAccountId', () => {
      const data = {
        fromAccountId: 'acc1',
        amount: 1000,
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('toAccountId');
    });

    test('should reject missing amount', () => {
      const data = {
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Amount');
    });

    test('should reject zero amount', () => {
      const data = {
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
        amount: 0,
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('positive');
    });

    test('should reject negative amount', () => {
      const data = {
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
        amount: -500,
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('positive');
    });

    test('should reject non-number amount', () => {
      const data = {
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
        amount: '1000',
        currency: 'COSMIC_COINS'
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    test('should reject missing currency', () => {
      const data = {
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
        amount: 1000
      };
      
      const result = Transaction.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Currency');
    });
  });

  describe('isDeposit()', () => {
    test('should return true for deposit transactions', () => {
      const transaction = new Transaction(
        '1',
        '0',
        'acc2',
        1000,
        'COSMIC_COINS'
      );
      
      expect(transaction.isDeposit()).toBe(true);
    });

    test('should return false for transfer transactions', () => {
      const transaction = new Transaction(
        '1',
        'acc1',
        'acc2',
        1000,
        'COSMIC_COINS'
      );
      
      expect(transaction.isDeposit()).toBe(false);
    });
  });

  describe('toJSON()', () => {
    test('should return correct JSON representation', () => {
      const transaction = new Transaction(
        '1',
        'acc1',
        'acc2',
        1000,
        'COSMIC_COINS',
        '2024-01-10'
      );
      
      const json = transaction.toJSON();
      
      expect(json).toEqual({
        transactionId: '1',
        createdAt: '2024-01-10',
        amount: 1000,
        currency: 'COSMIC_COINS',
        fromAccountId: 'acc1',
        toAccountId: 'acc2'
      });
    });

    test('should include all required properties', () => {
      const transaction = new Transaction(
        '1',
        'acc1',
        'acc2',
        1000,
        'COSMIC_COINS'
      );
      
      const json = transaction.toJSON();
      
      expect(json).toHaveProperty('transactionId');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('amount');
      expect(json).toHaveProperty('currency');
      expect(json).toHaveProperty('fromAccountId');
      expect(json).toHaveProperty('toAccountId');
    });
  });
});

