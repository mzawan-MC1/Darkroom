/*
  # Add Banner Size and Mobile Image Fields

  1. Changes
    - Add `banner_width` (integer) - Custom width in pixels (default 600)
    - Add `banner_height` (integer) - Custom height in pixels (default 400)
    - Add `mobile_image_url` (text) - Separate image for mobile devices

  2. Notes
    - These fields allow admins to customize popup size per their needs
    - Mobile image displays only on mobile devices (screen width < 768px)
    - Default values maintain current 600x400px size
*/

-- Add banner size and mobile image fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'popup_banner_settings' AND column_name = 'banner_width'
  ) THEN
    ALTER TABLE popup_banner_settings ADD COLUMN banner_width integer DEFAULT 600 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'popup_banner_settings' AND column_name = 'banner_height'
  ) THEN
    ALTER TABLE popup_banner_settings ADD COLUMN banner_height integer DEFAULT 400 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'popup_banner_settings' AND column_name = 'mobile_image_url'
  ) THEN
    ALTER TABLE popup_banner_settings ADD COLUMN mobile_image_url text;
  END IF;
END $$;