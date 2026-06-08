/*
  # Fix Security Issues - Part 2: Optimize RLS Policies

  1. Optimize RLS Policies
    - Wraps auth.uid() in (SELECT auth.uid()) to prevent re-evaluation per row
    - Dramatically improves performance at scale
    - Applies to booking_participants, booking_slots, and game_schedules
*/

-- =====================================================
-- BOOKING_PARTICIPANTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Users can insert own booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Users can update own booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Users can delete own booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can view all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can insert all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can update all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can delete all booking participants" ON booking_participants;

CREATE POLICY "Users can view own booking participants"
  ON booking_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert own booking participants"
  ON booking_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own booking participants"
  ON booking_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own booking participants"
  ON booking_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can view all booking participants"
  ON booking_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
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
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );