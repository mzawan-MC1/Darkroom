/*
  # Enhanced Booking System with Event Types and Add-ons

  ## Overview
  This migration creates a comprehensive booking system that supports:
  - Multiple booking types (General, Corporate, Birthday, VIP)
  - Add-ons (Birthday Setup, Catering, Photography)
  - Special requests and notes
  - Invoice generation
  - Email/WhatsApp confirmations

  ## New Tables

  ### 1. booking_types
  Defines available booking types with pricing multipliers
  - `id` (uuid, primary key)
  - `name` (text) - General, Corporate, Birthday Party, VIP Session
  - `description` (text)
  - `price_multiplier` (decimal) - Multiplier applied to base price
  - `requires_approval` (boolean) - Whether booking needs admin approval
  - `is_active` (boolean)

  ### 2. booking_add_ons
  Available add-on services
  - `id` (uuid, primary key)
  - `name` (text) - Birthday Setup, Catering, Photography
  - `description` (text)
  - `price` (decimal)
  - `is_available` (boolean)

  ### 3. booking_add_on_selections
  Links bookings to selected add-ons
  - `id` (uuid, primary key)
  - `booking_id` (uuid, foreign key)
  - `add_on_id` (uuid, foreign key)
  - `quantity` (integer)
  - `price_at_booking` (decimal) - Price when booked

  ### 4. invoices
  Generated invoices for bookings
  - `id` (uuid, primary key)
  - `invoice_number` (text, unique)
  - `booking_id` (uuid, foreign key)
  - `subtotal` (decimal)
  - `tax_amount` (decimal)
  - `discount_amount` (decimal)
  - `total_amount` (decimal)
  - `currency` (text) - Default AED
  - `status` (text) - pending, paid, cancelled, refunded
  - `issued_at` (timestamptz)
  - `due_date` (timestamptz)
  - `paid_at` (timestamptz)

  ### 5. booking_confirmations
  Tracks confirmation emails/messages sent
  - `id` (uuid, primary key)
  - `booking_id` (uuid, foreign key)
  - `confirmation_type` (text) - email, whatsapp
  - `sent_at` (timestamptz)
  - `status` (text) - sent, failed, delivered

  ## Modified Tables

  ### bookings
  - Add `booking_type_id` (uuid, foreign key)
  - Add `special_requests` (text)
  - Add `customer_name` (text)
  - Add `customer_email` (text)
  - Add `customer_phone` (text)
  - Add `requires_approval` (boolean)
  - Add `approval_status` (text) - pending, approved, rejected
  - Add `approved_by` (uuid, foreign key to profiles)
  - Add `approved_at` (timestamptz)
  - Add `rejection_reason` (text)

  ## Security
  - Enable RLS on all new tables
  - Customers can view their own bookings and invoices
  - Admin/staff can manage all bookings and invoices
  - Public can create booking requests
*/

-- Create booking_types table
CREATE TABLE IF NOT EXISTS booking_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  price_multiplier decimal DEFAULT 1.0,
  requires_approval boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create booking_add_ons table
CREATE TABLE IF NOT EXISTS booking_add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create booking_add_on_selections table
CREATE TABLE IF NOT EXISTS booking_add_on_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id uuid REFERENCES booking_add_ons(id),
  quantity integer DEFAULT 1,
  price_at_booking decimal NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  subtotal decimal NOT NULL DEFAULT 0,
  tax_amount decimal DEFAULT 0,
  discount_amount decimal DEFAULT 0,
  total_amount decimal NOT NULL DEFAULT 0,
  currency text DEFAULT 'AED',
  status text DEFAULT 'pending',
  issued_at timestamptz DEFAULT now(),
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create booking_confirmations table
CREATE TABLE IF NOT EXISTS booking_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  confirmation_type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Add new columns to bookings table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'booking_type_id') THEN
    ALTER TABLE bookings ADD COLUMN booking_type_id uuid REFERENCES booking_types(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'special_requests') THEN
    ALTER TABLE bookings ADD COLUMN special_requests text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'customer_name') THEN
    ALTER TABLE bookings ADD COLUMN customer_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'customer_email') THEN
    ALTER TABLE bookings ADD COLUMN customer_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'customer_phone') THEN
    ALTER TABLE bookings ADD COLUMN customer_phone text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'requires_approval') THEN
    ALTER TABLE bookings ADD COLUMN requires_approval boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'approval_status') THEN
    ALTER TABLE bookings ADD COLUMN approval_status text DEFAULT 'approved';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'approved_by') THEN
    ALTER TABLE bookings ADD COLUMN approved_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'approved_at') THEN
    ALTER TABLE bookings ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'rejection_reason') THEN
    ALTER TABLE bookings ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Insert default booking types
