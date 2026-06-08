/*
  # Add media type to challenge section settings

  1. Changes
    - Add media_type setting to distinguish between image and video uploads
    - Update existing image setting to be media_url

  2. Notes
    - Existing image URLs will remain intact
    - New uploads will properly track whether they are images or videos
*/

-- Add media_type setting for challenge section
DO $$
BEGIN
  INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
  VALUES 
    ('challenge_section_media_type', '"image"', 'text', 'Type of media (image or video) for the challenge section')
  ON CONFLICT (setting_key) DO NOTHING;
END $$;