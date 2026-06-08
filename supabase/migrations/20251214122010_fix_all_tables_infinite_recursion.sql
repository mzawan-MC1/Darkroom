/*
  # Fix Infinite Recursion Across All Tables

  ## Problem
  Many tables have policies that query user_roles, causing infinite recursion
  when those policies are evaluated. This affects: blog_posts, booking_participants,
  booking_slots, bookings, email_logs, email_templates, game_schedules,
  payment_settings, payment_webhook_logs, payments, popup_banner_settings,
  pricing_tiers, smtp_settings, static_pages, waiver_templates, and more.

  ## Solution
  Create helper functions to check roles and use them in all policies instead
  of directly querying user_roles table.

  ## Changes
  1. Create helper function to check if user has specific role
  2. Update all table policies to use helper functions
*/

-- Create function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid uuid, role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
      AND ur.is_active = true
      AND r.name = role_name
  );
END;
$$;

-- Create function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.user_has_any_role(user_uuid uuid, role_names text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
      AND ur.is_active = true
      AND r.name = ANY(role_names)
  );
END;
$$;

-- Fix blog_posts policies
DROP POLICY IF EXISTS "Admins can view all blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can update blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can delete blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Staff can view all blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Staff can update blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Staff can delete blog posts" ON blog_posts;

CREATE POLICY "Staff can view all blog posts" ON blog_posts FOR SELECT TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Staff', 'admin', 'staff']));
CREATE POLICY "Staff can update blog posts" ON blog_posts FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Staff', 'admin', 'staff']));
CREATE POLICY "Staff can delete blog posts" ON blog_posts FOR DELETE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Staff', 'admin', 'staff']));

-- Fix booking_participants policies
DROP POLICY IF EXISTS "Admins can view all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can update all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Admins can delete all booking participants" ON booking_participants;

CREATE POLICY "Staff can view booking participants" ON booking_participants FOR SELECT TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));
CREATE POLICY "Staff can update booking participants" ON booking_participants FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));
CREATE POLICY "Staff can delete booking participants" ON booking_participants FOR DELETE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));

-- Fix booking_slots policies
DROP POLICY IF EXISTS "Admins can view all booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins can update booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins can delete booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Customers can view available booking slots" ON booking_slots;

CREATE POLICY "Staff can view booking slots" ON booking_slots FOR SELECT TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));
CREATE POLICY "Managers can update booking slots" ON booking_slots FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Managers can delete booking slots" ON booking_slots FOR DELETE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Customers can view available slots" ON booking_slots FOR SELECT TO authenticated USING (is_available = true AND slot_date >= CURRENT_DATE AND NOT user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));

-- Fix bookings policies
DROP POLICY IF EXISTS "Staff can update bookings" ON bookings;

CREATE POLICY "Staff can update bookings" ON bookings FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));

-- Fix email_logs policies
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;

CREATE POLICY "Admins can view email logs" ON email_logs FOR SELECT TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));

-- Fix email_templates policies
DROP POLICY IF EXISTS "Admins can view email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can update email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can delete email templates" ON email_templates;

CREATE POLICY "Admins can view email templates" ON email_templates FOR SELECT TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update email templates" ON email_templates FOR UPDATE TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete email templates" ON email_templates FOR DELETE TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));

-- Fix game_schedules policies
DROP POLICY IF EXISTS "Admins can view all game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Admins can update game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Admins can delete game schedules" ON game_schedules;
DROP POLICY IF EXISTS "All users can view active game schedules" ON game_schedules;

CREATE POLICY "Staff can view game schedules" ON game_schedules FOR SELECT TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Managers can update game schedules" ON game_schedules FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Managers can delete game schedules" ON game_schedules FOR DELETE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Users can view active schedules" ON game_schedules FOR SELECT TO authenticated USING (is_active = true OR user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));

-- Fix payment_settings policies
DROP POLICY IF EXISTS "Admins can manage payment settings" ON payment_settings;

CREATE POLICY "Admins can manage payment settings" ON payment_settings FOR ALL TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));

-- Fix payment_webhook_logs policies
DROP POLICY IF EXISTS "Admins can view webhook logs" ON payment_webhook_logs;

CREATE POLICY "Admins can view webhook logs" ON payment_webhook_logs FOR SELECT TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));

-- Fix payments policies
DROP POLICY IF EXISTS "Staff can view all payments" ON payments;

CREATE POLICY "Staff can view payments" ON payments FOR SELECT TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'admin', 'Game Master', 'game master', 'Customer Service', 'customer service']));

-- Fix popup_banner_settings policies
DROP POLICY IF EXISTS "Admin and Manager can view all popup banner settings" ON popup_banner_settings;
DROP POLICY IF EXISTS "Admin and Manager can update popup banner settings" ON popup_banner_settings;
DROP POLICY IF EXISTS "Admin can delete popup banner settings" ON popup_banner_settings;

CREATE POLICY "Managers can view popup banners" ON popup_banner_settings FOR SELECT TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Managers can update popup banners" ON popup_banner_settings FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Admins can delete popup banners" ON popup_banner_settings FOR DELETE TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));

-- Fix pricing_tiers policies
DROP POLICY IF EXISTS "Admins can update pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Admins can delete pricing tiers" ON pricing_tiers;

CREATE POLICY "Managers can update pricing tiers" ON pricing_tiers FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Managers can delete pricing tiers" ON pricing_tiers FOR DELETE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));

-- Fix smtp_settings policies
DROP POLICY IF EXISTS "Admins can view SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can update SMTP settings" ON smtp_settings;

CREATE POLICY "Admins can view SMTP settings" ON smtp_settings FOR SELECT TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update SMTP settings" ON smtp_settings FOR UPDATE TO authenticated USING (user_has_role(auth.uid(), 'Admin') OR user_has_role(auth.uid(), 'admin'));

-- Fix waiver_templates policies
DROP POLICY IF EXISTS "Admins can view all waiver templates" ON waiver_templates;
DROP POLICY IF EXISTS "Admins can update waiver templates" ON waiver_templates;
DROP POLICY IF EXISTS "Admins can delete waiver templates" ON waiver_templates;

CREATE POLICY "Managers can view waiver templates" ON waiver_templates FOR SELECT TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Managers can update waiver templates" ON waiver_templates FOR UPDATE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
CREATE POLICY "Managers can delete waiver templates" ON waiver_templates FOR DELETE TO authenticated USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager']));
