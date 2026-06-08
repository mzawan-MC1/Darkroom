/*
  # Fix page_seo RLS policies case sensitivity issue

  1. Changes
    - Update INSERT, UPDATE, and DELETE policies to use case-insensitive role name matching
    - Replace exact match ('admin', 'super_admin') with ILIKE for case-insensitive comparison
    
  2. Security
    - Maintains same security level while fixing case sensitivity bug
    - Admins can still manage page SEO settings
    - Public can still read page SEO
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert page SEO" ON page_seo;
DROP POLICY IF EXISTS "Admins can update page SEO" ON page_seo;
DROP POLICY IF EXISTS "Admins can delete page SEO" ON page_seo;

-- Recreate policies with case-insensitive role matching
CREATE POLICY "Admins can insert page SEO"
  ON page_seo FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND (LOWER(roles.name) = 'admin' OR LOWER(roles.name) = 'super_admin')
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can update page SEO"
  ON page_seo FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND (LOWER(roles.name) = 'admin' OR LOWER(roles.name) = 'super_admin')
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND (LOWER(roles.name) = 'admin' OR LOWER(roles.name) = 'super_admin')
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can delete page SEO"
  ON page_seo FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND (LOWER(roles.name) = 'admin' OR LOWER(roles.name) = 'super_admin')
      AND user_roles.is_active = true
    )
  );