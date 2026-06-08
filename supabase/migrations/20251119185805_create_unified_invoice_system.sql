/*
  # Unified Invoice System for All Purchases

  ## Overview
  Creates a comprehensive invoice system that handles:
  - Game bookings
  - Lobby game purchases/passes
  - Merchandise purchases
  - Mixed purchases (any combination)
  - Admin discounts
  - 5% VAT on all invoices

  ## New Tables

  ### 1. invoice_line_items
  Individual items on an invoice
  - `id` (uuid, primary key)
  - `invoice_id` (uuid, foreign key)
  - `item_type` (text) - booking, lobby_game, merchandise, lobby_pass, custom
  - `item_id` (uuid) - Reference to the actual item
  - `description` (text) - Item description
  - `quantity` (integer)
  - `unit_price` (decimal)
  - `line_total` (decimal)
  - `created_at` (timestamptz)

  ### 2. invoice_payments
  Track payments made against invoices
  - `id` (uuid, primary key)
  - `invoice_id` (uuid, foreign key)
  - `amount` (decimal)
  - `payment_method` (text) - cash, card, online
  - `payment_date` (timestamptz)
  - `reference_number` (text)
  - `created_at` (timestamptz)

  ## Modified Tables

  ### invoices
  - Add `customer_name` (text)
  - Add `customer_email` (text)
  - Add `customer_phone` (text)
  - Add `admin_discount_percentage` (decimal)
  - Add `admin_discount_amount` (decimal)
  - Add `admin_discount_reason` (text)
  - Add `notes` (text)
  - Add `payment_method` (text)
  - Update `status` to include more options

  ## Functions

  ### generate_invoice_for_purchase
  Creates invoice for any type of purchase with flexible line items

  ## Security
  - Enable RLS on all new tables
  - Customers can view their own invoices
  - Staff can manage all invoices
*/

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id uuid,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price decimal NOT NULL DEFAULT 0,
  line_total decimal NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  payment_method text NOT NULL,
  payment_date timestamptz DEFAULT now(),
  reference_number text,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'customer_name') THEN
    ALTER TABLE invoices ADD COLUMN customer_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'customer_email') THEN
    ALTER TABLE invoices ADD COLUMN customer_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'customer_phone') THEN
    ALTER TABLE invoices ADD COLUMN customer_phone text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'admin_discount_percentage') THEN
    ALTER TABLE invoices ADD COLUMN admin_discount_percentage decimal DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'admin_discount_amount') THEN
    ALTER TABLE invoices ADD COLUMN admin_discount_amount decimal DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'admin_discount_reason') THEN
    ALTER TABLE invoices ADD COLUMN admin_discount_reason text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'notes') THEN
    ALTER TABLE invoices ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_method') THEN
    ALTER TABLE invoices ADD COLUMN payment_method text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_line_items

CREATE POLICY "Users can view their invoice line items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN bookings ON bookings.id = invoices.booking_id
      WHERE invoices.id = invoice_line_items.invoice_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all invoice line items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

CREATE POLICY "Admin can manage invoice line items"
  ON invoice_line_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for invoice_payments

CREATE POLICY "Users can view their invoice payments"
  ON invoice_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN bookings ON bookings.id = invoices.booking_id
      WHERE invoices.id = invoice_payments.invoice_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all invoice payments"
  ON invoice_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

CREATE POLICY "Staff can create invoice payments"
  ON invoice_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_type ON invoice_line_items(item_type);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON invoices(customer_email);

