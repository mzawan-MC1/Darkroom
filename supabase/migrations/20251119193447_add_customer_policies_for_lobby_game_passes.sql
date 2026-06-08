/*
  # Add Customer Policies for Lobby Game Passes

  ## Changes
  - Add INSERT policy for authenticated customers to create their own passes
  - Add SELECT policy for customers to view their own passes
  - Maintain existing staff policies for management

  ## Security
  - Customers can only insert passes linked to their own orders
  - Customers can only view their own passes
  - Staff can manage all passes
*/

-- Allow authenticated users to create lobby game passes for their own orders
CREATE POLICY "Customers can create own lobby game passes"
  ON lobby_game_passes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = lobby_game_passes.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Allow authenticated users to view their own lobby game passes
CREATE POLICY "Customers can view own lobby game passes"
  ON lobby_game_passes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = lobby_game_passes.order_id
      AND orders.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'game_master', 'customer_service')
    )
  );
