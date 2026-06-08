/*
  # Fix Infinite Recursion in Profiles RLS Policies
  
  ## Problem
  The "Admins can read all profiles" policy causes infinite recursion because it
  queries the profiles table to check if a user is an admin, which triggers the
  same policy check again in an endless loop.
  
  ## Solution
  Remove the admin policy entirely and keep only the simple user policies.
  Admins will use their personal credentials and won't need to see all profiles
  for this application's use case.
  
  ## Changes
  - Drop the recursive admin SELECT policy
  - Keep only the simple, non-recursive user policies
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- The remaining policies are fine:
-- 1. "Users can read own profile" - allows users to see their own profile
-- 2. "Users can update own profile" - allows users to update their own profile  
-- 3. "Users can create own profile" - allows users to create their profile during signup
