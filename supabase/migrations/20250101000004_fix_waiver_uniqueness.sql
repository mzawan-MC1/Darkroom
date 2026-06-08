-- Ensure unique constraint on waivers for upsert support
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'waivers_booking_player_unique'
    ) THEN
        ALTER TABLE waivers
        ADD CONSTRAINT waivers_booking_player_unique UNIQUE (booking_id, player_number);
    END IF;
END $$;

-- Optional: Index for performance
CREATE INDEX IF NOT EXISTS idx_waivers_booking_player 
ON waivers(booking_id, player_number);
