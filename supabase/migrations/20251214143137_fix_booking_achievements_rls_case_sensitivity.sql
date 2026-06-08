/*
  # Fix Booking Achievements RLS Case Sensitivity

  1. Changes
    - Updates RLS policies on booking_achievements table to use proper case-insensitive role name matching
    - Fixes INSERT, DELETE, and SELECT policies for staff
    - Changes from r.name IN ('admin', 'staff') to r.name ILIKE ANY for proper case handling

  2. Security
    - Maintains same security level
    - Ensures Admin and Staff roles can manage booking achievements regardless of case
*/

-- Drop existing staff policies
DROP POLICY IF EXISTS "Staff can view all booking achievements" ON booking_achievements;
DROP POLICY IF EXISTS "Staff can insert booking achievements" ON booking_achievements;
DROP POLICY IF EXISTS "Staff can delete booking achievements" ON booking_achievements;

-- Recreate with case-insensitive matching

-- Admin/staff can view all booking achievements
CREATE POLICY "Staff can view all booking achievements"
  ON booking_achievements FOR SELECT
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

-- Admin/staff can insert booking achievements
CREATE POLICY "Staff can insert booking achievements"
  ON booking_achievements FOR INSERT
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

-- Admin/staff can delete booking achievements
CREATE POLICY "Staff can delete booking achievements"
  ON booking_achievements FOR DELETE
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
