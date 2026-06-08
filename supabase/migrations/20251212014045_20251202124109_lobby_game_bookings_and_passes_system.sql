/*
  # Lobby Game Bookings and Passes System

  1. Schema Changes
    - Add lobby_game_id to bookings table to distinguish lobby bookings
    - Add booking_id, user_id, duration_minutes to lobby_game_passes
    - Create indexes for performance

  2. Auto-Generation
    - Trigger to create lobby pass when lobby game is booked
    - Pass starts as 'pending' until activated by admin
*/

-- ========================================
-- ADD LOBBY GAME SUPPORT TO BOOKINGS
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'lobby_game_id') THEN
    ALTER TABLE bookings ADD COLUMN lobby_game_id uuid REFERENCES lobby_games(id);
  END IF;
END $$;

-- Create index for lobby game bookings
CREATE INDEX IF NOT EXISTS idx_bookings_lobby_game ON bookings(lobby_game_id);

-- ========================================
-- ENHANCE LOBBY GAME PASSES
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lobby_game_passes' AND column_name = 'booking_id') THEN
    ALTER TABLE lobby_game_passes ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lobby_game_passes' AND column_name = 'user_id') THEN
    ALTER TABLE lobby_game_passes ADD COLUMN user_id uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lobby_game_passes' AND column_name = 'duration_minutes') THEN
    ALTER TABLE lobby_game_passes ADD COLUMN duration_minutes integer;
  END IF;
END $$;

-- Update duration_minutes from hours_purchased for existing records
UPDATE lobby_game_passes 
SET duration_minutes = hours_purchased * 60 
WHERE duration_minutes IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lobby_passes_booking ON lobby_game_passes(booking_id);
CREATE INDEX IF NOT EXISTS idx_lobby_passes_user ON lobby_game_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_lobby_passes_status ON lobby_game_passes(status);

-- ========================================
-- AUTO-CREATE LOBBY PASS ON BOOKING
-- ========================================

CREATE OR REPLACE FUNCTION auto_create_lobby_pass_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass_code text;
  v_duration_hours integer;
  v_duration_minutes integer;
BEGIN
  -- Only create pass for lobby game bookings (where lobby_game_id is set)
  IF NEW.lobby_game_id IS NOT NULL THEN
    
    -- Calculate duration from booking times
    v_duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)::interval) / 60;
    v_duration_hours := CEIL(v_duration_minutes / 60.0);
    
    -- Default to 1 hour if calculation fails
    IF v_duration_hours <= 0 THEN
      v_duration_hours := 1;
      v_duration_minutes := 60;
    END IF;
    
    -- Generate unique pass code
    v_pass_code := 'LOBBY-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
    
    -- Create lobby game pass
    INSERT INTO lobby_game_passes (
      pass_code,
      booking_id,
      user_id,
      lobby_game_id,
      customer_name,
      hours_purchased,
      duration_minutes,
      status
    )
    VALUES (
      v_pass_code,
      NEW.id,
      NEW.user_id,
      NEW.lobby_game_id,
      NEW.customer_name,
      v_duration_hours,
      v_duration_minutes,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_create_lobby_pass ON bookings;
CREATE TRIGGER trigger_auto_create_lobby_pass
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_lobby_pass_on_booking();

-- ========================================
-- UPDATE RLS POLICIES
-- ========================================

-- Drop and recreate customer policy for lobby passes
DROP POLICY IF EXISTS "Customers can view own lobby passes" ON lobby_game_passes;

CREATE POLICY "Customers can view own lobby passes"
  ON lobby_game_passes FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
  );

-- Update booking policies to handle lobby games
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;

CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ========================================
-- ACTIVATE FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION activate_lobby_pass(p_pass_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes integer;
BEGIN
  -- Get duration in minutes
  SELECT COALESCE(duration_minutes, hours_purchased * 60) INTO v_minutes
  FROM lobby_game_passes
  WHERE id = p_pass_id;

  -- Update pass with activation time and expiration
  UPDATE lobby_game_passes
  SET 
    is_active = true,
    status = 'active',
    activated_at = now(),
    expires_at = now() + (v_minutes || ' minutes')::interval,
    activated_by = p_admin_id,
    start_time = now(),
    end_time = now() + (v_minutes || ' minutes')::interval
  WHERE id = p_pass_id;
END;
$$;