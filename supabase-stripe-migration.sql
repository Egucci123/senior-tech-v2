-- Stripe subscription columns for the users table
-- Run this in your Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id        TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status       TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_id           TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Index for fast webhook lookups by Stripe customer/subscription ID
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id  ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id     ON users(subscription_id);

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'stripe_customer_id',
    'subscription_status',
    'subscription_id',
    'subscription_current_period_end'
  )
ORDER BY column_name;
