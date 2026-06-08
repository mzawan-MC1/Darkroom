/*
  # Fix Auto-Cancel Invoice Trigger

  ## Overview
  This migration fixes the auto-cancel invoice trigger to not reference the
  cancelled_at column which doesn't exist in the invoices table.

  ## Changes
  1. Update the trigger function to only set status and updated_at
  2. Remove reference to cancelled_at column

  ## Implementation Details
  - Updates the function to work with existing table schema
  - Maintains the same trigger behavior
*/

-- Update function to cancel invoice when booking is cancelled or rejected
CREATE OR REPLACE FUNCTION cancel_invoice_on_booking_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the booking status changed to 'cancelled' or 'rejected'
  IF (NEW.booking_status IN ('cancelled', 'rejected') AND 
      OLD.booking_status NOT IN ('cancelled', 'rejected')) THEN
    
    -- Update the associated invoice to cancelled status
    UPDATE invoices
    SET 
      status = 'cancelled',
      updated_at = now()
    WHERE booking_id = NEW.id
      AND status != 'cancelled'; -- Only update if not already cancelled
    
  END IF;
  
  RETURN NEW;
END;
$$;