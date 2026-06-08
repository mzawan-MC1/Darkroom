/*
  # Fix Booking Update RLS Policy

  1. Changes
    - Drop existing "Staff can update bookings" policy
    - Create new policy that checks user_roles table for Admin, Manager, or Staff roles
    - This aligns with the actual role management system

  2. Security
    - Ensures staff members can update bookings for rejection, approval, etc.
    - Uses the user_roles table instead of profiles.role for consistency
*/

-- Drop the old policy that checks profiles.role
DROP POLICY IF EXISTS "Staff can update bookings" ON bookings;

-- Create a new policy that checks user_roles table
CREATE POLICY "Staff can update bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.name IN ('Admin', 'Manager', 'Staff')
    )
  );

-- Also ensure the trigger for updating slot availability works on booking status changes
-- This ensures that when a booking is rejected/cancelled, the slot becomes available again
DROP TRIGGER IF EXISTS trigger_update_slot_on_booking_change ON bookings;

CREATE TRIGGER trigger_update_slot_on_booking_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_slot_id IS NOT NULL)
  EXECUTE FUNCTION update_slot_availability();
