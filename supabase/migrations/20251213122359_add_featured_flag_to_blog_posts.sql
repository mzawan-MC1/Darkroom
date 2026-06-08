/*
  # Add Featured Flag to Blog Posts

  1. Changes
    - Add `featured` (boolean) to blog_posts table - Marks posts to display on landing page
    - Add constraint to ensure max 3 posts can be featured
    - Add index for efficient querying of featured posts
  
  2. Notes
    - Admins can select up to 3 blog posts to feature on the landing page
    - Featured posts will be displayed in the blogs section before the footer
*/

-- Add featured field to blog_posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'featured'
  ) THEN
    ALTER TABLE blog_posts ADD COLUMN featured boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index for featured posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured) WHERE featured = true;

-- Create function to ensure max 3 featured posts
CREATE OR REPLACE FUNCTION check_max_featured_posts()
RETURNS TRIGGER AS $$
DECLARE
  featured_count int;
BEGIN
  IF NEW.featured = true THEN
    SELECT COUNT(*) INTO featured_count
    FROM blog_posts
    WHERE featured = true AND id != NEW.id;
    
    IF featured_count >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 blog posts can be featured. Please unfeature another post first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce max featured posts
DROP TRIGGER IF EXISTS enforce_max_featured_posts ON blog_posts;
CREATE TRIGGER enforce_max_featured_posts
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_max_featured_posts();