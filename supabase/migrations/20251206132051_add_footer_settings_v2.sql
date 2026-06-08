/*
  # Add Footer Settings to Site Settings

  1. Changes
    - Inserts default footer settings into site_settings table
    - Company introduction text
    - Copyright text
    - Opening hours (JSON array)
    - Quick links (JSON array)

  2. Settings Added
    - `footer_company_intro` - Company description text in footer
    - `footer_copyright_text` - Copyright text (without year and ©)
    - `footer_opening_hours` - JSON array of opening hours entries
    - `footer_quick_links` - JSON array of quick link entries

  3. Notes
    - Opening hours stored as JSON array with day, time fields
    - Quick links stored as JSON array with label, page fields
    - All settings can be edited via Site Settings admin page
*/

-- Insert default footer settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, updated_at)
VALUES 
  (
    'footer_company_intro',
    '"Experience the ultimate escape room adventure. Challenge your mind, test your skills, and create unforgettable memories."'::json,
    'text',
    now()
  ),
  (
    'footer_copyright_text',
    '"EscapeZone. All rights reserved."'::json,
    'text',
    now()
  ),
  (
    'footer_opening_hours',
    jsonb_build_array(
      jsonb_build_object(
        'days', 'Monday - Thursday',
        'hours', '10:00 AM - 11:00 PM'
      ),
      jsonb_build_object(
        'days', 'Friday - Sunday',
        'hours', '10:00 AM - 12:00 AM'
      )
    ),
    'json',
    now()
  ),
  (
    'footer_quick_links',
    jsonb_build_array(
      jsonb_build_object(
        'label', 'Our Games',
        'page', 'games'
      ),
      jsonb_build_object(
        'label', 'Book Now',
        'page', 'book'
      ),
      jsonb_build_object(
        'label', 'About Us',
        'page', 'about'
      ),
      jsonb_build_object(
        'label', 'Contact',
        'page', 'contact'
      )
    ),
    'json',
    now()
  )
ON CONFLICT (setting_key) DO NOTHING;