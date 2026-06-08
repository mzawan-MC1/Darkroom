/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The RLS policies for `profiles` and `user_roles` tables have circular dependencies:
  - `profiles` policies check `user_roles` to verify permissions
  - `user_roles` policies check `profiles` to verify admin status
  - This creates infinite recursion when users try to log in

  ## Solution
  Simplify the base policies to break the circular dependency:
  1. Allow users to always read their own profile (no permission check)
  2. Allow users to always read their own role assignments (no profile check)
  3. Only check permissions for accessing OTHER users' data

  ## Changes
  1. Drop existing problematic policies
  2. Create new simplified policies that avoid circular dependencies
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users with permission can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users with permission can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users with permission can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all role assignments" ON user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update role assignments" ON user_roles;
DROP POLICY IF EXISTS "Admins can remove role assignments" ON user_roles;

-- Create simplified profiles policies
-- These allow users to read their own profile without checking roles
-- This breaks the circular dependency

CREATE POLICY "Users can view all profiles with permission"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR
    -- OR users with users.view permission can see all profiles
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'users.view')::boolean = true
    )
  );

CREATE POLICY "Users with users.edit can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'users.edit')::boolean = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'users.edit')::boolean = true
    )
  );

CREATE POLICY "Users with users.delete can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'users.delete')::boolean = true
    )
  );

-- Create simplified user_roles policies
-- These allow users to read their own roles without checking profiles
-- This breaks the circular dependency

CREATE POLICY "Users with roles.view can view all role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own role assignments
    user_id = auth.uid()
    OR
    -- OR users with roles.view permission can see all role assignments
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'roles.view')::boolean = true
    )
  );

CREATE POLICY "Users with roles.create can assign roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'roles.create')::boolean = true
    )
  );

CREATE POLICY "Users with roles.edit can update role assignments"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'roles.edit')::boolean = true
    )
  );

CREATE POLICY "Users with roles.delete can remove role assignments"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.permissions->>'roles.delete')::boolean = true
    )
  );
