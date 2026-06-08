/*
  # Add Hero Section Settings
  
  1. New Settings
    - Hero section customization settings for the landing page
    - Height control (pixels and viewport height)
    - Background image URL
    - Primary button text and navigation target
    - Secondary button text and navigation target
    
  2. Purpose
    - Allow admins to fully customize the hero section from site settings
    - Control hero height, images, and button functionality
    - Enable dynamic hero configuration without code changes
*/

-- Insert hero section settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('hero_height_value', '50'::jsonb, 'number', 'Hero section height value'),
  ('hero_height_unit', '"vh"'::jsonb, 'text', 'Hero section height unit (px or vh)'),
  ('hero_background_image', '"https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1600"'::jsonb, 'image', 'Hero background image URL'),
  ('hero_title', '"OUR ROOMS"'::jsonb, 'text', 'Hero section main title'),
  ('hero_subtitle', '"Welcome to Your Next Adventure"'::jsonb, 'text', 'Hero section subtitle'),
  ('hero_primary_button_text', '"Book Your Adventure"'::jsonb, 'text', 'Primary button text'),
  ('hero_primary_button_action', '"book"'::jsonb, 'text', 'Primary button navigation target'),
  ('hero_secondary_button_text', '"Explore Games"'::jsonb, 'text', 'Secondary button text'),
  ('hero_secondary_button_action', '"games"'::jsonb, 'text', 'Secondary button navigation target')
ON CONFLICT (setting_key) DO NOTHING;