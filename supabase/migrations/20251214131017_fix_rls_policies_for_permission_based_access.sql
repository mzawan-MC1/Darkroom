/*
  # Fix RLS Policies for Permission-Based Access

  1. Overview
    - Updates all RLS policies to use the new permission-based system
    - Removes reliance on old profiles.role column
    - Uses user_roles and roles tables with permissions

  2. Changes
    - Updates bookings table policies
    - Updates invoices table policies
    - Updates orders table policies
    - Updates waivers table policies
    - Updates lobby_game_passes table policies
    - Ensures admin users can see ALL data based on permissions

  3. Security
    - Maintains RLS for customer users (own data only)
    - Grants full access to users with appropriate permissions
    - Uses helper function for permission checks
*/

-- Drop existing policies and recreate with permission-based checks

-- BOOKINGS TABLE
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can read all bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can update bookings" ON bookings;
DROP POLICY IF EXISTS "Users and staff can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can read own bookings" ON bookings;

CREATE POLICY "Users can read own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'bookings.view')
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'bookings.create')
  );

CREATE POLICY "Authorized users can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'bookings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'bookings.edit'));

CREATE POLICY "Authorized users can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'bookings.delete'));

-- INVOICES TABLE
DROP POLICY IF EXISTS "Admin can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admin can update invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = invoices.booking_id
      AND bookings.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'invoices.view')
  );

CREATE POLICY "Authorized users can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (user_has_permission(auth.uid(), 'invoices.create'));

CREATE POLICY "Authorized users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'invoices.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'invoices.edit'));

CREATE POLICY "Authorized users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'invoices.delete'));

-- ORDERS TABLE
DROP POLICY IF EXISTS "Staff can read all orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can read own orders" ON orders;

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'orders.view')
  );

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'orders.create')
  );

CREATE POLICY "Authorized users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'orders.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'orders.edit'));

CREATE POLICY "Authorized users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'orders.delete'));

-- WAIVERS TABLE
DROP POLICY IF EXISTS "Staff can read all waivers" ON waivers;
DROP POLICY IF EXISTS "Staff can update all waivers" ON waivers;
DROP POLICY IF EXISTS "Users can create waivers" ON waivers;
DROP POLICY IF EXISTS "Users can read own waivers" ON waivers;
DROP POLICY IF EXISTS "Users can update pending waivers for their bookings" ON waivers;

CREATE POLICY "Users can read own waivers"
  ON waivers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'waivers.view')
  );

CREATE POLICY "Users can create waivers"
  ON waivers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'waivers.create')
  );

CREATE POLICY "Authorized users can update waivers"
  ON waivers FOR UPDATE
  TO authenticated
  USING (
    user_has_permission(auth.uid(), 'waivers.edit') OR
    (user_id = auth.uid() AND waiver_status = 'pending')
  )
  WITH CHECK (
    user_has_permission(auth.uid(), 'waivers.edit') OR
    (user_id = auth.uid() AND waiver_status = 'pending')
  );

CREATE POLICY "Authorized users can delete waivers"
  ON waivers FOR DELETE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'waivers.delete'));

-- LOBBY GAME PASSES TABLE
DROP POLICY IF EXISTS "Customers can view own lobby passes" ON lobby_game_passes;
DROP POLICY IF EXISTS "Staff can manage lobby passes" ON lobby_game_passes;
DROP POLICY IF EXISTS "Staff can view all lobby passes" ON lobby_game_passes;

CREATE POLICY "Users can read own lobby passes"
  ON lobby_game_passes FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = lobby_game_passes.booking_id
      AND bookings.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'bookings.view')
  );

CREATE POLICY "Authorized users can create lobby passes"
  ON lobby_game_passes FOR INSERT
  TO authenticated
  WITH CHECK (user_has_permission(auth.uid(), 'bookings.create'));

CREATE POLICY "Authorized users can update lobby passes"
  ON lobby_game_passes FOR UPDATE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'bookings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'bookings.edit'));

CREATE POLICY "Authorized users can delete lobby passes"
  ON lobby_game_passes FOR DELETE
  TO authenticated
  USING (user_has_permission(auth.uid(), 'bookings.delete'));
