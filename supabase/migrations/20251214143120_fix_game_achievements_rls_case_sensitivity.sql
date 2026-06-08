/*
  # Fix Game Achievements RLS Case Sensitivity

  1. Changes
    - Updates RLS policies on game_achievements table to use proper case-insensitive role name matching
    - Fixes INSERT, UPDATE, DELETE, and SELECT policies
    - Changes from r.name IN ('admin', 'staff') to r.name ILIKE ANY (ARRAY['admin', 'staff'])

  2. Security
    - Maintains same security level
    - Ensures Admin and Staff roles can manage achievements regardless of case
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view all game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can insert game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can update game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can delete game achievements" ON game_achievements;

-- Recreate with case-insensitive matching

-- Admin/staff can view all achievements
CREATE POLICY "Staff can view all game achievements"
  ON game_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.name ILIKE 'admin' OR r.name ILIKE 'staff')
      AND ur.is_active = true
    )
  );

-- Admin/staff can insert achievements
CREATE POLICY "Staff can insert game achievements"
  ON game_achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.name ILIKE 'admin' OR r.name ILIKE 'staff')
      AND ur.is_active = true
    )
  );

-- Admin/staff can update achievements
CREATE POLICY "Staff can update game achievements"
  ON game_achievements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.name ILIKE 'admin' OR r.name ILIKE 'staff')
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.name ILIKE 'admin' OR r.name ILIKE 'staff')
      AND ur.is_active = true
    )
  );

-- Admin/staff can delete achievements
CREATE POLICY "Staff can delete game achievements"
  ON game_achievements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.name ILIKE 'admin' OR r.name ILIKE 'staff')
      AND ur.is_active = true
    )
  );
