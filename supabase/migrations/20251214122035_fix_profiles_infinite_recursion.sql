/*
  # Fix Profiles Table Infinite Recursion

  ## Problem
  The profiles table policies still query user_roles directly, causing infinite recursion.

  ## Solution
  Update profiles policies to use the helper function user_has_permission.

  ## Changes
  1. Drop existing profiles policies that cause recursion
  2. Create new policies using helper function
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles with permission" ON profiles;
DROP POLICY IF EXISTS "Users with users.edit can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users with users.delete can delete profiles" ON profiles;

-- Create new policies using helper function
CREATE POLICY "Users can view all profiles with permission"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    user_has_permission(auth.uid(), 'users.view')
  );

CREATE POLICY "Users with permission can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), 'users.edit')
  )
  WITH CHECK (
    user_has_permission(auth.uid(), 'users.edit')
  );

CREATE POLICY "Users with permission can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), 'users.delete')
  );
