/*
  # Fix User Roles Infinite Recursion - Final Solution

  ## Problem
  The user_roles policies query user_roles table within their own policies,
  causing infinite recursion. When checking SELECT permission, Postgres evaluates
  the policy which queries user_roles, triggering the same policy again.

  ## Solution
  Create a security definer function that bypasses RLS to check permissions,
  then use this function in policies instead of directly querying user_roles.

  ## Changes
  1. Create helper function to check user permissions (bypasses RLS)
  2. Drop all existing user_roles policies
  3. Create new policies using the helper function
*/

-- Create a security definer function to check if user has a specific permission
-- This function bypasses RLS so it won't cause recursion
CREATE OR REPLACE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text)
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
      AND (r.permissions->>permission_name)::boolean = true
  );
END;
$$;

-- Drop all existing user_roles policies
DROP POLICY IF EXISTS "Users can view own role assignments" ON user_roles;
DROP POLICY IF EXISTS "Users with roles.view can view all role assignments" ON user_roles;
DROP POLICY IF EXISTS "Users with roles.create can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Users with roles.edit can update role assignments" ON user_roles;
DROP POLICY IF EXISTS "Users with roles.delete can remove role assignments" ON user_roles;

-- Create new policies using the helper function (no recursion)
CREATE POLICY "Allow users to view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    user_has_permission(auth.uid(), 'roles.view')
  );

CREATE POLICY "Allow users with permission to assign roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_permission(auth.uid(), 'roles.create')
  );

CREATE POLICY "Allow users with permission to update roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), 'roles.edit')
  );

CREATE POLICY "Allow users with permission to delete roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), 'roles.delete')
  );
