/*
  # Fix SMTP Settings RLS Policies

  ## Overview
  This migration fixes the RLS policies for smtp_settings table to ensure
  admins can properly insert and update SMTP settings.

  ## Changes
  1. Drop existing policies
  2. Recreate policies with proper USING and WITH CHECK clauses
  3. Add WITH CHECK to UPDATE policy (was missing)

  ## Security
  - Only admins can insert, update, or view SMTP settings
  - Policies check both user_roles and roles tables
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can insert SMTP settings" ON smtp_settings;
DROP POLICY IF EXISTS "Admins can update SMTP settings" ON smtp_settings;

-- Recreate policies with proper clauses
CREATE POLICY "Admins can view SMTP settings"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
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
      AND r.name = 'admin'
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
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );
