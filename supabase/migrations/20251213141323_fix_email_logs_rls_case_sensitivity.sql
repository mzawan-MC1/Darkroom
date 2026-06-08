/*
  # Fix email_logs RLS case sensitivity issue

  1. Changes
    - Drop existing case-sensitive policy
    - Create new case-insensitive policy for admin access to email_logs
  
  2. Security
    - Maintains admin-only access to email logs
    - Uses case-insensitive role name comparison
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;

-- Create new case-insensitive policy
CREATE POLICY "Admins can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND LOWER(r.name) = 'admin'
        AND ur.is_active = true
    )
  );