-- Function to create flexible invoice with line items
CREATE OR REPLACE FUNCTION create_flexible_invoice(
  customer_name_param text,
  customer_email_param text,
  customer_phone_param text,
  line_items jsonb,
  admin_discount_pct decimal DEFAULT 0,
  discount_reason_param text DEFAULT NULL,
  notes_param text DEFAULT NULL,
  booking_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_id uuid;
  subtotal_amount decimal := 0;
  tax_rate decimal := 0.05;
  tax_amount_calc decimal;
  admin_discount_calc decimal := 0;
  total_amount_calc decimal;
  line_item jsonb;
BEGIN
  -- Calculate subtotal from line items
  FOR line_item IN SELECT * FROM jsonb_array_elements(line_items)
  LOOP
    subtotal_amount := subtotal_amount + ((line_item->>'quantity')::decimal * (line_item->>'unit_price')::decimal);
  END LOOP;
  
  -- Calculate admin discount if provided
  IF admin_discount_pct > 0 THEN
    admin_discount_calc := subtotal_amount * (admin_discount_pct / 100);
  END IF;
  
  -- Calculate tax on (subtotal - discount)
  tax_amount_calc := (subtotal_amount - admin_discount_calc) * tax_rate;
  
  -- Calculate total
  total_amount_calc := subtotal_amount - admin_discount_calc + tax_amount_calc;
  
  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    booking_id,
    customer_name,
    customer_email,
    customer_phone,
    subtotal,
    tax_amount,
    admin_discount_percentage,
    admin_discount_amount,
    admin_discount_reason,
    total_amount,
    notes,
    due_date,
    status
  ) VALUES (
    generate_invoice_number(),
    booking_id_param,
    customer_name_param,
    customer_email_param,
    customer_phone_param,
    subtotal_amount,
    tax_amount_calc,
    admin_discount_pct,
    admin_discount_calc,
    discount_reason_param,
    total_amount_calc,
    notes_param,
    now() + interval '7 days',
    'pending'
  )
  RETURNING id INTO invoice_id;
  
  -- Insert line items
  FOR line_item IN SELECT * FROM jsonb_array_elements(line_items)
  LOOP
    INSERT INTO invoice_line_items (
      invoice_id,
      item_type,
      item_id,
      description,
      quantity,
      unit_price,
      line_total
    ) VALUES (
      invoice_id,
      line_item->>'item_type',
      (line_item->>'item_id')::uuid,
      line_item->>'description',
      (line_item->>'quantity')::integer,
      (line_item->>'unit_price')::decimal,
      (line_item->>'quantity')::decimal * (line_item->>'unit_price')::decimal
    );
  END LOOP;
  
  RETURN invoice_id;
END;
$$;

-- Function to apply admin discount to existing invoice
CREATE OR REPLACE FUNCTION apply_admin_discount_to_invoice(
  invoice_id_param uuid,
  discount_percentage decimal,
  discount_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_subtotal decimal;
  tax_rate decimal := 0.05;
  new_discount_amount decimal;
  new_tax_amount decimal;
  new_total_amount decimal;
BEGIN
  -- Get current subtotal
  SELECT subtotal INTO current_subtotal
  FROM invoices
  WHERE id = invoice_id_param;
  
  IF current_subtotal IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate new amounts
  new_discount_amount := current_subtotal * (discount_percentage / 100);
  new_tax_amount := (current_subtotal - new_discount_amount) * tax_rate;
  new_total_amount := current_subtotal - new_discount_amount + new_tax_amount;
  
  -- Update invoice
  UPDATE invoices SET
    admin_discount_percentage = discount_percentage,
    admin_discount_amount = new_discount_amount,
    admin_discount_reason = discount_reason,
    tax_amount = new_tax_amount,
    total_amount = new_total_amount,
    updated_at = now()
  WHERE id = invoice_id_param;
  
  RETURN true;
END;
$$;

-- Function to record payment
CREATE OR REPLACE FUNCTION record_invoice_payment(
  invoice_id_param uuid,
  amount_param decimal,
  payment_method_param text,
  reference_number_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_id uuid;
  current_total decimal;
  total_paid decimal;
BEGIN
  -- Get invoice total
  SELECT total_amount INTO current_total
  FROM invoices
  WHERE id = invoice_id_param;
  
  -- Insert payment record
  INSERT INTO invoice_payments (
    invoice_id,
    amount,
    payment_method,
    reference_number
  ) VALUES (
    invoice_id_param,
    amount_param,
    payment_method_param,
    reference_number_param
  )
  RETURNING id INTO payment_id;
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM invoice_payments
  WHERE invoice_id = invoice_id_param;
  
  -- Update invoice status
  IF total_paid >= current_total THEN
    UPDATE invoices SET
      status = 'paid',
      paid_at = now(),
      payment_method = payment_method_param
    WHERE id = invoice_id_param;
  ELSIF total_paid > 0 THEN
    UPDATE invoices SET
      status = 'partially_paid',
      payment_method = payment_method_param
    WHERE id = invoice_id_param;
  END IF;
  
  RETURN payment_id;
END;
$$;
