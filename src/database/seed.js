/**
 * Seed data for Intergalactic Bank API
 * 15 accounts across 4 API keys, 7 transactions
 */

async function seed(pool) {
  console.log('Seeding database...');

  // API Keys
  const apiKeys = ['1234', 'workshop-alpha', 'workshop-beta', 'workshop-gamma'];
  for (const key of apiKeys) {
    await pool.query(
      'INSERT INTO api_keys (key) VALUES ($1) ON CONFLICT (key) DO NOTHING',
      [key]
    );
  }

  // Accounts: [id, owner, balance, currency, createdAt, accountType, apiKey]
  const accounts = [
    // Admin key '1234' - 5 demo accounts
    ['acc-001', 'Nova Newman',       10000, 'COSMIC_COINS', '2024-06-15', 'STANDARD', '1234'],
    ['acc-002', 'Gary Galaxy',         237, 'COSMIC_COINS', '2024-06-15', 'PREMIUM',  '1234'],
    ['acc-003', 'Luna Starlight',     5000, 'GALAXY_GOLD',  '2024-08-20', 'BUSINESS', '1234'],
    ['acc-004', 'Cosmo Nebula',      25000, 'MOON_BUCKS',   '2024-09-01', 'PREMIUM',  '1234'],
    ['acc-005', 'Stella Vortex',      1500, 'COSMIC_COINS', '2024-11-10', 'STANDARD', '1234'],

    // workshop-alpha - 4 accounts
    ['acc-006', 'Zephyr Quasar',      8500, 'COSMIC_COINS', '2025-01-05', 'BUSINESS', 'workshop-alpha'],
    ['acc-007', 'Orion Blackhole',    3200, 'GALAXY_GOLD',  '2025-01-05', 'STANDARD', 'workshop-alpha'],
    ['acc-008', 'Andromeda Swift',   12000, 'MOON_BUCKS',   '2025-02-14', 'PREMIUM',  'workshop-alpha'],
    ['acc-009', 'Pulsar Pete',          50, 'COSMIC_COINS', '2025-03-01', 'STANDARD', 'workshop-alpha'],

    // workshop-beta - 3 accounts
    ['acc-010', 'Nebula Nightshade', 42000, 'GALAXY_GOLD',  '2025-01-20', 'BUSINESS', 'workshop-beta'],
    ['acc-011', 'Comet Blaze',        7777, 'COSMIC_COINS', '2025-02-28', 'PREMIUM',  'workshop-beta'],
    ['acc-012', 'Meteor Dash',         900, 'MOON_BUCKS',   '2025-03-05', 'STANDARD', 'workshop-beta'],

    // workshop-gamma - 3 accounts
    ['acc-013', 'Supernova Singh',   15500, 'COSMIC_COINS', '2025-01-12', 'PREMIUM',  'workshop-gamma'],
    ['acc-014', 'Eclipse Monroe',     6100, 'GALAXY_GOLD',  '2025-02-01', 'BUSINESS', 'workshop-gamma'],
    ['acc-015', 'Asteroid Adams',      300, 'MOON_BUCKS',   '2025-03-05', 'STANDARD', 'workshop-gamma']
  ];

  for (const [id, owner, balance, currency, createdAt, accountType, apiKey] of accounts) {
    await pool.query(
      `INSERT INTO accounts (account_id, owner, balance, currency, created_at, account_type, api_key, deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       ON CONFLICT (account_id) DO NOTHING`,
      [id, owner, balance, currency, createdAt, accountType, apiKey]
    );
  }

  // Transactions: [id, from, to, amount, currency, createdAt]
  const transactions = [
    ['tx-001', 'acc-001', 'acc-002', 500,   'COSMIC_COINS', '2024-07-01'],
    ['tx-002', 'acc-001', 'acc-005', 2000,  'COSMIC_COINS', '2024-12-15'],
    ['tx-003', '0',       'acc-003', 1000,  'GALAXY_GOLD',  '2024-09-15'],  // deposit
    ['tx-004', 'acc-006', 'acc-009', 100,   'COSMIC_COINS', '2025-02-01'],
    ['tx-005', '0',       'acc-008', 5000,  'MOON_BUCKS',   '2025-02-20'],  // deposit
    ['tx-006', 'acc-010', 'acc-014', 2500,  'GALAXY_GOLD',  '2025-02-10'],
    ['tx-007', 'acc-013', 'acc-011', 3000,  'COSMIC_COINS', '2025-03-01']
  ];

  for (const [id, from, to, amount, currency, createdAt] of transactions) {
    await pool.query(
      `INSERT INTO transactions (transaction_id, from_account_id, to_account_id, amount, currency, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (transaction_id) DO NOTHING`,
      [id, from, to, amount, currency, createdAt]
    );
  }

  console.log(`Seeded ${apiKeys.length} API keys, ${accounts.length} accounts, ${transactions.length} transactions`);
}

module.exports = seed;
