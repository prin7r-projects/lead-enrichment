-- 001: Initial schema — customers, API keys, credit ledger, payments, jobs
-- Version: 1.0.0
-- Created: 2026-05-08

-- Customers who have purchased or received pilot credits.
CREATE TABLE IF NOT EXISTS customers (
  id          TEXT PRIMARY KEY DEFAULT ('cus_' || gen_random_uuid()::text),
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB DEFAULT '{}'
);

-- API keys for accessing the enrichment API.
CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT PRIMARY KEY DEFAULT ('key_' || gen_random_uuid()::text),
  customer_id   TEXT NOT NULL REFERENCES customers(id),
  prefix        TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,
  label         TEXT DEFAULT 'default',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ
);

-- Credit accounts — one per customer.
CREATE TABLE IF NOT EXISTS credit_accounts (
  id              TEXT PRIMARY KEY DEFAULT ('acct_' || gen_random_uuid()::text),
  customer_id     TEXT NOT NULL UNIQUE REFERENCES customers(id),
  balance         INTEGER NOT NULL DEFAULT 0,
  lifetime_used   INTEGER NOT NULL DEFAULT 0,
  tier            TEXT NOT NULL DEFAULT 'starter',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual credit transactions.
CREATE TABLE IF NOT EXISTS credit_transactions (
  id              TEXT PRIMARY KEY DEFAULT ('txn_' || gen_random_uuid()::text),
  account_id      TEXT NOT NULL REFERENCES credit_accounts(id),
  type            TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  enrichment_id   TEXT,
  payment_id      TEXT,
  correlation_id  TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments received via NOWPayments.
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY DEFAULT ('pay_' || gen_random_uuid()::text),
  order_id        TEXT NOT NULL UNIQUE,
  pack_id         TEXT NOT NULL,
  customer_id     TEXT REFERENCES customers(id),
  price_usd       NUMERIC(10,2) NOT NULL,
  credits         INTEGER NOT NULL,
  pay_currency    TEXT,
  pay_amount      NUMERIC(20,8),
  payment_status  TEXT NOT NULL,
  ipn_raw         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- Refunds.
CREATE TABLE IF NOT EXISTS refunds (
  id            TEXT PRIMARY KEY DEFAULT ('ref_' || gen_random_uuid()::text),
  payment_id    TEXT NOT NULL REFERENCES payments(id),
  amount_usd    NUMERIC(10,2) NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrichment requests log (PII-safe: email is sha256-hashed).
CREATE TABLE IF NOT EXISTS enrichment_requests (
  id              TEXT PRIMARY KEY DEFAULT ('enr_' || gen_random_uuid()::text),
  account_id      TEXT NOT NULL REFERENCES credit_accounts(id),
  api_key_id      TEXT NOT NULL REFERENCES api_keys(id),
  correlation_id  TEXT NOT NULL UNIQUE,
  input_hash      TEXT,
  input_domain    TEXT,
  cached          BOOLEAN NOT NULL DEFAULT false,
  credit_consumed BOOLEAN NOT NULL DEFAULT true,
  response_shape  TEXT,
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrichment jobs (batch).
CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id                    TEXT PRIMARY KEY DEFAULT ('job_' || gen_random_uuid()::text),
  account_id            TEXT NOT NULL REFERENCES credit_accounts(id),
  status                TEXT NOT NULL DEFAULT 'queued',
  row_count             INTEGER NOT NULL,
  completed_rows        INTEGER NOT NULL DEFAULT 0,
  failed_rows           INTEGER NOT NULL DEFAULT 0,
  credits_consumed      INTEGER NOT NULL DEFAULT 0,
  result_object_key     TEXT,
  webhook_url           TEXT,
  webhook_fired         BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_customer_id ON api_keys(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_customer_id ON credit_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_account_id ON credit_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_requests_account_id ON enrichment_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_requests_created_at ON enrichment_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;
