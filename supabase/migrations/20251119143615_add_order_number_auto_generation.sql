/*
  # Add Automatic Order Number Generation

  1. Changes
    - Create a function to generate unique order numbers
    - Create a trigger to automatically set order_number on insert
    - Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20231119-0001)

  2. Purpose
    - Ensures every order gets a unique, sequential order number
    - Eliminates null constraint violations
*/

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
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
  
  -- Get the count of orders created today and add 1
  SELECT COUNT(*) + 1 INTO seq_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || today || '-%';
  
  -- Format: ORD-YYYYMMDD-XXXX
  new_number := 'ORD-' || today || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- Create trigger function to set order_number before insert
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if order_number is null
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS set_order_number_trigger ON orders;

-- Create trigger
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();