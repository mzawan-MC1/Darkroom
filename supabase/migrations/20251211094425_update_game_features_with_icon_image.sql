/*
  # Update game features to support icon images

  1. Changes
    - Add `icon_image_url` column to game_features table
    - Keep `icon` column for backward compatibility (can be used for fallback)

  2. Notes
    - Admins can now upload icon images instead of using icon names
*/

-- Add icon_image_url column to game_features table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_features' AND column_name = 'icon_image_url'
  ) THEN
    ALTER TABLE game_features ADD COLUMN icon_image_url text;
  END IF;
END $$;
