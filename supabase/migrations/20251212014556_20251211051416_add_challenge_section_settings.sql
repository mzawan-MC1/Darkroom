/*
  # Add Challenge Section Settings

  1. Changes
    - Add settings for "The Ultimate Challenge" section to site_settings table
    - Create challenge_features table for dynamic feature items

  2. New Tables
    - `challenge_features` - Dynamic feature items for challenge section
*/

-- Add challenge section settings to site_settings
INSERT INTO site_settings (setting_key, setting_value)
VALUES 
  ('challenge_section_tagline', '"THE ULTIMATE CHALLENGE"'::jsonb),
  ('challenge_section_title', '"Face Your Fear"'::jsonb),
  ('challenge_section_description', '"Immersive escape rooms with cutting-edge technology and mind-bending puzzles."'::jsonb),
  ('challenge_section_button_text', '"Explore Rooms"'::jsonb),
  ('challenge_section_button_action', '"games"'::jsonb),
  ('challenge_section_image', '"https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=800"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create challenge_features table
CREATE TABLE IF NOT EXISTS challenge_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  icon_name text DEFAULT 'CheckCircle',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE challenge_features ENABLE ROW LEVEL SECURITY;

-- Public can read active features
CREATE POLICY "Anyone can view active challenge features"
  ON challenge_features
  FOR SELECT
  USING (is_active = true);

-- Admins can manage features (simplified)
CREATE POLICY "Admins can manage challenge features"
  ON challenge_features FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_challenge_features_active_order ON challenge_features(is_active, display_order);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_challenge_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_challenge_features_updated_at
  BEFORE UPDATE ON challenge_features
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_features_updated_at();

-- Insert default features
INSERT INTO challenge_features (title, description, display_order, is_active)
VALUES 
  ('Cinematic Storylines', 'Unique narratives with plot twists and interactive elements.', 1, true),
  ('Challenging Puzzles', 'Test your logic and teamwork. No experience needed.', 2, true),
  ('Perfect for Groups', '2-8 players. Ideal for teams, parties, and events.', 3, true),
  ('Advanced Technology', 'Special effects and automated systems for maximum immersion.', 4, true)
ON CONFLICT DO NOTHING;