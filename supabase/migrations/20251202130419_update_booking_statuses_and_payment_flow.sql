/*
  # Update Booking Status Flow and Payment Statuses

  1. Changes to Enums
    - Add 'approved' and 'rejected' to booking_status enum
    - Add 'partially_paid' to payment_status enum

  2. Status Flow Logic
    - Booking statuses: pending → approved/rejected → completed/cancelled
    - Payment statuses: pending → paid/partially_paid/failed
    - When payment is made online → booking_status becomes 'confirmed' automatically

  3. Notes
    - existing values: pending, confirmed, completed, cancelled, no_show
    - existing payment: pending, paid, refunded, failed
    - Need to add: approved, rejected (booking_status)
    - Need to add: partially_paid (payment_status)
*/

-- Add new booking status values
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'approved';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'rejected';
  END IF;
END $$;

-- Add new payment status value
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'partially_paid' AND enumtypid = 'payment_status'::regtype) THEN
    ALTER TYPE payment_status ADD VALUE 'partially_paid';
  END IF;
END $$;

-- Update the auto_generate_invoice_for_booking function to ensure invoices are created for all new bookings
DROP TRIGGER IF EXISTS trigger_auto_invoice_on_booking ON bookings;
DROP FUNCTION IF EXISTS auto_generate_invoice_for_booking() CASCADE;

CREATE OR REPLACE FUNCTION auto_generate_invoice_for_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number text;
  v_invoice_id uuid;
  v_description text;
BEGIN
  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::text, 6, '0');

  -- Determine description based on booking type
  IF NEW.lobby_game_id IS NOT NULL THEN
    -- Lobby game booking
    SELECT 'Lobby Game: ' || name INTO v_description
    FROM lobby_games
    WHERE id = NEW.lobby_game_id;
  ELSIF NEW.game_id IS NOT NULL THEN
    -- Escape room booking
    SELECT 'Booking for ' || name INTO v_description
    FROM games
    WHERE id = NEW.game_id;
  ELSE
    -- Fallback for unknown booking type
    v_description := 'Booking #' || NEW.booking_number;
  END IF;

  -- Ensure description is never NULL
  v_description := COALESCE(v_description, 'Booking');

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
    v_description,
    COALESCE(NEW.number_of_players, 1),
    CASE 
      WHEN COALESCE(NEW.number_of_players, 0) > 0 THEN NEW.subtotal / NEW.number_of_players
      ELSE NEW.subtotal
    END,
    NEW.subtotal
  );

  RETURN NEW;
END;
$$;

-- Recreate the trigger to auto-generate invoices
CREATE TRIGGER trigger_auto_invoice_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invoice_for_booking();

-- Create function to update booking status based on payment
CREATE OR REPLACE FUNCTION update_booking_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When payment becomes 'paid', automatically confirm the booking
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    NEW.booking_status := 'confirmed';
    NEW.confirmed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-confirming bookings on payment
DROP TRIGGER IF EXISTS trigger_update_booking_on_payment ON bookings;
CREATE TRIGGER trigger_update_booking_on_payment
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.payment_status IS DISTINCT FROM OLD.payment_status)
  EXECUTE FUNCTION update_booking_status_on_payment();

-- Add comments for clarity
COMMENT ON TYPE booking_status IS 'Booking lifecycle: pending → approved/rejected → confirmed → completed/cancelled/no_show';
COMMENT ON TYPE payment_status IS 'Payment states: pending → paid/partially_paid/failed → refunded';
