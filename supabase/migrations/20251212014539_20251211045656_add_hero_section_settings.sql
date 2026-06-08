/*
  # Add Hero Section Settings
  
  1. New Settings
    - Hero section customization settings for the landing page
*/

-- Insert hero section settings
INSERT INTO site_settings (setting_key, setting_value)
VALUES
  ('hero_height_value', '50'::jsonb),
  ('hero_height_unit', '"vh"'::jsonb),
  ('hero_background_image', '"https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1600"'::jsonb),
  ('hero_title', '"OUR ROOMS"'::jsonb),
  ('hero_subtitle', '"Welcome to Your Next Adventure"'::jsonb),
  ('hero_primary_button_text', '"Book Your Adventure"'::jsonb),
  ('hero_primary_button_action', '"book"'::jsonb),
  ('hero_secondary_button_text', '"Explore Games"'::jsonb),
  ('hero_secondary_button_action', '"games"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;