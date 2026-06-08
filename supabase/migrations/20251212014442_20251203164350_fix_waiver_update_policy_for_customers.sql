/*
  # Fix Waiver Update Policy for Customer Signing

  1. Changes
    - Drop and recreate "Users can update pending waivers for their bookings" policy
    - Fix WITH CHECK clause to allow updating waiver_status from 'pending' to 'signed'
    - USING clause: Checks current state (must be pending, must be their booking)
    - WITH CHECK clause: Allows changing to 'signed' status for their bookings

  2. Security
    - Users can only update waivers that are currently 'pending'
    - Users can only update waivers for bookings they own
    - Users can change status from pending to signed
    - Prevents users from modifying other users' waivers
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can update pending waivers for their bookings" ON waivers;

-- Recreate with correct WITH CHECK clause
CREATE POLICY "Users can update pending waivers for their bookings"
  ON waivers
  FOR UPDATE
  TO authenticated
  USING (
    waiver_status = 'pending' 
    AND booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );