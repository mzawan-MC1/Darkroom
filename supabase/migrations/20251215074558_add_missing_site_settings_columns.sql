/*
  # Add Missing Columns to Site Settings Table

  ## Problem
  The site_settings table is missing the setting_type, description, and updated_by columns
  that are expected by the application code.

  ## Solution
  Add the missing columns to the site_settings table.

  ## Changes
  1. Add setting_type column (text)
  2. Add description column (text, nullable)
  3. Add updated_by column (uuid, references profiles)
*/

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add setting_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'setting_type'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN setting_type text DEFAULT 'text';
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'description'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN description text;
  END IF;

  -- Add updated_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN updated_by uuid REFERENCES profiles(id);
  END IF;
END $$;