-- Add default OAuth settings if they don't exist
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('oauth_google_enabled', 'true'::jsonb, 'boolean', 'Enable Google OAuth login'),
  ('oauth_facebook_enabled', 'true'::jsonb, 'boolean', 'Enable Facebook OAuth login'),
  ('oauth_apple_enabled', 'false'::jsonb, 'boolean', 'Enable Apple OAuth login'),
  ('oauth_max_providers', '2'::jsonb, 'number', 'Maximum number of OAuth providers to display')
ON CONFLICT (setting_key) DO NOTHING;
