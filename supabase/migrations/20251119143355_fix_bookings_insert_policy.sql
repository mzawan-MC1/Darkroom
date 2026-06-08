/*
  # Fix Bookings Insert Policy

  1. Changes
    - Update the insert policy to allow both:
      - Customers creating their own bookings
      - Staff creating bookings on behalf of customers (for walk-ins/POS)

  2. Security
    - Customers can only insert bookings where user_id matches their auth.uid()
    - Staff (Admin, Game Master, Customer Service) can insert any booking
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;

-- Create new insert policy that allows both customers and staff
CREATE POLICY "Users and staff can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is creating their own booking
    (SELECT auth.uid()) = user_id
    OR
    -- OR user is staff (can create bookings for anyone)
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager', 'Staff')
      )
    )
  );