/*
  # Add Footer Settings to Site Settings

  1. Changes
    - Inserts default footer settings into site_settings table
    - Company introduction text
    - Copyright text
    - Opening hours (JSON array)
    - Quick links (JSON array)
*/

-- Insert default footer settings
INSERT INTO site_settings (setting_key, setting_value)
VALUES 
  (
    'footer_company_intro',
    '"Experience the ultimate escape room adventure. Challenge your mind, test your skills, and create unforgettable memories."'::jsonb
  ),
  (
    'footer_copyright_text',
    '"EscapeZone. All rights reserved."'::jsonb
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
    )
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
    )
  )
ON CONFLICT (setting_key) DO NOTHING;