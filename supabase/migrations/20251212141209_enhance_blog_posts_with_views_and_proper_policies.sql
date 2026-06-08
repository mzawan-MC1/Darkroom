/*
  # Enhance Blog Posts Table

  1. Changes
    - Add views column if it doesn't exist
    - Add proper RLS policies for public reading
    - Add policies for staff role
    - Update trigger for updated_at if needed

  2. Security
    - Public can read published blog posts (is_published = true)
    - Staff can manage all blog posts
    - Admins can manage all blog posts (already exists)
*/

-- Add views column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'views'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN views integer DEFAULT 0;
  END IF;
END $$;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admins can manage blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can read published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Staff can manage blog posts" ON blog_posts;

-- Public can read published blog posts
CREATE POLICY "Public can read published blog posts"
  ON blog_posts FOR SELECT
  USING (is_published = true);

-- Admins can view all blog posts
CREATE POLICY "Admins can view all blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Admins can insert blog posts
CREATE POLICY "Admins can insert blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Admins can update blog posts
CREATE POLICY "Admins can update blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Admins can delete blog posts
CREATE POLICY "Admins can delete blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Staff can view all blog posts
CREATE POLICY "Staff can view all blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'staff'
      AND user_roles.is_active = true
    )
  );

-- Staff can insert blog posts
CREATE POLICY "Staff can insert blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'staff'
      AND user_roles.is_active = true
    )
  );

-- Staff can update blog posts
CREATE POLICY "Staff can update blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'staff'
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'staff'
      AND user_roles.is_active = true
    )
  );

-- Staff can delete blog posts
CREATE POLICY "Staff can delete blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'staff'
      AND user_roles.is_active = true
    )
  );

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_blog_posts_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_blog_posts_updated_at_trigger
      BEFORE UPDATE ON blog_posts
      FOR EACH ROW
      EXECUTE FUNCTION update_blog_posts_updated_at();
  END IF;
END $$;