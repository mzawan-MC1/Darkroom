/*
  # Fix Profile Insert Policy for User Signup
  
  ## Problem
  Users cannot sign up because there's no INSERT policy allowing them to create their profile
  
  ## Solution
  Add an INSERT policy that allows authenticated users to create their own profile
  during the signup process
  
  ## Changes
  1. Add INSERT policy for profiles table
  2. Allow users to insert a row where the id matches their auth.uid()
*/

-- Drop existing INSERT policy if any
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Create INSERT policy for user signup
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);
