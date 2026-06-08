/*
  # Fix User Roles Policies to Use Helper Function

  1. Problem
    - User roles policies query profiles table directly
    - Could cause infinite recursion similar to profiles table
    
  2. Solution
    - Update all admin policies on user_roles to use is_admin() helper
    - This prevents potential infinite recursion
    
  3. Changes
    - Drop and recreate admin policies on user_roles table
    - Use is_admin() helper function for all admin checks
*/

-- Drop existing admin policies on user_roles
DROP POLICY IF EXISTS "Admins can view all role assignments" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can remove role assignments" ON public.user_roles;

-- Recreate admin policies using the helper function
CREATE POLICY "Admins can view all role assignments"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can remove role assignments"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin());
