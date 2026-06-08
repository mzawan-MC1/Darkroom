/*
  # Fix Invoice RLS Policies

  ## Changes
  - Drop and recreate admin policy with proper WITH CHECK clause
  - Ensure admin can INSERT invoices without booking_id

  ## Security
  - Maintains admin access control
  - Allows invoice creation for any purchase type
*/

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admin can manage invoices" ON invoices;

-- Recreate with proper INSERT support
CREATE POLICY "Admin can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );

CREATE POLICY "Admin can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
