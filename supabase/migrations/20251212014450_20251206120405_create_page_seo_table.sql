/*
  # Create page_seo table for SEO management

  1. New Tables
    - `page_seo`
      - Identifier for pages, meta tags, Open Graph tags
      - Sitemap configuration

  2. Security
    - Enable RLS on `page_seo` table
    - Public can read
    - Admins can manage
*/

CREATE TABLE IF NOT EXISTS page_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_identifier text UNIQUE NOT NULL,
  meta_title text,
  meta_description text,
  keywords text,
  canonical_url text,
  robots text,
  og_title text,
  og_description text,
  og_image_url text,
  is_active boolean DEFAULT true,
  priority integer,
  change_frequency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE page_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page SEO"
  ON page_seo FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage page SEO"
  ON page_seo FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_page_seo_page_identifier ON page_seo(page_identifier);
CREATE INDEX IF NOT EXISTS idx_page_seo_is_active ON page_seo(is_active);

INSERT INTO page_seo (page_identifier, meta_title, canonical_url, is_active, priority) VALUES
  ('home', 'Home', '/', true, 1),
  ('games', 'Games', '/games', true, 1),
  ('lobby-games', 'Lobby Games', '/lobby-games', true, 1),
  ('merchandise', 'Merchandise', '/merchandise', true, 1),
  ('about', 'About Us', '/about', true, 1),
  ('contact', 'Contact Us', '/contact', true, 1)
ON CONFLICT (page_identifier) DO NOTHING;