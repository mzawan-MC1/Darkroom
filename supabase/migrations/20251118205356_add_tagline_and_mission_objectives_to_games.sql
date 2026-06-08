/*
  # Add Tagline and Mission Objectives to Games

  1. Changes
    - Add tagline column to games table (short catchy phrase)
    - Add mission_objectives column to games table (jsonb array for multiple objectives)
    
  2. Notes
    - Tagline is a short, memorable phrase that captures the game essence
    - Mission objectives are stored as a JSONB array for flexibility
*/

-- Add tagline column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE public.games ADD COLUMN tagline text;
  END IF;
END $$;

-- Add mission_objectives column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'mission_objectives'
  ) THEN
    ALTER TABLE public.games ADD COLUMN mission_objectives jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
