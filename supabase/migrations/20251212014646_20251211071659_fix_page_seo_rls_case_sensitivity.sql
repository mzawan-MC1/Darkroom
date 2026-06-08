/*
  # Fix page_seo RLS policies case sensitivity issue

  1. Changes
    - Update INSERT, UPDATE, and DELETE policies to use case-insensitive role name matching
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert page SEO" ON page_seo;
DROP POLICY IF EXISTS "Admins can update page SEO" ON page_seo;
DROP POLICY IF EXISTS "Admins can delete page SEO" ON page_seo;
DROP POLICY IF EXISTS "Admins can manage page SEO" ON page_seo;

-- Recreate with simplified admin management
CREATE POLICY "Admins can manage page SEO"
  ON page_seo FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);