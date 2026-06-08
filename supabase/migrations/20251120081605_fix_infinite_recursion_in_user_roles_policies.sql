/*
  # Fix Infinite Recursion in User Roles Policies

  1. Problem
    - Admin policies on user_roles table are checking user_roles itself
    - This creates infinite recursion when querying user_roles
    - Prevents customers from accessing time slots and other features

  2. Solution
    - Use a materialized view or simpler approach
    - Check profiles.role = 'admin' for admin checks (legacy column)
    - Keep user_roles for the new multi-role system
    - Use SECURITY DEFINER functions where needed

  3. Changes
    - Drop recursive policies on user_roles
    - Create non-recursive policies using profiles.role
    - Update roles table policies similarly
    - Ensure customers can always read their own roles

  4. Security
    - Users can read their own role assignments
    - Admins (via profiles.role) can manage all roles
    - No circular dependencies in policies
*/

-- Drop all existing policies on user_roles that cause recursion
DROP POLICY IF EXISTS "Admins can view all role assignments" ON user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update role assignments" ON user_roles;
DROP POLICY IF EXISTS "Admins can remove role assignments" ON user_roles;

-- Users can view their own role assignments (no recursion)
-- This policy already exists and is fine, but let's ensure it's there
DROP POLICY IF EXISTS "Users can view own role assignments" ON user_roles;
CREATE POLICY "Users can view own role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all role assignments (using profiles.role to avoid recursion)
CREATE POLICY "Admins can view all role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can assign roles to users (using profiles.role)
CREATE POLICY "Admins can assign roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update role assignments (using profiles.role)
CREATE POLICY "Admins can update role assignments"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can remove role assignments (using profiles.role)
CREATE POLICY "Admins can remove role assignments"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Fix roles table policies to avoid recursion
DROP POLICY IF EXISTS "Admins can insert roles" ON roles;
DROP POLICY IF EXISTS "Admins can update roles" ON roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON roles;

-- Only admins can insert roles (using profiles.role)
CREATE POLICY "Admins can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update roles (using profiles.role)
CREATE POLICY "Admins can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete non-system roles (using profiles.role)
CREATE POLICY "Admins can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    is_system_role = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
