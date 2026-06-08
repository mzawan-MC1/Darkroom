/*
  # Fix RLS Policies - Role Name Case Sensitivity

  1. Update RLS Policies to Match Actual Role Names
    - Changes 'admin' to 'Admin' 
    - Changes 'super_admin' to 'Super Admin' (if exists)
    - Applies to all tables with admin-specific policies
*/

-- =====================================================
-- GAME_SCHEDULES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Admins can insert game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Admins can update game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Admins can delete game schedules" ON game_schedules;

CREATE POLICY "Admins can view all game schedules"
  ON game_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Admins can insert game schedules"
  ON game_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Admins can update game schedules"
  ON game_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Admins can delete game schedules"
  ON game_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

-- =====================================================
-- BOOKING_SLOTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Customers can view available booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins can insert booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins can update booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins can delete booking slots" ON booking_slots;

CREATE POLICY "Admins can view all booking slots"
  ON booking_slots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );

CREATE POLICY "Customers can view available booking slots"
  ON booking_slots FOR SELECT
  TO authenticated
  USING (
    is_available = true
    AND slot_date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );

CREATE POLICY "Admins can insert booking slots"
  ON booking_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Admins can update booking slots"
  ON booking_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Admins can delete booking slots"
  ON booking_slots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

-- =====================================================
-- BOOKING_PARTICIPANTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can insert all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can update all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can delete all booking participants" ON booking_participants;

CREATE POLICY "Admins can view all booking participants"
  ON booking_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );

CREATE POLICY "Admins can insert all booking participants"
  ON booking_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );

CREATE POLICY "Admins can update all booking participants"
  ON booking_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );

CREATE POLICY "Admins can delete all booking participants"
  ON booking_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );