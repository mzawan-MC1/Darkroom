/*
  # Fix Infinite Recursion in Profiles RLS Policies

  1. Problem
    - Admin policies query the profiles table to check if user is admin
    - This creates infinite recursion when reading profiles
    
  2. Solution
    - Create a helper function that bypasses RLS using SECURITY DEFINER
    - Update all admin policies to use this helper function
    
  3. Changes
    - Create `is_admin()` function with SECURITY DEFINER
    - Drop and recreate all admin policies using the helper function
    - Keep user policies unchanged
*/

-- Create helper function to check if current user is admin
-- This function bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Recreate admin policies using the helper function
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());
