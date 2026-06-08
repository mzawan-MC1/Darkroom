/*
  # Security and Performance Optimization - Part 2: RLS Performance

  ## Overview
  Optimizes Row Level Security policies by using the `(select auth.uid())` pattern
  instead of calling `auth.uid()` directly in policy expressions.

  ## Why This Matters
  When `auth.uid()` is called directly in RLS policies, PostgreSQL re-evaluates
  it for every row. By wrapping it in a SELECT, the function is called once and
  the result is reused for all rows, dramatically improving performance.

  ## Changes
  Updates all RLS policies to use the optimized pattern:
  - `auth.uid()` → `(select auth.uid())`
  - Affects 60+ policies across multiple tables

  ## Security
  - Maintains same security guarantees
  - Improves performance at scale
  - Prevents potential DoS through slow queries
*/

-- Merchandise Images Policies
DROP POLICY IF EXISTS "Admin can delete merchandise images" ON merchandise_images;
CREATE POLICY "Admin can delete merchandise images"
  ON merchandise_images FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert merchandise images" ON merchandise_images;
CREATE POLICY "Admin can insert merchandise images"
  ON merchandise_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update merchandise images" ON merchandise_images;
CREATE POLICY "Admin can update merchandise images"
  ON merchandise_images FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Merchandise Variants Policies
DROP POLICY IF EXISTS "Admin can delete merchandise variants" ON merchandise_variants;
CREATE POLICY "Admin can delete merchandise variants"
  ON merchandise_variants FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert merchandise variants" ON merchandise_variants;
CREATE POLICY "Admin can insert merchandise variants"
  ON merchandise_variants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update merchandise variants" ON merchandise_variants;
CREATE POLICY "Admin can update merchandise variants"
  ON merchandise_variants FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Lobby Games Policies
DROP POLICY IF EXISTS "Admins can manage lobby games" ON lobby_games;
CREATE POLICY "Admins can manage lobby games"
  ON lobby_games FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Lobby Game Passes Policies
DROP POLICY IF EXISTS "Customers can create own lobby game passes" ON lobby_game_passes;
CREATE POLICY "Customers can create own lobby game passes"
  ON lobby_game_passes FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view own lobby game passes" ON lobby_game_passes;
CREATE POLICY "Customers can view own lobby game passes"
  ON lobby_game_passes FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view own lobby passes" ON lobby_game_passes;
CREATE POLICY "Customers can view own lobby passes"
  ON lobby_game_passes FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Booking Participants Policies
DROP POLICY IF EXISTS "Add booking participants" ON booking_participants;
CREATE POLICY "Add booking participants"
  ON booking_participants FOR INSERT TO authenticated
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "View booking participants" ON booking_participants;
CREATE POLICY "View booking participants"
  ON booking_participants FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  );

-- Game Schedules Policies
DROP POLICY IF EXISTS "View active game schedules" ON game_schedules;
CREATE POLICY "View active game schedules"
  ON game_schedules FOR SELECT TO authenticated
  USING (
    is_active = true OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master')
    )
  );

-- Booking Slots Policies
DROP POLICY IF EXISTS "View available booking slots" ON booking_slots;
CREATE POLICY "View available booking slots"
  ON booking_slots FOR SELECT TO authenticated
  USING (
    is_available = true OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

-- User Roles Policies
DROP POLICY IF EXISTS "Admins can assign roles" ON user_roles;
CREATE POLICY "Admins can assign roles"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can remove role assignments" ON user_roles;
CREATE POLICY "Admins can remove role assignments"
  ON user_roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update role assignments" ON user_roles;
CREATE POLICY "Admins can update role assignments"
  ON user_roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all role assignments" ON user_roles;
CREATE POLICY "Admins can view all role assignments"
  ON user_roles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own role assignments" ON user_roles;
CREATE POLICY "Users can view own role assignments"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Chat Conversations Policies
DROP POLICY IF EXISTS "Admins can view all conversations" ON chat_conversations;
CREATE POLICY "Admins can view all conversations"
  ON chat_conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can update their conversations" ON chat_conversations;
CREATE POLICY "Users can update their conversations"
  ON chat_conversations FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own conversations" ON chat_conversations;
CREATE POLICY "Users can view their own conversations"
  ON chat_conversations FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Chat Messages Policies
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
CREATE POLICY "Admins can view all messages"
  ON chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations WHERE user_id = (select auth.uid())
    )
  );

-- Booking Types Policies
DROP POLICY IF EXISTS "Admin can manage booking types" ON booking_types;
CREATE POLICY "Admin can manage booking types"
  ON booking_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Booking Add-ons Policies
DROP POLICY IF EXISTS "Admin can manage add-ons" ON booking_add_ons;
CREATE POLICY "Admin can manage add-ons"
  ON booking_add_ons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Booking Add-on Selections Policies
DROP POLICY IF EXISTS "Admin can manage all booking add-ons" ON booking_add_on_selections;
CREATE POLICY "Admin can manage all booking add-ons"
  ON booking_add_on_selections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Staff can view all booking add-ons" ON booking_add_on_selections;
CREATE POLICY "Staff can view all booking add-ons"
  ON booking_add_on_selections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can add add-ons to their bookings" ON booking_add_on_selections;
CREATE POLICY "Users can add add-ons to their bookings"
  ON booking_add_on_selections FOR INSERT TO authenticated
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view their booking add-ons" ON booking_add_on_selections;
CREATE POLICY "Users can view their booking add-ons"
  ON booking_add_on_selections FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  );

-- Booking Confirmations Policies
DROP POLICY IF EXISTS "Staff can create confirmations" ON booking_confirmations;
CREATE POLICY "Staff can create confirmations"
  ON booking_confirmations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Staff can view all confirmations" ON booking_confirmations;
CREATE POLICY "Staff can view all confirmations"
  ON booking_confirmations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can view their booking confirmations" ON booking_confirmations;
CREATE POLICY "Users can view their booking confirmations"
  ON booking_confirmations FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  );

-- Continue in next part due to size...
