/*
  # Add Game Information to Invoices

  1. Changes
    - Add game_name column to store escape room game name
    - Add lobby_game_name column to store lobby game name
    - Add booking_type column to distinguish between escape room, lobby game, and merchandise
    - Update existing invoices with game names from linked bookings

  2. Purpose
    - Display game names in invoice management
    - Support both escape room and lobby game invoices
    - Enable proper revenue tracking for all booking types
*/

-- Add game_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'game_name'
  ) THEN
    ALTER TABLE invoices ADD COLUMN game_name text;
  END IF;
END $$;

-- Add lobby_game_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'lobby_game_name'
  ) THEN
    ALTER TABLE invoices ADD COLUMN lobby_game_name text;
  END IF;
END $$;

-- Add booking_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'booking_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN booking_type text DEFAULT 'escape_room';
  END IF;
END $$;

-- Add check constraint for booking_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_booking_type_check'
  ) THEN
    ALTER TABLE invoices 
    ADD CONSTRAINT invoices_booking_type_check 
    CHECK (booking_type IN ('escape_room', 'lobby_game', 'merchandise', 'custom'));
  END IF;
END $$;

-- Backfill game names for existing escape room invoices
UPDATE invoices i
SET 
  game_name = g.name,
  booking_type = 'escape_room'
FROM bookings b
JOIN games g ON b.game_id = g.id
WHERE i.booking_id = b.id
  AND b.game_id IS NOT NULL
  AND b.lobby_game_id IS NULL
  AND i.game_name IS NULL;

-- Backfill lobby game names for existing lobby game invoices
UPDATE invoices i
SET 
  lobby_game_name = lg.name,
  booking_type = 'lobby_game'
FROM bookings b
JOIN lobby_games lg ON b.lobby_game_id = lg.id
WHERE i.booking_id = b.id
  AND b.lobby_game_id IS NOT NULL
  AND i.lobby_game_name IS NULL;

-- Create index for game names
CREATE INDEX IF NOT EXISTS idx_invoices_game_name ON invoices(game_name);
CREATE INDEX IF NOT EXISTS idx_invoices_lobby_game_name ON invoices(lobby_game_name);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_type ON invoices(booking_type);

-- Add comments
COMMENT ON COLUMN invoices.game_name IS 'Name of escape room game (if applicable)';
COMMENT ON COLUMN invoices.lobby_game_name IS 'Name of lobby game (if applicable)';
COMMENT ON COLUMN invoices.booking_type IS 'Type of booking: escape_room, lobby_game, merchandise, or custom';