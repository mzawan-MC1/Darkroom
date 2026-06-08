/*
  # Enhance Waivers Table for Signed Waiver Tracking

  1. Changes
    - Add waiver_template_id to track which template was signed
    - Add template_version to track version at time of signing
    - Add template_title to store snapshot of title
    - Add template_content to store snapshot of content at signing time
    - Add indexes for performance

  2. Purpose
    - Store complete waiver information at time of signing
    - Allow customers to view their signed waivers with full details
    - Track which template version was accepted
    - Link to escape room bookings only

  3. Notes
    - Waivers are immutable once signed
    - Store snapshot of template content for legal/audit purposes
    - Only applies to escape room bookings (game_id IS NOT NULL)
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
    ALTER TABLE waivers ADD COLUMN template_version text;
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
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_waivers_user_id ON waivers(user_id);
CREATE INDEX IF NOT EXISTS idx_waivers_booking_id ON waivers(booking_id);
CREATE INDEX IF NOT EXISTS idx_waivers_game_id ON waivers(game_id);
CREATE INDEX IF NOT EXISTS idx_waivers_signed_at ON waivers(signed_at DESC);

-- Add check constraint to ensure waivers are only for escape rooms (game_id not null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'waivers_escape_room_only'
  ) THEN
    ALTER TABLE waivers 
    ADD CONSTRAINT waivers_escape_room_only 
    CHECK (game_id IS NOT NULL);
  END IF;
END $$;

-- Add comment explaining waiver purpose
COMMENT ON TABLE waivers IS 'Stores signed waivers for escape room bookings only. Each waiver is linked to a specific booking and game.';
COMMENT ON COLUMN waivers.game_id IS 'Required. Links waiver to escape room game (NOT lobby games).';
COMMENT ON COLUMN waivers.template_content IS 'Immutable snapshot of waiver content at time of signing for legal/audit purposes.';
