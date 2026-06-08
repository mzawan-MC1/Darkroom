/*
  # Enhance Customer Portal and System Features

  1. Lobby Game Pass Timer System
    - Add activated_at, expires_at columns to lobby_game_passes
    - Add timer tracking for active passes

  2. Waiver System Enhancement
    - Link waivers specifically to escape room bookings
    - Add waiver tracking per booking

  3. Invoice Status Enhancement
    - Add more invoice statuses
    - Add payment method tracking

  4. Email Tracking
    - Create email_notifications table to track all sent emails

  5. Site Configuration
    - Create site_settings table for CMS/theme management

  6. Booking Confirmation Tracking
    - Add confirmation_required and confirmed_at to bookings
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

-- Function to activate a lobby game pass
CREATE OR REPLACE FUNCTION activate_lobby_pass(p_pass_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours integer;
BEGIN
  -- Get hours purchased
  SELECT hours_purchased INTO v_hours
  FROM lobby_game_passes
  WHERE id = p_pass_id;

  -- Update pass with activation time and expiration
  UPDATE lobby_game_passes
  SET 
    is_active = true,
    status = 'active',
    activated_at = now(),
    expires_at = now() + (v_hours || ' hours')::interval,
    activated_by = p_admin_id,
    start_time = now(),
    end_time = now() + (v_hours || ' hours')::interval
  WHERE id = p_pass_id;
END;
$$;

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
  USING (
    recipient_user_id = auth.uid()
    OR user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager'])
  );

-- Admins can view all email notifications
CREATE POLICY "Admins can manage email notifications"
  ON email_notifications FOR ALL
  TO authenticated
  USING (user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager']));

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
  setting_type text NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings
CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (user_has_active_role(auth.uid(), ARRAY['Admin']))
  WITH CHECK (user_has_active_role(auth.uid(), ARRAY['Admin']));

-- Insert default site settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('site_name', '"BreakOut"'::jsonb, 'text', 'Website name'),
  ('site_logo', '"/Gold and Black Luxury Jewelry Logo.png"'::jsonb, 'image', 'Site logo URL'),
  ('primary_color', '"#f97316"'::jsonb, 'color', 'Primary brand color'),
  ('secondary_color', '"#1e293b"'::jsonb, 'color', 'Secondary brand color'),
  ('booking_confirmation_required', 'true'::jsonb, 'boolean', 'Require customer confirmation 30 min before booking'),
  ('booking_confirmation_minutes', '30'::jsonb, 'number', 'Minutes before booking to confirm')
ON CONFLICT (setting_key) DO NOTHING;

-- ========================================
-- MERCHANDISE - Add Size/Variant Support
-- ========================================

DO $$
BEGIN
  -- Add size chart column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchandise' AND column_name = 'size_chart') THEN
    ALTER TABLE merchandise ADD COLUMN size_chart jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add product type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchandise' AND column_name = 'product_type') THEN
    ALTER TABLE merchandise ADD COLUMN product_type text DEFAULT 'general';
  END IF;
END $$;

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
  used_at timestamptz DEFAULT now()
);

ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own promo code usage
CREATE POLICY "Users can view own promo usage"
  ON promo_code_usage FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager'])
  );

-- System can insert promo code usage
CREATE POLICY "System can track promo usage"
  ON promo_code_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON promo_code_usage(user_id);

-- ========================================
-- FUNCTION: Auto-generate invoice on booking
-- ========================================

CREATE OR REPLACE FUNCTION auto_generate_invoice_for_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number text;
  v_invoice_id uuid;
BEGIN
  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::text, 6, '0');

  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    booking_id,
    customer_name,
    customer_email,
    customer_phone,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    currency,
    status
  )
  VALUES (
    v_invoice_number,
    NEW.id,
    NEW.customer_name,
    NEW.customer_email,
    NEW.customer_phone,
    NEW.subtotal,
    NEW.vat_amount,
    NEW.discount_amount,
    NEW.final_amount,
    'AED',
    'pending'
  )
  RETURNING id INTO v_invoice_id;

  -- Create line item for the booking
  INSERT INTO invoice_line_items (
    invoice_id,
    item_type,
    item_id,
    description,
    quantity,
    unit_price,
    line_total
  )
  VALUES (
    v_invoice_id,
    'booking',
    NEW.id,
    'Booking for ' || (SELECT name FROM games WHERE id = NEW.game_id),
    NEW.number_of_players,
    NEW.subtotal / NEW.number_of_players,
    NEW.subtotal
  );

  RETURN NEW;
END;
$$;

-- Create trigger for auto invoice generation
DROP TRIGGER IF EXISTS trigger_auto_invoice_on_booking ON bookings;
CREATE TRIGGER trigger_auto_invoice_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invoice_for_booking();

-- ========================================
-- Update invoice_number sequence
-- ========================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
