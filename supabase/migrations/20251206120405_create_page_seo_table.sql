/*
  # Create page_seo table for SEO management

  1. New Tables
    - `page_seo`
      - `id` (uuid, primary key)
      - `page_identifier` (text, unique) - Identifier for the page (e.g., 'home', 'games', 'about')
      - `meta_title` (text) - Page title for SEO
      - `meta_description` (text) - Meta description
      - `keywords` (text) - Comma-separated keywords
      - `canonical_url` (text) - Canonical URL
      - `robots` (text) - Robots meta tag (e.g., 'index, follow')
      - `og_title` (text) - Open Graph title
      - `og_description` (text) - Open Graph description
      - `og_image_url` (text) - Open Graph image URL
      - `is_active` (boolean) - Whether the page is active for sitemap
      - `priority` (numeric) - Sitemap priority (0.0 to 1.0)
      - `change_frequency` (text) - Sitemap change frequency
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `page_seo` table
    - Add policy for authenticated users to read
    - Add policy for admins to manage
*/

CREATE TABLE IF NOT EXISTS page_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_identifier text UNIQUE NOT NULL,
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  keywords text DEFAULT '',
  canonical_url text DEFAULT '',
  robots text DEFAULT 'index, follow',
  og_title text DEFAULT '',
  og_description text DEFAULT '',
  og_image_url text DEFAULT '',
  is_active boolean DEFAULT true,
  priority numeric DEFAULT 0.8,
  change_frequency text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE page_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page SEO"
  ON page_seo FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert page SEO"
  ON page_seo FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can update page SEO"
  ON page_seo FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can delete page SEO"
  ON page_seo FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
      AND user_roles.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_page_seo_page_identifier ON page_seo(page_identifier);
CREATE INDEX IF NOT EXISTS idx_page_seo_is_active ON page_seo(is_active);

INSERT INTO page_seo (page_identifier, meta_title, canonical_url, is_active, priority) VALUES
  ('home', 'Home', '/', true, 1.0),
  ('games', 'Games', '/games', true, 0.9),
  ('lobby-games', 'Lobby Games', '/lobby-games', true, 0.8),
  ('merchandise', 'Merchandise', '/merchandise', true, 0.7),
  ('about', 'About Us', '/about', true, 0.6),
  ('contact', 'Contact Us', '/contact', true, 0.6)
ON CONFLICT (page_identifier) DO NOTHING;
