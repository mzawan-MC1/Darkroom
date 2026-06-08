/*
  # Enhance Customer Portal and System Features

  1. Lobby Game Pass Timer System
    - Add activated_at, expires_at columns to lobby_game_passes
    - Add timer tracking for active passes

  2. Site Configuration
    - Create site_settings table for CMS/theme management

  3. Booking Confirmation Tracking
    - Add confirmation_required and confirmed_at to bookings

  4. Email Notifications
    - Create email_notifications table

  5. Promo Code Usage Tracking
    - Create promo_code_usage table
*/

-- ========================================
-- LOBBY GAME PASSES - Add Timer Fields
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lobby_game_passes' AND column_name = 'activated_at') THEN
    ALTER TABLE lobby_game_passes ADD COLUMN activated_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lobby_game_passes' AND column_name = 'expires_at') THEN
    ALTER TABLE lobby_game_passes ADD COLUMN expires_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lobby_game_passes' AND column_name = 'is_active') THEN
    ALTER TABLE lobby_game_passes ADD COLUMN is_active boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lobby_game_passes' AND column_name = 'activated_by') THEN
    ALTER TABLE lobby_game_passes ADD COLUMN activated_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- ========================================
-- BOOKINGS - Add Confirmation Tracking
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'confirmation_required') THEN
    ALTER TABLE bookings ADD COLUMN confirmation_required boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'confirmed_by_customer_at') THEN
    ALTER TABLE bookings ADD COLUMN confirmed_by_customer_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'confirmation_method') THEN
    ALTER TABLE bookings ADD COLUMN confirmation_method text;
  END IF;
END $$;

-- ========================================
-- EMAIL NOTIFICATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid REFERENCES profiles(id),
  email_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own email notifications
CREATE POLICY "Users can view own email notifications"
  ON email_notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Admins can view all email notifications
CREATE POLICY "Admins can manage email notifications"
  ON email_notifications FOR ALL
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_email_notifications_user ON email_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(email_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);

-- ========================================
-- SITE SETTINGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings
CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admins can update site settings
CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default site settings
INSERT INTO site_settings (setting_key, setting_value)
VALUES
  ('site_name', '"BreakOut"'::jsonb),
  ('site_logo', '"/Gold and Black Luxury Jewelry Logo.png"'::jsonb),
  ('primary_color', '"#f97316"'::jsonb),
  ('secondary_color', '"#1e293b"'::jsonb),
  ('booking_confirmation_required', 'true'::jsonb),
  ('booking_confirmation_minutes', '30'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- ========================================
-- PROMO CODE USAGE TRACKING
-- ========================================

CREATE TABLE IF NOT EXISTS promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  booking_id uuid REFERENCES bookings(id),
  order_id uuid REFERENCES orders(id),
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own promo code usage
CREATE POLICY "Users can view own promo usage"
  ON promo_code_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert promo code usage
CREATE POLICY "System can track promo usage"
  ON promo_code_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON promo_code_usage(user_id);

-- ========================================
-- Update invoice_number sequence
-- ========================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;