/*
  # Clean up game schema

  1. Changes
    - Remove `short_description` and `long_description` columns from games table
    - Drop `game_mission_objectives` table (objectives now stored as array in games table)

  2. Notes
    - This migration removes redundant fields and tables
    - Mission objectives are already stored in games.mission_objectives as text array
*/

-- Drop the game_mission_objectives table if it exists
DROP TABLE IF EXISTS game_mission_objectives CASCADE;

-- Remove short_description and long_description columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'short_description'
  ) THEN
    ALTER TABLE games DROP COLUMN short_description;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'long_description'
  ) THEN
    ALTER TABLE games DROP COLUMN long_description;
  END IF;
END $$;
