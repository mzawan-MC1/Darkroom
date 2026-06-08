/*
  # Fix Invoice Number Race Condition

  ## Changes
  - Update generate_invoice_number to use a more robust approach
  - Add retry logic to handle concurrent invoice creation
  - Use timestamp-based unique suffix as fallback

  ## Details
  - Race condition occurs when multiple invoices created simultaneously
  - Solution: Add microsecond timestamp to ensure uniqueness
  - Format: INV-YYYY-NNNNNN-TTTT where T is timestamp suffix
*/

-- Drop and recreate the function with better uniqueness guarantee
DROP FUNCTION IF EXISTS generate_invoice_number();

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
  timestamp_suffix text;
  max_attempts integer := 10;
  attempt_count integer := 0;
BEGIN
  year_part := to_char(now(), 'YYYY');
  
  LOOP
    -- Get next sequence number
    SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(
      substring(invoice_number from 'INV-\d{4}-(\d{6})'), 
      '[^0-9]', '', 'g'
    ), '') AS integer)), 0) + 1
    INTO sequence_part
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_part || '-%';
    
    -- Add microsecond timestamp suffix for uniqueness
    timestamp_suffix := lpad(CAST(EXTRACT(EPOCH FROM clock_timestamp()) * 1000000 AS bigint)::text, 4, '0');
    timestamp_suffix := right(timestamp_suffix, 4);
    
    new_number := 'INV-' || year_part || '-' || lpad(sequence_part::text, 6, '0') || '-' || timestamp_suffix;
    
    -- Check if this number already exists (should be rare)
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    -- Increment attempt counter
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique invoice number after % attempts', max_attempts;
    END IF;
    
    -- Small delay before retry
    PERFORM pg_sleep(0.001);
  END LOOP;
END;
$$;
