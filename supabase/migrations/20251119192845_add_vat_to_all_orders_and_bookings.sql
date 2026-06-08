/*
  # Add VAT Support to Orders and Bookings

  ## Changes
  - Add VAT (5%) calculation support to all purchase flows
  - Add vat_amount and subtotal columns where needed
  - Update orders and bookings to track VAT separately
  - Create helper function to calculate VAT

  ## Details
  - UAE VAT rate is 5% (0.05)
  - Subtotal = price before VAT
  - VAT Amount = subtotal * 0.05
  - Total Amount = subtotal + VAT
*/

-- Add VAT columns to orders table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN vat_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Add VAT columns to bookings table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE bookings ADD COLUMN subtotal numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN vat_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Create a helper function to calculate VAT
CREATE OR REPLACE FUNCTION calculate_vat(subtotal_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  vat_rate numeric := 0.05; -- 5% VAT in UAE
BEGIN
  RETURN ROUND(subtotal_amount * vat_rate, 2);
END;
$$;

-- Create a helper function to calculate total with VAT
CREATE OR REPLACE FUNCTION calculate_total_with_vat(subtotal_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  vat_rate numeric := 0.05; -- 5% VAT in UAE
  vat_amount numeric;
BEGIN
  vat_amount := ROUND(subtotal_amount * vat_rate, 2);
  RETURN subtotal_amount + vat_amount;
END;
$$;

-- Add comments to explain the fields
COMMENT ON COLUMN orders.subtotal IS 'Order subtotal in AED before VAT (5%)';
COMMENT ON COLUMN orders.vat_amount IS 'VAT amount in AED (5% of subtotal)';
COMMENT ON COLUMN orders.total_amount IS 'Total amount in AED including VAT (subtotal + vat_amount before discounts)';

COMMENT ON COLUMN bookings.subtotal IS 'Booking subtotal in AED before VAT (5%)';
COMMENT ON COLUMN bookings.vat_amount IS 'VAT amount in AED (5% of subtotal)';
COMMENT ON COLUMN bookings.total_amount IS 'Total amount in AED including VAT (subtotal + vat_amount before discounts)';
