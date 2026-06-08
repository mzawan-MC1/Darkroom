/*
  # Cancel Lobby Pass on Invoice Cancellation

  1. Changes
    - Create function to update lobby_game_passes status to 'cancelled' when invoice is cancelled
    - Create trigger to automatically cancel lobby passes when their invoice is cancelled

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only updates passes linked to the cancelled invoice
*/

-- Function to cancel lobby pass when invoice is cancelled
CREATE OR REPLACE FUNCTION cancel_lobby_pass_on_invoice_cancellation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if invoice status changed to 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    -- Update lobby_game_passes linked to this invoice's booking
    UPDATE lobby_game_passes
    SET status = 'cancelled'
    WHERE booking_id = NEW.booking_id
    AND status != 'cancelled'; -- Only update if not already cancelled
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on invoices table
DROP TRIGGER IF EXISTS trigger_cancel_lobby_pass_on_invoice_cancellation ON invoices;

CREATE TRIGGER trigger_cancel_lobby_pass_on_invoice_cancellation
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION cancel_lobby_pass_on_invoice_cancellation();
