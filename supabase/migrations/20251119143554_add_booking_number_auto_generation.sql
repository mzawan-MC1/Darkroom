/*
  # Add Automatic Booking Number Generation

  1. Changes
    - Create a function to generate unique booking numbers
    - Create a trigger to automatically set booking_number on insert
    - Format: BK-YYYYMMDD-XXXX (e.g., BK-20231119-0001)

  2. Purpose
    - Ensures every booking gets a unique, sequential booking number
    - Eliminates null constraint violations
*/

-- Create function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  -- Get today's date in YYYYMMDD format
  today := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the count of bookings created today and add 1
  SELECT COUNT(*) + 1 INTO seq_num
  FROM bookings
  WHERE booking_number LIKE 'BK-' || today || '-%';
  
  -- Format: BK-YYYYMMDD-XXXX
  new_number := 'BK-' || today || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Create trigger function to set booking_number before insert
CREATE OR REPLACE FUNCTION set_booking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if booking_number is null
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := generate_booking_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS set_booking_number_trigger ON bookings;

-- Create trigger
CREATE TRIGGER set_booking_number_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_number();