INSERT INTO booking_types (name, description, price_multiplier, requires_approval) VALUES
  ('General Booking', 'Standard escape room booking', 1.0, false),
  ('Corporate Event', 'Team building and corporate events', 1.3, true),
  ('Birthday Party', 'Special birthday celebration package', 1.2, false),
  ('VIP Session', 'Premium exclusive experience', 1.5, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default add-ons
INSERT INTO booking_add_ons (name, description, price, is_available) VALUES
  ('Birthday Setup', 'Birthday decorations, cake table, and party supplies', 150.00, true),
  ('Catering', 'Food and beverage package for your group', 300.00, true),
  ('Photography', 'Professional photographer for your session', 250.00, true),
  ('Video Recording', 'Full video recording of your experience', 200.00, true),
  ('Gift Bags', 'Custom gift bags for all participants', 100.00, true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE booking_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_on_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_types

CREATE POLICY "Anyone can view active booking types"
  ON booking_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage booking types"
  ON booking_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for booking_add_ons

CREATE POLICY "Anyone can view available add-ons"
  ON booking_add_ons FOR SELECT
  USING (is_available = true);

CREATE POLICY "Admin can manage add-ons"
  ON booking_add_ons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for booking_add_on_selections

CREATE POLICY "Users can view their booking add-ons"
  ON booking_add_on_selections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_on_selections.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all booking add-ons"
  ON booking_add_on_selections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

CREATE POLICY "Users can add add-ons to their bookings"
  ON booking_add_on_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_on_selections.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all booking add-ons"
  ON booking_add_on_selections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for invoices

CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = invoices.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

CREATE POLICY "Admin can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for booking_confirmations

CREATE POLICY "Users can view their booking confirmations"
  ON booking_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_confirmations.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all confirmations"
  ON booking_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

CREATE POLICY "Staff can create confirmations"
  ON booking_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_approval_status ON bookings(approval_status);
CREATE INDEX IF NOT EXISTS idx_booking_add_on_selections_booking ON booking_add_on_selections(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_booking_confirmations_booking ON booking_confirmations(booking_id);

-- Function to auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number text;
  year_part text;
  sequence_part integer;
BEGIN
  year_part := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(substring(invoice_number from 9) AS integer)), 0) + 1
  INTO sequence_part
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';
  
  new_number := 'INV-' || year_part || '-' || lpad(sequence_part::text, 6, '0');
  
  RETURN new_number;
END;
$$;

-- Function to create invoice for booking
CREATE OR REPLACE FUNCTION create_invoice_for_booking(booking_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_id uuid;
  booking_total decimal;
  add_ons_total decimal;
  tax_rate decimal := 0.05;
  subtotal_amount decimal;
  tax_amount_calc decimal;
  total_amount_calc decimal;
BEGIN
  SELECT final_price INTO booking_total
  FROM bookings
  WHERE id = booking_id_param;
  
  SELECT COALESCE(SUM(price_at_booking * quantity), 0) INTO add_ons_total
  FROM booking_add_on_selections
  WHERE booking_id = booking_id_param;
  
  subtotal_amount := booking_total + add_ons_total;
  tax_amount_calc := subtotal_amount * tax_rate;
  total_amount_calc := subtotal_amount + tax_amount_calc;
  
  INSERT INTO invoices (
    invoice_number,
    booking_id,
    subtotal,
    tax_amount,
    total_amount,
    due_date
  ) VALUES (
    generate_invoice_number(),
    booking_id_param,
    subtotal_amount,
    tax_amount_calc,
    total_amount_calc,
    now() + interval '7 days'
  )
  RETURNING id INTO invoice_id;
  
  RETURN invoice_id;
END;
$$;
