/*
  # Fix Game Achievements RLS Case Sensitivity

  1. Problem
    - game_achievements and booking_achievements tables use lowercase role names in policies
    - Should use case-insensitive helper functions for consistency
    - Causing "Loading achievements..." issue for Admin users

  2. Solution
    - Update all RLS policies on game_achievements to use has_role() and has_any_role()
    - Update all RLS policies on booking_achievements to use has_role() and has_any_role()
    - Ensures Admin/Staff users can properly access these tables

  3. Tables Updated
    - game_achievements (all CRUD policies)
    - booking_achievements (all CRUD policies)

  4. Security
    - Maintains same security level
    - Fixes permission issues for Admin/Staff users
*/

-- Update game_achievements policies

DROP POLICY IF EXISTS "Staff can view all game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Customers can view active game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can insert game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can update game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can delete game achievements" ON game_achievements;

-- Staff/Admin can view all achievements
CREATE POLICY "Staff can view all game achievements"
  ON game_achievements FOR SELECT
  TO authenticated
  USING (has_role(ARRAY['admin', 'manager', 'staff']));

-- Customers can view active achievements
CREATE POLICY "Customers can view active game achievements"
  ON game_achievements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Staff/Admin can insert achievements
CREATE POLICY "Staff can insert game achievements"
  ON game_achievements FOR INSERT
  TO authenticated
  WITH CHECK (has_role(ARRAY['admin', 'manager', 'staff']));

-- Staff/Admin can update achievements
CREATE POLICY "Staff can update game achievements"
  ON game_achievements FOR UPDATE
  TO authenticated
  USING (has_role(ARRAY['admin', 'manager', 'staff']))
  WITH CHECK (has_role(ARRAY['admin', 'manager', 'staff']));

-- Staff/Admin can delete achievements
CREATE POLICY "Staff can delete game achievements"
  ON game_achievements FOR DELETE
  TO authenticated
  USING (has_role(ARRAY['admin', 'manager', 'staff']));

-- Update booking_achievements policies

DROP POLICY IF EXISTS "Staff can view all booking achievements" ON booking_achievements;
DROP POLICY IF EXISTS "Customers can view their own booking achievements" ON booking_achievements;
DROP POLICY IF EXISTS "Staff can insert booking achievements" ON booking_achievements;
DROP POLICY IF EXISTS "Staff can delete booking achievements" ON booking_achievements;

-- Staff/Admin can view all booking achievements
CREATE POLICY "Staff can view all booking achievements"
  ON booking_achievements FOR SELECT
  TO authenticated
  USING (has_role(ARRAY['admin', 'manager', 'staff']));

-- Customers can view their own booking achievements
CREATE POLICY "Customers can view their own booking achievements"
  ON booking_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_achievements.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- Staff/Admin can insert booking achievements
CREATE POLICY "Staff can insert booking achievements"
  ON booking_achievements FOR INSERT
  TO authenticated
  WITH CHECK (has_role(ARRAY['admin', 'manager', 'staff']));

-- Staff/Admin can delete booking achievements
CREATE POLICY "Staff can delete booking achievements"
  ON booking_achievements FOR DELETE
  TO authenticated
  USING (has_role(ARRAY['admin', 'manager', 'staff']));