/*
  # Add Difficulty Levels to Bookings

  1. Schema Changes
    - Add `difficulty_level` column to `bookings` table
      - Options: 'Normal', 'Hard', 'Nightmare'
      - Default: 'Normal'
      - Not nullable
    
  2. Purpose
    - Allow customers and admins to select difficulty level when booking
    - Track which difficulty level was played for each booking
    - Enable future features like level-specific pricing or achievements

  3. Migration Safety
    - Uses IF NOT EXISTS to prevent errors on re-run
    - Sets default value for existing records
    - Includes constraint to ensure valid values only
*/

-- Add difficulty_level column to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'difficulty_level'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN difficulty_level text 
    DEFAULT 'Normal' 
    NOT NULL
    CHECK (difficulty_level IN ('Normal', 'Hard', 'Nightmare'));
  END IF;
END $$;

-- Create index for filtering by difficulty level
CREATE INDEX IF NOT EXISTS idx_bookings_difficulty_level ON bookings(difficulty_level);