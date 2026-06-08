/*
  # Auto-Cancel Invoice When Booking is Cancelled/Rejected

  ## Overview
  This migration creates a trigger that automatically cancels the associated invoice
  when a booking is cancelled or rejected. This ensures invoice status stays in sync
  with booking status.

  ## Changes
  1. Create a function that updates invoice status to 'cancelled' when booking is cancelled/rejected
  2. Create a trigger that fires after booking status is updated
  3. The trigger checks if the new status is 'cancelled' or 'rejected' and updates the invoice

  ## Implementation Details
  - Trigger runs AFTER UPDATE on bookings table
  - Only fires when booking_status changes to 'cancelled' or 'rejected'
  - Updates the related invoice status to 'cancelled'
  - Also sets cancelled_at timestamp on the invoice
*/

-- Create function to cancel invoice when booking is cancelled or rejected
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
      cancelled_at = now(),
      updated_at = now()
    WHERE booking_id = NEW.id
      AND status != 'cancelled'; -- Only update if not already cancelled
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists (to avoid errors on re-running migration)
DROP TRIGGER IF EXISTS trigger_cancel_invoice_on_booking_cancellation ON bookings;

-- Create trigger on bookings table
CREATE TRIGGER trigger_cancel_invoice_on_booking_cancellation
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION cancel_invoice_on_booking_cancellation();