/*
  # Add updated_at Column to Lobby Games

  1. Changes
    - Add updated_at column to lobby_games table with default of now()
    - Create trigger to automatically update updated_at on record changes
    
  2. Reason
    - The application expects an updated_at column for tracking changes
    - Standard practice for all database tables to have created_at and updated_at timestamps
*/

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lobby_games' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE lobby_games ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_lobby_games_updated_at ON lobby_games;

CREATE TRIGGER update_lobby_games_updated_at
  BEFORE UPDATE ON lobby_games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN lobby_games.updated_at IS 'Timestamp of last update to this record';
COMMENT ON TRIGGER update_lobby_games_updated_at ON lobby_games IS 'Automatically updates the updated_at timestamp on record modification';
