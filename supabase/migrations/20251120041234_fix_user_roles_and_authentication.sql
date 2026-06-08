/*
  # Fix User Roles and Authentication System

  1. Changes
    - Add RLS policies for roles table to allow authenticated users to read role names
    - Ensure user_roles table can be joined with roles table
    - Update set_active_role function to ensure proper role activation
    - Add helper function to get user's active role

  2. Security
    - Allow all authenticated users to read role names (needed for auth context)
    - Maintain strict control on role modifications (admin only)
    - Ensure users can always read their own role assignments

  3. Notes
    - This fixes the issue where users couldn't access admin panel after being assigned admin role
    - The system now properly reads from user_roles table with is_active flag
*/

-- Enable RLS on roles table if not already enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON roles;
DROP POLICY IF EXISTS "Admins can update roles" ON roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON roles;

-- Allow all authenticated users to read roles (needed for role display)
CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

-- Only admins can delete roles (except system roles)
CREATE POLICY "Admins can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    is_system_role = false
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

-- Update set_active_role function to be more robust
CREATE OR REPLACE FUNCTION public.set_active_role(
  p_user_id uuid,
  p_role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate all roles for the user
  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = p_user_id;
  
  -- Activate the specified role if it exists
  UPDATE public.user_roles
  SET is_active = true
  WHERE user_id = p_user_id AND role_id = p_role_id;
END;
$$;

-- Create helper function to get user's active role name
CREATE OR REPLACE FUNCTION public.get_active_role_name(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT r.name INTO v_role_name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  AND ur.is_active = true
  LIMIT 1;
  
  RETURN v_role_name;
END;
$$;

-- Update user_roles policies to work with new role-based checks
DROP POLICY IF EXISTS "Admins can view all role assignments" ON user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can remove role assignments" ON user_roles;
DROP POLICY IF EXISTS "Admins can update role assignments" ON user_roles;

-- Admins can view all role assignments
CREATE POLICY "Admins can view all role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

-- Admins can assign roles to users
CREATE POLICY "Admins can assign roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

-- Admins can update role assignments
CREATE POLICY "Admins can update role assignments"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );

-- Admins can remove role assignments
CREATE POLICY "Admins can remove role assignments"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'Admin'
      AND ur.is_active = true
    )
  );
