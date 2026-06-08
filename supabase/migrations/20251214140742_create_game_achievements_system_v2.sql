/*
  # Game Achievements System

  1. New Tables
    - `game_achievements`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `title` (text, required) - Achievement name
      - `short_description` (text, optional) - Brief description (max 10 words)
      - `style_tag` (text, optional) - Theme style: 'vikings', 'pirates', 'neutral'
      - `is_active` (boolean) - Whether achievement is active
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `booking_achievements`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, foreign key to bookings)
      - `achievement_id` (uuid, foreign key to game_achievements)
      - `created_at` (timestamptz)

  2. Schema Changes
    - Add completion fields to `bookings` table:
      - `time_to_finish_minutes` (integer, nullable)
      - `achievement_note` (text, nullable, max 120 chars)
    - Note: completed_at already exists

  3. Security
    - Enable RLS on both new tables
    - Admin/staff: full CRUD on game_achievements and booking_achievements
    - Customers: read-only access to their own booking achievements

  4. Indexes
    - Index on game_achievements(game_id) for fast lookups
    - Index on booking_achievements(booking_id) for fast lookups
    - Index on bookings completion fields
*/

-- Create game_achievements table
CREATE TABLE IF NOT EXISTS game_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title text NOT NULL,
  short_description text,
  style_tag text CHECK (style_tag IN ('vikings', 'pirates', 'neutral')),
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create booking_achievements linking table
CREATE TABLE IF NOT EXISTS booking_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES game_achievements(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(booking_id, achievement_id)
);

-- Add completion fields to bookings table (completed_at already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'time_to_finish_minutes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN time_to_finish_minutes integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'achievement_note'
  ) THEN
    ALTER TABLE bookings ADD COLUMN achievement_note text CHECK (char_length(achievement_note) <= 120);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_achievements_game_id ON game_achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_game_achievements_active ON game_achievements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_booking_achievements_booking_id ON booking_achievements(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_achievements_achievement_id ON booking_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_to_finish ON bookings(time_to_finish_minutes) WHERE time_to_finish_minutes IS NOT NULL;

-- Enable RLS
ALTER TABLE game_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_achievements

-- Admin/staff can view all achievements
CREATE POLICY "Staff can view all game achievements"
  ON game_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  );

-- Customers can view active achievements for games
CREATE POLICY "Customers can view active game achievements"
  ON game_achievements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admin/staff can insert achievements
CREATE POLICY "Staff can insert game achievements"
  ON game_achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  );

-- Admin/staff can update achievements
CREATE POLICY "Staff can update game achievements"
  ON game_achievements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  );

-- Admin/staff can delete achievements
CREATE POLICY "Staff can delete game achievements"
  ON game_achievements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  );

-- RLS Policies for booking_achievements

-- Admin/staff can view all booking achievements
CREATE POLICY "Staff can view all booking achievements"
  ON booking_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  );

-- Customers can view their own booking achievements
CREATE POLICY "Customers can view their own booking achievements"
  ON booking_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_achievements.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- Admin/staff can insert booking achievements
CREATE POLICY "Staff can insert booking achievements"
  ON booking_achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  );

-- Admin/staff can delete booking achievements
CREATE POLICY "Staff can delete booking achievements"
  ON booking_achievements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'staff')
      AND ur.is_active = true
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_game_achievements_updated_at_trigger ON game_achievements;
CREATE TRIGGER update_game_achievements_updated_at_trigger
  BEFORE UPDATE ON game_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_game_achievements_updated_at();

-- Function to seed default achievements for a new game
CREATE OR REPLACE FUNCTION seed_default_achievements(p_game_id uuid)
RETURNS void AS $$
BEGIN
  -- Vikings themed achievements
  INSERT INTO game_achievements (game_id, title, short_description, style_tag, sort_order) VALUES
    (p_game_id, 'Raider of Runes', 'Solved 3+ clues without hints', 'vikings', 1),
    (p_game_id, 'Shieldwall Solver', 'Perfect teamwork under pressure', 'vikings', 2),
    (p_game_id, 'Stormbreaker', 'Finished under 60 minutes', 'vikings', 3),
    (p_game_id, 'Dragon''s Eye', 'Spotted every hidden detail', 'vikings', 4);

  -- Pirates themed achievements
  INSERT INTO game_achievements (game_id, title, short_description, style_tag, sort_order) VALUES
    (p_game_id, 'Captain''s Compass', 'Found the key clue early', 'pirates', 5),
    (p_game_id, 'Kraken Whisperer', 'Cracked the hardest lock', 'pirates', 6),
    (p_game_id, 'Plunder Prodigy', 'Found a bonus hidden clue', 'pirates', 7),
    (p_game_id, 'Cursed Coin Collector', 'Cleared with minimal retries', 'pirates', 8);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
