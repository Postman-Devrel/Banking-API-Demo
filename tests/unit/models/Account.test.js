/**
 * Account Model Tests
 */

const Account = require('../../../src/models/Account');

describe('Account Model', () => {
  describe('Constructor', () => {
    test('should create an account with all properties', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS', '2024-01-10');
      
      expect(account.accountId).toBe('1');
      expect(account.owner).toBe('John Doe');
      expect(account.balance).toBe(1000);
      expect(account.currency).toBe('COSMIC_COINS');
      expect(account.createdAt).toBe('2024-01-10');
    });

    test('should create an account with default balance', () => {
      const account = new Account('1', 'John Doe', undefined, 'COSMIC_COINS');
      
      expect(account.balance).toBe(0);
    });

    test('should create an account with default createdAt date', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      expect(account.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('validate()', () => {
    test('should validate a correct account', () => {
      const data = {
        owner: 'John Doe',
        balance: 1000,
        currency: 'COSMIC_COINS'
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject missing owner', () => {
      const data = {
        balance: 1000,
        currency: 'COSMIC_COINS'
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Owner');
    });

    test('should reject non-string owner', () => {
      const data = {
        owner: 123,
        balance: 1000,
        currency: 'COSMIC_COINS'
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('string');
    });

    test('should reject missing currency', () => {
      const data = {
        owner: 'John Doe',
        balance: 1000
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Currency');
    });

    test('should reject invalid currency', () => {
      const data = {
        owner: 'John Doe',
        balance: 1000,
        currency: 'INVALID_CURRENCY'
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Currency');
    });

    test('should accept valid currencies', () => {
      const currencies = ['COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS'];
      
      currencies.forEach(currency => {
        const data = {
          owner: 'John Doe',
          currency: currency
        };
        
        const result = Account.validate(data);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject negative balance', () => {
      const data = {
        owner: 'John Doe',
        balance: -100,
        currency: 'COSMIC_COINS'
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Balance');
    });

    test('should reject non-number balance', () => {
      const data = {
        owner: 'John Doe',
        balance: '1000',
        currency: 'COSMIC_COINS'
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    test('should accept zero balance', () => {
      const data = {
        owner: 'John Doe',
        balance: 0,
        currency: 'COSMIC_COINS'
      };
      
      const result = Account.validate(data);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('updateBalance()', () => {
    test('should add to balance with positive amount', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      account.updateBalance(500);
      
      expect(account.balance).toBe(1500);
    });

    test('should subtract from balance with negative amount', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      account.updateBalance(-300);
      
      expect(account.balance).toBe(700);
    });

    test('should handle zero amount', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      account.updateBalance(0);
      
      expect(account.balance).toBe(1000);
    });
  });

  describe('hasSufficientFunds()', () => {
    test('should return true when balance is sufficient', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      expect(account.hasSufficientFunds(500)).toBe(true);
    });

    test('should return true when amount equals balance', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      expect(account.hasSufficientFunds(1000)).toBe(true);
    });

    test('should return false when balance is insufficient', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      expect(account.hasSufficientFunds(1500)).toBe(false);
    });

    test('should return true for zero amount', () => {
      const account = new Account('1', 'John Doe', 0, 'COSMIC_COINS');
      
      expect(account.hasSufficientFunds(0)).toBe(true);
    });
  });

  describe('toJSON()', () => {
    test('should return correct JSON representation', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS', '2024-01-10');
      
      const json = account.toJSON();
      
      expect(json).toEqual({
        accountId: '1',
        owner: 'John Doe',
        createdAt: '2024-01-10',
        balance: 1000,
        currency: 'COSMIC_COINS'
      });
    });

    test('should include all required properties', () => {
      const account = new Account('1', 'John Doe', 1000, 'COSMIC_COINS');
      
      const json = account.toJSON();
      
      expect(json).toHaveProperty('accountId');
      expect(json).toHaveProperty('owner');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('balance');
      expect(json).toHaveProperty('currency');
    });
  });
});

