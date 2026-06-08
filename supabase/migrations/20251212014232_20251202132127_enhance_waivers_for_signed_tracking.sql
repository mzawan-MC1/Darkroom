/*
  # Enhance Waivers Table for Signed Waiver Tracking

  1. Changes
    - Add waiver_template_id to track which template was signed
    - Add template_version to track version at time of signing
    - Add template_title to store snapshot of title
    - Add template_content to store snapshot of content at signing time
    - Add game_id and game_name for reference
    - Add player_number for multi-player bookings
    - Add waiver_status tracking
    - Add indexes for performance

  2. Purpose
    - Store complete waiver information at time of signing
    - Allow customers to view their signed waivers with full details
    - Track which template version was accepted
    - Support multi-player bookings with individual waivers
*/

-- Add new columns to waivers table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'waiver_template_id'
  ) THEN
    ALTER TABLE waivers ADD COLUMN waiver_template_id uuid REFERENCES waiver_templates(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'template_version'
  ) THEN
    ALTER TABLE waivers ADD COLUMN template_version integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'template_title'
  ) THEN
    ALTER TABLE waivers ADD COLUMN template_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'template_content'
  ) THEN
    ALTER TABLE waivers ADD COLUMN template_content text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'game_id'
  ) THEN
    ALTER TABLE waivers ADD COLUMN game_id uuid REFERENCES games(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'game_name'
  ) THEN
    ALTER TABLE waivers ADD COLUMN game_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'player_number'
  ) THEN
    ALTER TABLE waivers ADD COLUMN player_number integer DEFAULT 1 CHECK (player_number >= 1 AND player_number <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'waiver_status'
  ) THEN
    ALTER TABLE waivers ADD COLUMN waiver_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'waivers' AND column_name = 'lobby_game_id'
  ) THEN
    ALTER TABLE waivers ADD COLUMN lobby_game_id uuid REFERENCES lobby_games(id);
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_waivers_user_id ON waivers(user_id);
CREATE INDEX IF NOT EXISTS idx_waivers_booking_id ON waivers(booking_id);
CREATE INDEX IF NOT EXISTS idx_waivers_game_id ON waivers(game_id);
CREATE INDEX IF NOT EXISTS idx_waivers_signed_at ON waivers(signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_waivers_waiver_status ON waivers(waiver_status);

-- Add comment explaining waiver purpose
COMMENT ON TABLE waivers IS 'Stores signed waivers for bookings. Can be linked to escape room games or lobby games.';
COMMENT ON COLUMN waivers.template_content IS 'Immutable snapshot of waiver content at time of signing for legal/audit purposes.';