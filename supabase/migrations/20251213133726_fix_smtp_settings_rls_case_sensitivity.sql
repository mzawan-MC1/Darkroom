/*
  # Fix SMTP Settings RLS Case Sensitivity

  ## Overview
  This migration fixes the case sensitivity issue in SMTP settings RLS policies.
  The policies were checking for 'admin' (lowercase) but the actual role name 
  in the database is 'Admin' (capitalized).

  ## Changes
  1. Drop existing policies
  2. Recreate policies with correct role name case ('Admin' instead of 'admin')

  ## Security
  - Only users with the 'Admin' role can access SMTP settings
  - Policies now correctly match the role names in the database
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can insert SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can update SMTP settings" ON smtp_settings;

-- Recreate policies with correct role name case
CREATE POLICY "Admins can view SMTP settings"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can insert SMTP settings"
  ON smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can update SMTP settings"
  ON smtp_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );
