/*
  # Fix Email Templates RLS Case Sensitivity

  ## Overview
  This migration fixes the case sensitivity issue in email_templates RLS policies.
  The policies were checking for 'admin' (lowercase) but the actual role name 
  in the database is 'Admin' (capitalized).

  ## Changes
  1. Drop existing policies
  2. Recreate policies with correct role name case ('Admin' instead of 'admin')
  3. Add missing WITH CHECK clauses for UPDATE and DELETE policies

  ## Security
  - Only users with the 'Admin' role can manage email templates
  - Policies now correctly match the role names in the database
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can insert email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can update email templates" ON email_templates;
DROP POLICY IF EXISTS "Admins can delete email templates" ON email_templates;

-- Recreate policies with correct role name case
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
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

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
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

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
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

CREATE POLICY "Admins can delete email templates"
  ON email_templates FOR DELETE
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
