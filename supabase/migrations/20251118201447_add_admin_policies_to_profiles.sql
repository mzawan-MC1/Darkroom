/*
  # Add Admin Policies to Profiles Table

  1. Security Changes
    - Add policy allowing admins to read all profiles
    - Add policy allowing admins to update any profile
    - Add policy allowing admins to delete profiles
    
  2. Purpose
    - Enable admin users to view and manage all users in the User Management page
    - Maintain security by restricting these actions to admin role only
*/

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = (select auth.uid())
      AND p.role = 'admin'
    )
  );

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = (select auth.uid())
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = (select auth.uid())
      AND p.role = 'admin'
    )
  );

-- Allow admins to delete profiles (except their own, enforced in edge function)
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = (select auth.uid())
      AND p.role = 'admin'
    )
  );
