/*
  # Add Manager Role Waiver Permissions
  
  ## Problem
  Manager role currently lacks permissions to view, create, and edit waivers
  
  ## Changes
  1. Add Manager to existing waiver policies
  2. Grant SELECT permissions for Manager role
  3. Grant DELETE permissions for Manager role
  4. Update RLS policies to include Manager role
*/

-- Add Manager to existing "Staff can update all waivers" policy
DROP POLICY IF EXISTS "Staff can update all waivers" ON waivers;

CREATE POLICY "Staff can update all waivers"
  ON waivers
  FOR UPDATE
  TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));

-- Add policy for staff to view all waivers (including Manager)
CREATE POLICY "Staff can view all waivers"
  ON waivers
  FOR SELECT
  TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));

-- Add policy for staff to delete waivers (including Manager)
CREATE POLICY "Staff can delete waivers"
  ON waivers
  FOR DELETE
  TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['Admin', 'Manager', 'Staff']));