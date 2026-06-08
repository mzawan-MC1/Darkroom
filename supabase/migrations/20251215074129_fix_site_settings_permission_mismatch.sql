/*
  # Fix Site Settings Permission Mismatch

  ## Problem
  The site_settings RLS policies check for 'settings.edit' permission, but the Admin role 
  has 'site_settings.edit' permission. This prevents admins from updating site settings.

  ## Solution
  Update the site_settings RLS policies to use the correct permission name 'site_settings.edit'
  to match the Admin role's permissions.

  ## Changes
  1. Drop existing site_settings policies
  2. Create new policies using 'site_settings.edit' permission
*/

-- Drop existing site_settings policies
DROP POLICY IF EXISTS "Anyone can view site settings" ON site_settings;
DROP POLICY IF EXISTS "Authorized users can manage site settings" ON site_settings;

-- Create new policy for viewing (anyone can view)
CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  USING (true);

-- Create new policy for managing (requires site_settings.edit permission)
CREATE POLICY "Authorized users can manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'site_settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'site_settings.edit'));