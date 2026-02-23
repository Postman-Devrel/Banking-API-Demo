-- Intergalactic Bank API - PostgreSQL Schema

CREATE TABLE IF NOT EXISTS api_keys (
  key         VARCHAR(64) PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  account_id    VARCHAR(36) PRIMARY KEY,
  owner         VARCHAR(255) NOT NULL,
  balance       NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency      VARCHAR(32) NOT NULL CHECK (currency IN ('COSMIC_COINS', 'GALAXY_GOLD', 'MOON_BUCKS')),
  created_at    VARCHAR(10) NOT NULL,
  account_type  VARCHAR(32) NOT NULL DEFAULT 'STANDARD' CHECK (account_type IN ('STANDARD', 'PREMIUM', 'BUSINESS')),
  api_key       VARCHAR(64) NOT NULL REFERENCES api_keys(key),
  deleted       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id   VARCHAR(36) PRIMARY KEY,
  from_account_id  VARCHAR(36) NOT NULL,
  to_account_id    VARCHAR(36) NOT NULL REFERENCES accounts(account_id),
  amount           NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency         VARCHAR(32) NOT NULL,
  created_at       VARCHAR(10) NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_accounts_api_key ON accounts(api_key);
CREATE INDEX IF NOT EXISTS idx_accounts_deleted ON accounts(deleted);
CREATE INDEX IF NOT EXISTS idx_accounts_api_key_deleted ON accounts(api_key, deleted);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_account_id);
