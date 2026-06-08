/*
  # Fix Booking Update Policy - Add WITH CHECK Clause

  1. Changes
    - Drop and recreate the "Staff can update bookings" policy
    - Add WITH CHECK clause to allow the updated values to be saved
    - UPDATE policies need both USING (which rows to select) and WITH CHECK (whether new values are allowed)

  2. Security
    - USING: Checks if user has permission to update the booking
    - WITH CHECK: Allows any values to be updated (no additional restrictions)
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Staff can update bookings" ON bookings;

-- Recreate with both USING and WITH CHECK
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.name IN ('Admin', 'Manager', 'Staff')
    )
  );
