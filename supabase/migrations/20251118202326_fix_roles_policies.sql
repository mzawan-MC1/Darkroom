/*
  # Fix Roles Table Policies to Use Helper Function

  1. Problem
    - Roles table policies query profiles table directly
    - Could cause infinite recursion
    
  2. Solution
    - Update all admin policies on roles to use is_admin() helper
    
  3. Changes
    - Drop and recreate admin policies on roles table
    - Use is_admin() helper function for all admin checks
*/

-- Drop existing admin policies on roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can create roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can update non-system roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can delete non-system roles" ON public.roles;

-- Recreate admin policies using the helper function
CREATE POLICY "Admins can view all roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can create roles"
  ON public.roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update non-system roles"
  ON public.roles FOR UPDATE
  TO authenticated
  USING (NOT is_system_role AND public.is_admin())
  WITH CHECK (NOT is_system_role AND public.is_admin());

CREATE POLICY "Admins can delete non-system roles"
  ON public.roles FOR DELETE
  TO authenticated
  USING (NOT is_system_role AND public.is_admin());
