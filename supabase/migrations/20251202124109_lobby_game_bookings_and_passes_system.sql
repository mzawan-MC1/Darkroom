/*
  # Lobby Game Bookings and Passes System

  1. Schema Changes
    - Add lobby_game_id to bookings table to distinguish lobby bookings
    - Add booking_id, user_id, duration_minutes to lobby_game_passes
    - Create indexes for performance

  2. Auto-Generation
    - Trigger to create lobby pass when lobby game is booked
    - Pass starts as 'pending' until activated by admin

  3. Views
    - Create view for easy querying of lobby bookings with pass info
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
    OR user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager', 'Game Master'])
  );

-- Update booking policies to handle lobby games
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;

CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager', 'Game Master', 'POS Operator'])
  );

-- ========================================
-- UPDATE ACTIVATE FUNCTION
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

-- ========================================
-- CREATE VIEWS FOR EASY QUERYING
-- ========================================

-- View for lobby game bookings
CREATE OR REPLACE VIEW customer_lobby_bookings AS
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.booking_status,
  b.payment_status,
  b.final_amount,
  b.user_id,
  b.customer_name,
  b.customer_email,
  b.customer_phone,
  b.number_of_players,
  b.special_requests,
  b.created_at,
  lg.id as lobby_game_id,
  lg.name as lobby_game_name,
  lg.description as lobby_game_description,
  lg.image_url as lobby_game_image,
  lp.id as pass_id,
  lp.pass_code,
  lp.status as pass_status,
  lp.is_active as pass_is_active,
  lp.activated_at as pass_activated_at,
  lp.expires_at as pass_expires_at,
  lp.duration_minutes
FROM bookings b
LEFT JOIN lobby_games lg ON b.lobby_game_id = lg.id
LEFT JOIN lobby_game_passes lp ON lp.booking_id = b.id
WHERE b.lobby_game_id IS NOT NULL;

-- Grant access
GRANT SELECT ON customer_lobby_bookings TO authenticated, anon;

-- ========================================
-- FUNCTION: Get Time Remaining
-- ========================================

CREATE OR REPLACE FUNCTION get_pass_time_remaining(p_pass_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at timestamptz;
  v_is_active boolean;
  v_diff interval;
  v_total_seconds integer;
  v_hours integer;
  v_minutes integer;
  v_seconds integer;
BEGIN
  SELECT expires_at, is_active INTO v_expires_at, v_is_active
  FROM lobby_game_passes
  WHERE id = p_pass_id;

  IF NOT v_is_active OR v_expires_at IS NULL THEN
    RETURN jsonb_build_object(
      'expired', true,
      'hours', 0,
      'minutes', 0,
      'seconds', 0,
      'total_seconds', 0
    );
  END IF;

  v_diff := v_expires_at - now();
  v_total_seconds := EXTRACT(EPOCH FROM v_diff)::integer;

  IF v_total_seconds <= 0 THEN
    RETURN jsonb_build_object(
      'expired', true,
      'hours', 0,
      'minutes', 0,
      'seconds', 0,
      'total_seconds', 0
    );
  END IF;

  v_hours := v_total_seconds / 3600;
  v_minutes := (v_total_seconds % 3600) / 60;
  v_seconds := v_total_seconds % 60;

  RETURN jsonb_build_object(
    'expired', false,
    'hours', v_hours,
    'minutes', v_minutes,
    'seconds', v_seconds,
    'total_seconds', v_total_seconds
  );
END;
$$;
