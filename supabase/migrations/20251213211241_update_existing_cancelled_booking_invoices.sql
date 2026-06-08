/*
  # Update Existing Invoices for Cancelled/Rejected Bookings

  ## Overview
  This migration updates all existing invoices that are linked to cancelled or rejected
  bookings to have a "cancelled" status. This ensures historical data is consistent
  with the new auto-cancellation trigger.

  ## Changes
  1. Update all invoices where the linked booking has status 'cancelled' or 'rejected'
  2. Set invoice status to 'cancelled'
  3. Only update invoices that are not already cancelled

  ## Implementation Details
  - Updates only invoices with pending, completed, or other non-cancelled statuses
  - Works with both regular bookings and lobby bookings
*/

-- Update invoices for cancelled or rejected bookings
UPDATE invoices
SET 
  status = 'cancelled',
  updated_at = now()
WHERE booking_id IN (
  SELECT id FROM bookings
  WHERE booking_status IN ('cancelled', 'rejected')
)
AND status != 'cancelled';