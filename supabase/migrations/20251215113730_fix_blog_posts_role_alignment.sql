/*
  # Fix Blog Posts Role Alignment

  1. Problem
    - blog_posts table policies still reference 'staff' role
    - Need to align with actual roles: Admin, Manager, Customer

  2. Solution
    - Drop all blog_posts policies that reference 'staff'
    - Recreate them with correct roles: ['admin', 'manager']

  3. Security
    - Admin and Manager users can manage blog posts
    - Public users can read published blog posts
*/

-- Drop existing staff-based policies
DROP POLICY IF EXISTS "Staff can view all blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Staff can insert blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Staff can update blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Staff can delete blog posts" ON blog_posts;

-- Recreate with correct roles
CREATE POLICY "Admin and Manager can view all blog posts"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can insert blog posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can update blog posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  )
  WITH CHECK (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );

CREATE POLICY "Admin and Manager can delete blog posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (
    has_role(ARRAY['admin'::text, 'manager'::text])
  );
