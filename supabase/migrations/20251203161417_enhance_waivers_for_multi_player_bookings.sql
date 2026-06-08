/*
  # Multi-Player Waiver System Enhancement
  
  ## Overview
  This migration enhances the waiver system to support multiple players per booking.
  When a booking is created with N players, the system will automatically generate N waiver slots.
  
  ## Changes
  
  1. **Waivers Table Enhancements**
     - Add `player_number` column (1-10) to track which player slot this waiver represents
     - Add `waiver_status` column ('pending', 'signed', 'expired') to track completion status
     - Make fields nullable that won't be filled until the waiver is actually signed:
       - participant_name, participant_email, signature_data, emergency_contact_name, emergency_contact_phone
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
  
  ## Security
  - Maintain existing RLS policies
  - Staff can manage all waivers for their bookings
  - Customers can only sign waivers linked to their bookings
*/

-- Step 1: Add new columns to waivers table
DO $$
BEGIN
  -- Add player_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waivers' AND column_name = 'player_number'
  ) THEN
    ALTER TABLE waivers ADD COLUMN player_number integer DEFAULT 1 CHECK (player_number >= 1 AND player_number <= 10);
  END IF;
  
  -- Add waiver_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'waivers' AND column_name = 'waiver_status'
  ) THEN
    ALTER TABLE waivers ADD COLUMN waiver_status text DEFAULT 'pending' CHECK (waiver_status IN ('pending', 'signed', 'expired'));
  END IF;
END $$;

-- Step 2: Make certain fields nullable (they'll be filled when waiver is signed)
ALTER TABLE waivers ALTER COLUMN participant_name DROP NOT NULL;
ALTER TABLE waivers ALTER COLUMN signature_data DROP NOT NULL;

-- Step 3: Update existing waivers to have status 'signed' and player_number 1
UPDATE waivers 
SET 
  waiver_status = 'signed',
  player_number = 1
WHERE waiver_status IS NULL OR player_number IS NULL;

-- Step 4: Add unique constraint to prevent duplicate waivers per player per booking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'waivers_booking_player_unique'
  ) THEN
    ALTER TABLE waivers ADD CONSTRAINT waivers_booking_player_unique UNIQUE (booking_id, player_number);
  END IF;
END $$;

-- Step 5: Create function to auto-generate waiver slots for a booking
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

-- Step 6: Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_generate_waiver_slots ON bookings;
CREATE TRIGGER trigger_generate_waiver_slots
  AFTER INSERT OR UPDATE OF number_of_players ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_waiver_slots_for_booking();

-- Step 7: Backfill waiver slots for existing bookings
DO $$
DECLARE
  v_booking RECORD;
  v_player_num integer;
  v_existing_count integer;
BEGIN
  -- Loop through all escape room bookings
  FOR v_booking IN 
    SELECT b.id, b.user_id, b.number_of_players, b.game_id, g.name as game_name
    FROM bookings b
    LEFT JOIN games g ON b.game_id = g.id
    WHERE b.game_id IS NOT NULL
  LOOP
    
    -- Count existing waivers for this booking
    SELECT COUNT(*) INTO v_existing_count
    FROM waivers
    WHERE booking_id = v_booking.id;
    
    -- Generate missing waiver slots
    IF v_existing_count < v_booking.number_of_players THEN
      FOR v_player_num IN (v_existing_count + 1)..v_booking.number_of_players LOOP
        
        INSERT INTO waivers (
          booking_id,
          user_id,
          player_number,
          waiver_status,
          game_id,
          game_name,
          created_at
        ) VALUES (
          v_booking.id,
          CASE WHEN v_player_num = 1 THEN v_booking.user_id ELSE NULL END,
          v_player_num,
          'pending',
          v_booking.game_id,
          v_booking.game_name,
          NOW()
        )
        ON CONFLICT (booking_id, player_number) DO NOTHING;
        
      END LOOP;
    END IF;
    
  END LOOP;
END $$;

-- Step 8: Create helper function to get waiver completion status for a booking
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

-- Step 9: Add RLS policy for staff to manage waivers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waivers' 
    AND policyname = 'Staff can update waivers'
  ) THEN
    CREATE POLICY "Staff can update waivers"
      ON waivers
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'game_master', 'customer_service')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'game_master', 'customer_service')
        )
      );
  END IF;
END $$;

-- Step 10: Update the Users can create waivers policy to allow signing any pending waiver for their booking
DROP POLICY IF EXISTS "Users can create waivers" ON waivers;
CREATE POLICY "Users can create waivers"
  ON waivers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM bookings WHERE id = booking_id
    )
  );

-- Step 11: Add policy for users to update pending waivers for their bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waivers' 
    AND policyname = 'Users can update pending waivers for their bookings'
  ) THEN
    CREATE POLICY "Users can update pending waivers for their bookings"
      ON waivers
      FOR UPDATE
      TO authenticated
      USING (
        waiver_status = 'pending' 
        AND booking_id IN (
          SELECT id FROM bookings WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        waiver_status = 'pending' 
        AND booking_id IN (
          SELECT id FROM bookings WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Step 12: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_waivers_booking_player ON waivers(booking_id, player_number);
CREATE INDEX IF NOT EXISTS idx_waivers_status ON waivers(waiver_status);
