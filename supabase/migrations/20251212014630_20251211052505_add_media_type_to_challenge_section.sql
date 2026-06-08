/*
  # Add media type to challenge section settings

  1. Changes
    - Add media_type setting to distinguish between image and video uploads
*/

-- Add media_type setting for challenge section
INSERT INTO site_settings (setting_key, setting_value)
VALUES 
  ('challenge_section_media_type', '"image"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;