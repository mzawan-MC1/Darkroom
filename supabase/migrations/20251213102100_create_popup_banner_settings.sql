/*
  # Create Popup Banner Settings

  1. New Tables
    - `popup_banner_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `is_enabled` (boolean) - Whether the popup is active
      - `title` (text) - Popup banner title
      - `description` (text) - Popup banner description/text content
      - `image_url` (text) - URL to the banner image
      - `button_text` (text) - Text for the call-to-action button
      - `button_url` (text) - URL the button links to
      - `show_on_load` (boolean) - Show immediately when page loads
      - `delay_seconds` (integer) - Delay in seconds before showing popup (if show_on_load is true)
      - `show_once_per_session` (boolean) - Only show once per browser session
      - `background_color` (text) - Background color of the popup
      - `text_color` (text) - Text color
      - `button_color` (text) - Button background color
      - `created_at` (timestamptz) - When the settings were created
      - `updated_at` (timestamptz) - When the settings were last updated

  2. Security
    - Enable RLS on `popup_banner_settings` table
    - Add policy for public read access (so customers can see the popup)
    - Add policies for admin/manager to manage settings
*/

-- Create popup_banner_settings table
CREATE TABLE IF NOT EXISTS popup_banner_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  image_url text,
  button_text text DEFAULT '',
  button_url text DEFAULT '',
  show_on_load boolean DEFAULT true NOT NULL,
  delay_seconds integer DEFAULT 0 NOT NULL,
  show_once_per_session boolean DEFAULT true NOT NULL,
  background_color text DEFAULT '#ffffff',
  text_color text DEFAULT '#000000',
  button_color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE popup_banner_settings ENABLE ROW LEVEL SECURITY;

-- Public can read popup banner settings (to display on landing page)
CREATE POLICY "Anyone can view popup banner settings"
  ON popup_banner_settings
  FOR SELECT
  USING (is_enabled = true);

-- Admin and Manager can view all popup banner settings
CREATE POLICY "Admin and Manager can view all popup banner settings"
  ON popup_banner_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  );

-- Admin and Manager can insert popup banner settings
CREATE POLICY "Admin and Manager can insert popup banner settings"
  ON popup_banner_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  );

-- Admin and Manager can update popup banner settings
CREATE POLICY "Admin and Manager can update popup banner settings"
  ON popup_banner_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  );

-- Admin can delete popup banner settings
CREATE POLICY "Admin can delete popup banner settings"
  ON popup_banner_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'Admin'
      AND user_roles.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_popup_banner_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_popup_banner_settings_updated_at
  BEFORE UPDATE ON popup_banner_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_popup_banner_settings_updated_at();

-- Insert default popup banner settings (disabled by default)
INSERT INTO popup_banner_settings (
  is_enabled,
  title,
  description,
  button_text,
  button_url
) VALUES (
  false,
  'Welcome to Our Escape Room!',
  'Book your adventure today and experience the thrill!',
  'Book Now',
  '/games'
) ON CONFLICT DO NOTHING;