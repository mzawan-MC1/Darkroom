-- Fix RLS policy to allow users to sign their waivers
-- Previous policy prevented changing status from 'pending' to 'signed'

DROP POLICY IF EXISTS "Users can update pending waivers for their bookings" ON waivers;

CREATE POLICY "Users can update their own booking waivers"
  ON waivers
  FOR UPDATE
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );
