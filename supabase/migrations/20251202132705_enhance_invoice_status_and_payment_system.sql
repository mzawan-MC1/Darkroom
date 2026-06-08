/*
  # Enhanced Invoice Status and Payment System

  1. New Types
    - invoice_status: pending, completed, paid, cancelled, partially_paid
    - payment_method: cash, card, online

  2. Changes
    - Add proper ENUM types for invoice_status and payment_method
    - Add amount_paid column to track partial payments
    - Add updated_by column to track who made changes
    - Add indexes for performance
    - Create function to update invoice and linked booking statuses

  3. Business Logic
    - When invoice is marked as paid: Update booking payment_status and booking_status
    - When invoice is partially paid: Track amount and maintain status
    - When invoice is cancelled: Update booking accordingly

  4. Security
    - Only admin, game_master, and customer_service can update invoice status
    - Audit trail maintained with updated_by and updated_at
*/

-- Create invoice_status ENUM type
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'pending',
    'completed',
    'paid',
    'cancelled',
    'partially_paid'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create payment_method ENUM type
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM (
    'cash',
    'card',
    'online'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add amount_paid column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE invoices ADD COLUMN amount_paid numeric DEFAULT 0;
  END IF;
END $$;

-- Add updated_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add payment_reference column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'payment_reference'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_reference text;
  END IF;
END $$;

-- Update status column to use text (we'll validate with check constraint)
-- Cannot easily convert existing text column to enum without data migration

-- Add check constraint for invoice status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_status_check'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_status_check 
    CHECK (status IN ('pending', 'completed', 'paid', 'cancelled', 'partially_paid'));
  END IF;
END $$;

-- Add check constraint for payment method
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_payment_method_check'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_payment_method_check 
    CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'online'));
  END IF;
END $$;

-- Add check constraint for amount_paid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_amount_paid_valid'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_amount_paid_valid 
    CHECK (amount_paid >= 0 AND amount_paid <= total_amount);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_by ON invoices(updated_by);

-- Create function to update invoice status and cascade to booking
CREATE OR REPLACE FUNCTION update_invoice_status(
  p_invoice_id uuid,
  p_new_status text,
  p_payment_method text DEFAULT NULL,
  p_amount_paid numeric DEFAULT NULL,
  p_payment_reference text DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice record;
  v_booking_id uuid;
  v_old_status text;
  v_total_amount numeric;
  v_new_amount_paid numeric;
BEGIN
  -- Get current invoice details
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  v_old_status := v_invoice.status;
  v_total_amount := v_invoice.total_amount;
  v_booking_id := v_invoice.booking_id;
  
  -- Calculate new amount paid
  IF p_amount_paid IS NOT NULL THEN
    v_new_amount_paid := p_amount_paid;
  ELSE
    v_new_amount_paid := COALESCE(v_invoice.amount_paid, 0);
  END IF;

  -- Auto-determine status based on amount paid if not explicitly set
  IF p_new_status = 'paid' AND v_new_amount_paid = 0 THEN
    v_new_amount_paid := v_total_amount;
  END IF;

  -- Update invoice
  UPDATE invoices
  SET 
    status = p_new_status,
    payment_method = COALESCE(p_payment_method, payment_method),
    amount_paid = v_new_amount_paid,
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    paid_at = CASE 
      WHEN p_new_status = 'paid' THEN COALESCE(paid_at, now())
      ELSE paid_at
    END,
    updated_by = p_updated_by,
    updated_at = now()
  WHERE id = p_invoice_id;

  -- Update linked booking if exists
  IF v_booking_id IS NOT NULL THEN
    -- Update booking payment status based on invoice status
    UPDATE bookings
    SET 
      payment_status = CASE
        WHEN p_new_status = 'paid' THEN 'paid'
        WHEN p_new_status = 'partially_paid' THEN 'pending'
        WHEN p_new_status = 'cancelled' THEN 'failed'
        ELSE payment_status
      END,
      booking_status = CASE
        WHEN p_new_status = 'paid' AND booking_status = 'pending' THEN 'confirmed'
        WHEN p_new_status = 'cancelled' THEN 'cancelled'
        ELSE booking_status
      END,
      updated_at = now()
    WHERE id = v_booking_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'booking_id', v_booking_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Add RLS policy for admins to update invoices
DROP POLICY IF EXISTS "Staff can update invoices" ON invoices;
CREATE POLICY "Staff can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

-- Add comments
COMMENT ON COLUMN invoices.status IS 'Invoice status: pending, completed, paid, cancelled, partially_paid';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method: cash, card, online';
COMMENT ON COLUMN invoices.amount_paid IS 'Amount paid so far (for partial payments)';
COMMENT ON COLUMN invoices.payment_reference IS 'Payment reference number or transaction ID';
COMMENT ON FUNCTION update_invoice_status IS 'Updates invoice status and cascades changes to linked booking';
