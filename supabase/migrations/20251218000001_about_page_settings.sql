-- About page settings defaults in site_settings

BEGIN;

-- Insert default keys if missing
INSERT INTO site_settings (setting_key, setting_value)
VALUES
  ('about_enabled', 'true'::jsonb),
  ('about_title', '"About Us"'::jsonb),
  ('about_subtitle', '"Discover our story"'::jsonb),
  ('about_story_title', '"Our Story"'::jsonb),
  ('about_story_content', '"Write your company story here..."'::jsonb),
  ('about_media_type', '"image"'::jsonb),
  ('about_media_url', '""'::jsonb),
  ('about_media_poster_url', '""'::jsonb),
  ('about_media_alt', '"About media"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;

