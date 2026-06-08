/*
  # Create Payment Integration System

  ## Overview
  This migration creates a comprehensive payment integration system that supports
  multiple payment providers (Stripe, Network International) with secure configuration
  storage, payment tracking, and webhook handling.

  ## New Tables

  ### `payment_settings`
  Stores secure payment provider configuration (admin only).
  - `id` (uuid, primary key) - Unique identifier
  - `provider` (text) - Payment provider: 'stripe' or 'network_international'
  - `mode` (text) - Environment: 'test' or 'live'
  - `publishable_key` (text) - Public key (safe for frontend)
  - `secret_key` (text) - Secret API key (backend only, encrypted)
  - `webhook_secret` (text) - Webhook signature verification secret
  - `merchant_id` (text) - Merchant/Outlet ID (for Network International)
  - `return_url` (text) - Success redirect URL
  - `cancel_url` (text) - Cancel redirect URL
  - `is_active` (boolean) - Whether this configuration is active
  - `created_at` (timestamptz) - When created
  - `updated_at` (timestamptz) - When last updated

  ### `payments`
  Tracks all payment transactions across bookings, orders, and passes.
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - User who made the payment
  - `booking_id` (uuid, foreign key, nullable) - Related booking
  - `order_id` (uuid, foreign key, nullable) - Related order
  - `lobby_pass_id` (uuid, foreign key, nullable) - Related lobby pass
  - `provider` (text) - Payment provider used
  - `amount` (decimal) - Payment amount
  - `currency` (text) - Currency code (e.g., 'AED')
  - `status` (text) - Payment status: 'pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'
  - `provider_payment_id` (text) - Provider's payment/transaction ID
  - `provider_session_id` (text) - Provider's session/checkout ID
  - `payment_method` (text) - Payment method: 'card', 'wallet', 'bank_transfer'
  - `metadata` (jsonb) - Additional provider-specific data
  - `error_message` (text) - Error details if failed
  - `paid_at` (timestamptz) - When payment was completed
  - `created_at` (timestamptz) - When payment was initiated
  - `updated_at` (timestamptz) - When last updated

  ### `payment_webhook_logs`
  Logs all webhook events for debugging and audit trail.
  - `id` (uuid, primary key) - Unique identifier
  - `provider` (text) - Payment provider
  - `event_type` (text) - Webhook event type
  - `event_id` (text) - Provider's event ID (for idempotency)
  - `payment_id` (uuid, foreign key, nullable) - Related payment
  - `payload` (jsonb) - Full webhook payload
  - `status` (text) - Processing status: 'received', 'processed', 'failed'
  - `error_message` (text) - Error if processing failed
  - `processed_at` (timestamptz) - When successfully processed
  - `created_at` (timestamptz) - When webhook received

  ## Modified Tables

  ### Update `bookings` table
  - Add `payment_status` (text) - Payment status
  - Add `payment_id` (uuid, foreign key) - Link to payment record

  ### Update `orders` table
  - Add `payment_status` (text) - Payment status
  - Add `payment_id` (uuid, foreign key) - Link to payment record

  ### Update `invoices` table
  - Add `payment_method` (text) - How payment was made (card/cash/online)

  ## Security
  - Enable RLS on all tables
  - Only admins can read/write payment settings
  - Users can only see their own payments
  - Webhook logs accessible to admins only
  - Secret keys never exposed to frontend

  ## Notes
  - Payment flow must go through backend edge functions
  - Webhooks verify signatures before processing
  - All payment operations are idempotent
  - Support for both hosted checkout and payment intents
*/

-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'network_international')),
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  publishable_key text,
  secret_key text NOT NULL,
  webhook_secret text NOT NULL,
  merchant_id text,
  return_url text NOT NULL DEFAULT '/payment/success',
  cancel_url text NOT NULL DEFAULT '/payment/cancel',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  lobby_pass_id uuid REFERENCES lobby_game_passes(id) ON DELETE SET NULL,
  provider text NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'AED',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  provider_payment_id text,
  provider_session_id text,
  payment_method text CHECK (payment_method IN ('card', 'wallet', 'bank_transfer')),
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_webhook_logs table
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  event_id text NOT NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add payment fields to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add payment fields to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add payment_method to invoices table (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_method text DEFAULT 'cash' CHECK (payment_method IN ('card', 'cash', 'online', 'bank_transfer'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_lobby_pass_id ON payments(lobby_pass_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON payment_webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON payment_webhook_logs(payment_id);

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_settings
-- Only admins can manage payment settings
CREATE POLICY "Admins can manage payment settings"
  ON payment_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND LOWER(r.name) = 'admin'
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND LOWER(r.name) = 'admin'
      AND ur.is_active = true
    )
  );

-- RLS Policies for payments
-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins and staff can view all payments
CREATE POLICY "Staff can view all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND LOWER(r.name) IN ('admin', 'game master', 'customer service')
      AND ur.is_active = true
    )
  );

-- Only backend (service role) can insert payments
CREATE POLICY "Service role can insert payments"
  ON payments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only backend (service role) can update payments
CREATE POLICY "Service role can update payments"
  ON payments
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for payment_webhook_logs
-- Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs"
  ON payment_webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND LOWER(r.name) = 'admin'
      AND ur.is_active = true
    )
  );

-- Only service role can insert webhook logs
CREATE POLICY "Service role can insert webhook logs"
  ON payment_webhook_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can update webhook logs
CREATE POLICY "Service role can update webhook logs"
  ON payment_webhook_logs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_payment_settings_updated_at ON payment_settings;
CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_updated_at();

-- Create unique constraint on webhook event_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_unique_event
  ON payment_webhook_logs(provider, event_id);
