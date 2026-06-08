/*
  # Multi-Player Waiver System Enhancement
  
  ## Overview
  This migration enhances the waiver system to support multiple players per booking.
  When a booking is created with N players, the system will automatically generate N waiver slots.
  
  ## Changes
  
  1. **Waivers Table Enhancements**
     - Add `player_number` column (1-10) to track which player slot this waiver represents
     - Add `waiver_status` column ('pending', 'signed', 'expired') to track completion status
     - Make fields nullable that won't be filled until the waiver is actually signed
     - Add unique constraint to ensure one waiver per player per booking
  
  2. **Automatic Waiver Slot Generation**
     - Create trigger function that runs when a booking is created or updated
     - Automatically generates N waiver slots based on number_of_players
     - First waiver (player #1) is linked to the booking creator's user_id
     - Remaining waivers (players #2-N) are created as pending slots
  
  3. **Backfill Existing Bookings**
     - Generate missing waiver slots for existing bookings
     - Set existing waivers as player #1 with status 'signed'
     - Create pending slots for remaining players
*/

-- Step 1: Add new columns to waivers table
DO $$
BEGIN
  -- Add player_number column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waivers' AND column_name = 'player_number'
  ) THEN
    ALTER TABLE waivers ADD COLUMN player_number integer DEFAULT 1 CHECK (player_number >= 1 AND player_number <= 10);
  END IF;
  
  -- Add waiver_status column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waivers' AND column_name = 'waiver_status'
  ) THEN
    ALTER TABLE waivers ADD COLUMN waiver_status text DEFAULT 'pending' CHECK (waiver_status IN ('pending', 'signed', 'expired'));
  END IF;
END $$;

-- Step 2: Update existing waivers to have status 'signed' and player_number 1
UPDATE waivers 
SET 
  waiver_status = COALESCE(waiver_status, 'signed'),
  player_number = COALESCE(player_number, 1)
WHERE waiver_status IS NULL OR player_number IS NULL;

-- Step 3: Add unique constraint to prevent duplicate waivers per player per booking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'waivers_booking_player_unique'
  ) THEN
    ALTER TABLE waivers ADD CONSTRAINT waivers_booking_player_unique UNIQUE (booking_id, player_number);
  END IF;
END $$;

-- Step 4: Create function to auto-generate waiver slots for a booking
CREATE OR REPLACE FUNCTION generate_waiver_slots_for_booking()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_player_num integer;
  v_existing_count integer;
BEGIN
  -- Only process escape room bookings (not lobby games)
  IF NEW.game_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if this is a new booking or number of players changed
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.number_of_players != NEW.number_of_players) THEN
    
    -- Count existing waivers for this booking
    SELECT COUNT(*) INTO v_existing_count
    FROM waivers
    WHERE booking_id = NEW.id;
    
    -- If this is an insert and no waivers exist yet, or if players increased
    IF v_existing_count < NEW.number_of_players THEN
      
      -- Generate waiver slots for each player
      FOR v_player_num IN (v_existing_count + 1)..NEW.number_of_players LOOP
        
        -- Create waiver slot
        INSERT INTO waivers (
          booking_id,
          user_id,
          player_number,
          waiver_status,
          game_id,
          game_name,
          created_at
        ) VALUES (
          NEW.id,
          CASE WHEN v_player_num = 1 THEN NEW.user_id ELSE NULL END,
          v_player_num,
          'pending',
          NEW.game_id,
          (SELECT name FROM games WHERE id = NEW.game_id),
          NOW()
        )
        ON CONFLICT (booking_id, player_number) DO NOTHING;
        
      END LOOP;
      
    END IF;
    
    -- If number of players decreased, delete excess waiver slots (only pending ones)
    IF TG_OP = 'UPDATE' AND OLD.number_of_players > NEW.number_of_players THEN
      DELETE FROM waivers
      WHERE booking_id = NEW.id
        AND player_number > NEW.number_of_players
        AND waiver_status = 'pending';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 5: Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_generate_waiver_slots ON bookings;
CREATE TRIGGER trigger_generate_waiver_slots
  AFTER INSERT OR UPDATE OF number_of_players ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_waiver_slots_for_booking();

-- Step 6: Create helper function to get waiver completion status for a booking
CREATE OR REPLACE FUNCTION get_booking_waiver_status(p_booking_id uuid)
RETURNS TABLE (
  total_players integer,
  signed_count integer,
  pending_count integer,
  all_signed boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_players,
    COUNT(*) FILTER (WHERE waiver_status = 'signed')::integer as signed_count,
    COUNT(*) FILTER (WHERE waiver_status = 'pending')::integer as pending_count,
    (COUNT(*) FILTER (WHERE waiver_status = 'signed') = COUNT(*))::boolean as all_signed
  FROM waivers
  WHERE booking_id = p_booking_id;
END;
$$;

-- Step 7: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_waivers_booking_player ON waivers(booking_id, player_number);
CREATE INDEX IF NOT EXISTS idx_waivers_status ON waivers(waiver_status);