/*
  # Comprehensive Fix for Role Name Case Sensitivity - v2

  1. Problem
    - Role names in database are capitalized: 'Admin', 'Manager', 'Customer'
    - Many RLS policies check for lowercase: 'admin', 'staff', 'customer'
    - This causes permission failures throughout the application

  2. Solution
    - Create helper functions for case-insensitive role checking
    - Update ALL existing RLS policies to use these functions
    - Ensures consistent behavior across the entire application

  3. Tables Updated
    - email_templates, email_logs, smtp_settings
    - bookings, merchandise, merchandise_variants

  4. Security
    - Maintains same security level
    - Ensures permissions work regardless of role name casing
*/

-- Create helper functions for case-insensitive role checking
CREATE OR REPLACE FUNCTION has_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name ILIKE ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_any_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name ILIKE required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION has_any_role(text) TO authenticated;

-- Update email_templates policies
DROP POLICY IF EXISTS "Admins can delete email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can insert email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can update email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can view email templates" ON email_templates;

CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (has_any_role('admin'));

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role('admin'));

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (has_any_role('admin'))
  WITH CHECK (has_any_role('admin'));

CREATE POLICY "Admins can delete email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (has_any_role('admin'));

-- Update email_logs policies
DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;

CREATE POLICY "Admins can view all email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (has_any_role('admin'));

-- Update smtp_settings policies
DROP POLICY IF EXISTS "Admins can view SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can insert SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can update SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can delete SMTP settings" ON smtp_settings;

CREATE POLICY "Admins can view SMTP settings"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (has_any_role('admin'));

CREATE POLICY "Admins can insert SMTP settings"
  ON smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role('admin'));

CREATE POLICY "Admins can update SMTP settings"
  ON smtp_settings FOR UPDATE
  TO authenticated
  USING (has_any_role('admin'))
  WITH CHECK (has_any_role('admin'));

CREATE POLICY "Admins can delete SMTP settings"
  ON smtp_settings FOR DELETE
  TO authenticated
  USING (has_any_role('admin'));

-- Update bookings policies for staff/admin access
DROP POLICY IF EXISTS "Staff can update any booking" ON bookings;

CREATE POLICY "Staff can update any booking"
  ON bookings FOR UPDATE
  TO authenticated
  USING (has_role(ARRAY['admin', 'manager', 'staff']))
  WITH CHECK (has_role(ARRAY['admin', 'manager', 'staff']));

-- Update merchandise policies
DROP POLICY IF EXISTS "Admin can manage merchandise" ON merchandise;
DROP POLICY IF EXISTS "Admin can insert merchandise" ON merchandise;
DROP POLICY IF EXISTS "Admin can update merchandise" ON merchandise;
DROP POLICY IF EXISTS "Admin can delete merchandise" ON merchandise;

CREATE POLICY "Admin can manage merchandise"
  ON merchandise FOR ALL
  TO authenticated
  USING (has_any_role('admin'))
  WITH CHECK (has_any_role('admin'));

-- Update merchandise_variants policies
DROP POLICY IF EXISTS "Admin can manage merchandise variants" ON merchandise_variants;
DROP POLICY IF EXISTS "Admin can insert merchandise variants" ON merchandise_variants;
DROP POLICY IF EXISTS "Admin can update merchandise variants" ON merchandise_variants;
DROP POLICY IF EXISTS "Admin can delete merchandise variants" ON merchandise_variants;

CREATE POLICY "Admin can manage merchandise variants"
  ON merchandise_variants FOR ALL
  TO authenticated
  USING (has_any_role('admin'))
  WITH CHECK (has_any_role('admin'));
