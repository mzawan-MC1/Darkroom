/*
  # Fix Staff Waiver Update Policy
  
  ## Problem
  Admins and staff cannot sign waivers on behalf of customers because there is no RLS policy
  allowing staff to UPDATE waivers. The only update policy is for customers to update their
  own pending waivers.
  
  ## Changes
  1. Add "Staff can update all waivers" policy
     - Allows admin, game_master, and customer_service roles to update any waiver
     - Allows changing waiver status from pending to signed
     - Allows updating all waiver fields including participant details and signatures
  
  ## Security
  - Policy checks that the user has a staff role (admin, game_master, or customer_service)
  - Maintains data integrity by only allowing authorized staff to sign waivers
  - Works alongside existing customer policy for self-service waiver signing
*/

-- Create policy for staff to update all waivers
CREATE POLICY "Staff can update all waivers"
  ON waivers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );
