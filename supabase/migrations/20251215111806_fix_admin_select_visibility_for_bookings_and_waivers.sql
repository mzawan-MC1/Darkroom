/*
  # Fix Admin SELECT Visibility for Bookings and Waivers

  1. Problem
    - Admin/Staff users cannot see all bookings in the bookings list and calendar
    - Admin/Staff users cannot see all waivers in the waivers management page
    - Existing policies rely on permission-based checks which may not be evaluating correctly

  2. Solution
    - Add explicit SELECT policies using has_role() function for admin/manager/staff
    - This matches the pattern used in the UPDATE policies which are working
    - Keep existing user-specific policies for customers

  3. Security
    - Customers can still only see their own bookings and waivers
    - Admin/Manager/Staff can see all records as required for management
*/

-- Add explicit SELECT policy for staff/admin/manager on bookings
CREATE POLICY "Staff can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text, 'staff'::text])
  );

-- Add explicit SELECT policy for staff/admin/manager on waivers
CREATE POLICY "Staff can view all waivers"
  ON waivers
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text, 'staff'::text])
  );
