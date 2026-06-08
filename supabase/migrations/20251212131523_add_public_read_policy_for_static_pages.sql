/*
  # Add public read access for published static pages

  1. Changes
    - Add policy to allow anyone (including anonymous users) to read published static pages
    
  2. Security
    - Only published pages (is_published = true) are accessible
    - Read-only access for public users
    - Admin management policies remain unchanged
*/

-- Drop policy if it exists and recreate
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'static_pages' 
    AND policyname = 'Anyone can view published static pages'
  ) THEN
    DROP POLICY "Anyone can view published static pages" ON static_pages;
  END IF;
END $$;

-- Allow anyone to read published static pages
CREATE POLICY "Anyone can view published static pages"
  ON static_pages
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);
