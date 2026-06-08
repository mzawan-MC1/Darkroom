/*
  # Add Customer Read Access to Game Schedules

  1. Security Update
    - Add SELECT policy for all authenticated users on game_schedules table
    - This allows customers to view game schedules when browsing available booking slots
    - Only active schedules are visible to non-admin users
    - Required for the booking_slots query with inner join on game_schedules
*/

-- Allow all authenticated users to view active game schedules
CREATE POLICY "All users can view active game schedules"
  ON game_schedules FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );