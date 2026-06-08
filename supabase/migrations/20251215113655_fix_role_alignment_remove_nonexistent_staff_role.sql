/*
  # Fix Role Alignment - Remove Non-existent 'staff' Role

  1. Problem
    - Multiple RLS policies reference 'staff' role which doesn't exist in the database
    - Actual roles in database: Admin, Manager, Customer
    - This causes policies to fail for legitimate admin/manager users

  2. Solution
    - Drop all policies that reference 'staff'
    - Recreate them with correct roles: ['admin', 'manager']
    
  3. Affected Tables
    - bookings (2 policies)
    - waivers (1 policy)
    - booking_achievements (3 policies)
    - game_achievements (4 policies)

  4. Security
    - Admin and Manager users will have proper access
    - Customer users remain restricted to their own data
*/

-- ============================================
-- BOOKINGS TABLE
-- ============================================

-- Drop and recreate bookings policies with correct roles
DROP POLICY IF EXISTS "Staff can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can update any booking" ON bookings;

CREATE POLICY "Admin and Manager can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can update any booking"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  )
  WITH CHECK (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

-- ============================================
-- WAIVERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Staff can view all waivers" ON waivers;

CREATE POLICY "Admin and Manager can view all waivers"
  ON waivers
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

-- ============================================
-- BOOKING_ACHIEVEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Staff can view all booking achievements" ON booking_achievements;
DROP POLICY IF EXISTS "Staff can insert booking achievements" ON booking_achievements;
DROP POLICY IF EXISTS "Staff can delete booking achievements" ON booking_achievements;

CREATE POLICY "Admin and Manager can view all booking achievements"
  ON booking_achievements
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can insert booking achievements"
  ON booking_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can delete booking achievements"
  ON booking_achievements
  FOR DELETE
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

-- ============================================
-- GAME_ACHIEVEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Staff can view all game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can insert game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can update game achievements" ON game_achievements;
DROP POLICY IF EXISTS "Staff can delete game achievements" ON game_achievements;

CREATE POLICY "Admin and Manager can view all game achievements"
  ON game_achievements
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can insert game achievements"
  ON game_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can update game achievements"
  ON game_achievements
  FOR UPDATE
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  )
  WITH CHECK (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can delete game achievements"
  ON game_achievements
  FOR DELETE
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );
