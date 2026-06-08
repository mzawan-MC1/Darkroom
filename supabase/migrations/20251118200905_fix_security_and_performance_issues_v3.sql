/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes for foreign keys on `roles` and `user_roles` tables
    - Optimize RLS policies to use `(select auth.uid())` pattern to prevent re-evaluation
    - Remove unused indexes that provide no benefit
    - Fix function search path security issue

  2. Changes Made
    - **Indexes Added:**
      - `idx_roles_created_by` on `roles(created_by)`
      - `idx_user_roles_assigned_by` on `user_roles(assigned_by)`
    
    - **Indexes Removed:**
      - All unused indexes on bookings, waivers, merchandise, orders, reviews, blog_posts, pos_sessions, lobby_game_passes, user_roles tables
    
    - **RLS Policies Updated:**
      - All policies using `auth.uid()` changed to `(select auth.uid())`
      - Affects policies on `roles` and `user_roles` tables
    
    - **Function Fixed:**
      - `update_updated_at_column` - Set immutable search path

  3. Security Notes
    - These changes improve query performance at scale
    - RLS security is maintained while reducing overhead
    - Multiple permissive policies are intentional for different access patterns
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_roles_created_by ON public.roles(created_by);
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON public.user_roles(assigned_by);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_game_time_slots_game_id;
DROP INDEX IF EXISTS idx_bookings_date;
DROP INDEX IF EXISTS idx_bookings_user;
DROP INDEX IF EXISTS idx_bookings_game;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_booking_addon_items_addon_id;
DROP INDEX IF EXISTS idx_booking_addon_items_booking_id;
DROP INDEX IF EXISTS idx_waivers_user;
DROP INDEX IF EXISTS idx_waivers_booking_id;
DROP INDEX IF EXISTS idx_merchandise_game_id;
DROP INDEX IF EXISTS idx_orders_user;
DROP INDEX IF EXISTS idx_orders_booking_id;
DROP INDEX IF EXISTS idx_order_items_merchandise_id;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_promo_codes_code;
DROP INDEX IF EXISTS idx_promo_codes_created_by;
DROP INDEX IF EXISTS idx_reviews_game;
DROP INDEX IF EXISTS idx_reviews_published;
DROP INDEX IF EXISTS idx_reviews_booking_id;
DROP INDEX IF EXISTS idx_reviews_user_id;
DROP INDEX IF EXISTS idx_blog_posts_author_id;
DROP INDEX IF EXISTS idx_pos_sessions_staff_id;
DROP INDEX IF EXISTS idx_lobby_game_passes_lobby_game_id;
DROP INDEX IF EXISTS idx_lobby_game_passes_order_id;
DROP INDEX IF EXISTS idx_user_roles_role_id;

-- Fix RLS policies on roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.roles;
CREATE POLICY "Admins can view all roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create roles" ON public.roles;
CREATE POLICY "Admins can create roles"
  ON public.roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update non-system roles" ON public.roles;
CREATE POLICY "Admins can update non-system roles"
  ON public.roles FOR UPDATE
  TO authenticated
  USING (
    NOT is_system_role
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    NOT is_system_role
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete non-system roles" ON public.roles;
CREATE POLICY "Admins can delete non-system roles"
  ON public.roles FOR DELETE
  TO authenticated
  USING (
    NOT is_system_role
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Fix RLS policies on user_roles table
DROP POLICY IF EXISTS "Users can view own role assignments" ON public.user_roles;
CREATE POLICY "Users can view own role assignments"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all role assignments" ON public.user_roles;
CREATE POLICY "Admins can view all role assignments"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can remove role assignments" ON public.user_roles;
CREATE POLICY "Admins can remove role assignments"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Fix function search path by replacing it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
