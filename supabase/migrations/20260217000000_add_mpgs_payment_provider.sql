
-- Update payment_settings table to support MPGS
ALTER TABLE payment_settings DROP CONSTRAINT IF EXISTS payment_settings_provider_check;
ALTER TABLE payment_settings ADD CONSTRAINT payment_settings_provider_check 
  CHECK (provider IN ('stripe', 'network_international', 'mpgs_adib0'));

ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS merchant_name text DEFAULT 'LockOut Recreational Playground';
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS merchant_logo_url text;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS gateway_region_base_url text DEFAULT 'https://eu-gateway.mastercard.com';
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS api_version integer DEFAULT 74;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS timeout_url text DEFAULT '/payment/timeout';
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS timeout_seconds integer DEFAULT 1800;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS require_billing_address boolean DEFAULT true;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS require_customer_email boolean DEFAULT true;

-- Update payment_status ENUM
-- We cannot use IF NOT EXISTS inside ALTER TYPE directly in standard SQL blocks easily without DO block for safety, 
-- but Supabase/Postgres 12+ supports ALTER TYPE ... ADD VALUE IF NOT EXISTS
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'unpaid';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'processing';

-- Update bookings table with new payment fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_session_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_transaction_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_amount numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_currency text DEFAULT 'AED';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gateway_result jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Update orders table (lobby games) with new payment fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_session_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_transaction_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_currency text DEFAULT 'AED';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_result jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Update invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_id text;
