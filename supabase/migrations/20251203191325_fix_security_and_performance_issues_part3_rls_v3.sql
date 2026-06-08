/*
  # Security and Performance Optimization - Part 3: RLS Performance (Continued) - Fixed v2

  ## Overview
  Continues optimization of RLS policies for remaining tables.
  Correctly handles column references for each table.

  ## Changes
  Updates remaining RLS policies to use optimized `(select auth.uid())` pattern for:
  - Invoices (via booking_id join)
  - Invoice Line Items  
  - Invoice Payments
  - Bookings
  - Roles
  - Site Settings
  - Email Notifications (via recipient_user_id)
  - Promo Code Usage
  - Waivers
*/

-- Invoices Policies (use booking_id to link to users)
DROP POLICY IF EXISTS "Admin can delete invoices" ON invoices;
CREATE POLICY "Admin can delete invoices"
  ON invoices FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert invoices" ON invoices;
CREATE POLICY "Admin can insert invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update invoices" ON invoices;
CREATE POLICY "Admin can update invoices"
  ON invoices FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Staff can update invoices" ON invoices;
CREATE POLICY "Staff can update invoices"
  ON invoices FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Staff can view all invoices" ON invoices;
CREATE POLICY "Staff can view all invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = invoices.booking_id
      AND bookings.user_id = (select auth.uid())
    )
  );

-- Invoice Line Items Policies
DROP POLICY IF EXISTS "Admin can manage invoice line items" ON invoice_line_items;
CREATE POLICY "Admin can manage invoice line items"
  ON invoice_line_items FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "Staff can view all invoice line items" ON invoice_line_items;
CREATE POLICY "Staff can view all invoice line items"
  ON invoice_line_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can view their invoice line items" ON invoice_line_items;
CREATE POLICY "Users can view their invoice line items"
  ON invoice_line_items FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT inv.id FROM invoices inv
      INNER JOIN bookings b ON b.id = inv.booking_id
      WHERE b.user_id = (select auth.uid())
    )
  );

-- Invoice Payments Policies
DROP POLICY IF EXISTS "Staff can create invoice payments" ON invoice_payments;
CREATE POLICY "Staff can create invoice payments"
  ON invoice_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Staff can view all invoice payments" ON invoice_payments;
CREATE POLICY "Staff can view all invoice payments"
  ON invoice_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can view their invoice payments" ON invoice_payments;
CREATE POLICY "Users can view their invoice payments"
  ON invoice_payments FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT inv.id FROM invoices inv
      INNER JOIN bookings b ON b.id = inv.booking_id
      WHERE b.user_id = (select auth.uid())
    )
  );

-- Bookings Policies
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;
CREATE POLICY "Authenticated users can create bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Staff update any booking" ON bookings;
CREATE POLICY "Staff update any booking"
  ON bookings FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Update own pending bookings" ON bookings;
CREATE POLICY "Update own pending bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid())
    AND booking_status = 'pending'
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND booking_status = 'pending'
  );

DROP POLICY IF EXISTS "View own or all bookings" ON bookings;
CREATE POLICY "View own or all bookings"
  ON bookings FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

-- Roles Policies
DROP POLICY IF EXISTS "Admins can delete roles" ON roles;
CREATE POLICY "Admins can delete roles"
  ON roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert roles" ON roles;
CREATE POLICY "Admins can insert roles"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update roles" ON roles;
CREATE POLICY "Admins can update roles"
  ON roles FOR UPDATE TO authenticated
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

-- Site Settings Policies
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL TO authenticated
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

-- Email Notifications Policies (use recipient_user_id)
DROP POLICY IF EXISTS "Admins can manage email notifications" ON email_notifications;
CREATE POLICY "Admins can manage email notifications"
  ON email_notifications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'customer_service')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'customer_service')
    )
  );

DROP POLICY IF EXISTS "Users can view own email notifications" ON email_notifications;
CREATE POLICY "Users can view own email notifications"
  ON email_notifications FOR SELECT TO authenticated
  USING (recipient_user_id = (select auth.uid()));

-- Promo Code Usage Policies
DROP POLICY IF EXISTS "Users can view own promo usage" ON promo_code_usage;
CREATE POLICY "Users can view own promo usage"
  ON promo_code_usage FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Waivers Policies (handle NULL user_id properly)
DROP POLICY IF EXISTS "Customers can update own pending waivers" ON waivers;
CREATE POLICY "Customers can update own pending waivers"
  ON waivers FOR UPDATE TO authenticated
  USING (
    waiver_status = 'pending' 
    AND booking_id IN (SELECT id FROM bookings WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    waiver_status = 'pending' 
    AND booking_id IN (SELECT id FROM bookings WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Staff can update all waivers" ON waivers;
CREATE POLICY "Staff can update all waivers"
  ON waivers FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Staff can update waivers" ON waivers;
CREATE POLICY "Staff can update waivers"
  ON waivers FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Users can create waivers for their bookings" ON waivers;
CREATE POLICY "Users can create waivers for their bookings"
  ON waivers FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) IN (
      SELECT user_id FROM bookings WHERE id = booking_id
    )
  );

DROP POLICY IF EXISTS "Users can read waivers for their bookings" ON waivers;
CREATE POLICY "Users can read waivers for their bookings"
  ON waivers FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update pending waivers for their bookings" ON waivers;
CREATE POLICY "Users can update pending waivers for their bookings"
  ON waivers FOR UPDATE TO authenticated
  USING (
    waiver_status = 'pending' 
    AND booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    waiver_status = 'pending' 
    AND booking_id IN (
      SELECT id FROM bookings WHERE user_id = (select auth.uid())
    )
  );
