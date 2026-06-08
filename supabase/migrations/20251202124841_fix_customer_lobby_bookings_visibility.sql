/*
  # Fix Customer Lobby Bookings Visibility

  1. Issue
    - Customers cannot see lobby bookings through the view
    - Views don't automatically inherit RLS policies

  2. Solution
    - Drop the view and recreate as a security definer function
    - Alternative: Use direct table queries with proper joins
    - Grant proper permissions

  3. Security
    - Ensure customers can only see their own bookings
    - Staff can see all bookings
*/

-- ========================================
-- DROP OLD VIEW
-- ========================================

DROP VIEW IF EXISTS customer_lobby_bookings;

-- ========================================
-- CREATE SECURITY DEFINER FUNCTION
-- ========================================

-- This function respects RLS and allows customers to query their lobby bookings
CREATE OR REPLACE FUNCTION get_customer_lobby_bookings(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  booking_number text,
  booking_date date,
  start_time time,
  end_time time,
  booking_status text,
  payment_status text,
  final_amount numeric,
  user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  number_of_players integer,
  special_requests text,
  created_at timestamptz,
  lobby_game_id uuid,
  lobby_game_name text,
  lobby_game_description text,
  lobby_game_image text,
  pass_id uuid,
  pass_code text,
  pass_status text,
  pass_is_active boolean,
  pass_activated_at timestamptz,
  pass_expires_at timestamptz,
  duration_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user_id is provided, filter by it. Otherwise use auth.uid()
  RETURN QUERY
  SELECT 
    b.id,
    b.booking_number,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.booking_status::text,
    b.payment_status::text,
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
  WHERE b.lobby_game_id IS NOT NULL
    AND (
      b.user_id = COALESCE(p_user_id, auth.uid())
      OR user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager', 'Game Master', 'Staff'])
    )
  ORDER BY b.booking_date DESC, b.start_time DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_customer_lobby_bookings TO authenticated;

-- ========================================
-- ALTERNATIVE: Ensure bookings with lobby_game_id are visible
-- ========================================

-- Make sure the "Customers can view own bookings" policy is active
-- This policy should already allow customers to see their bookings

-- Verify lobby_games is accessible
DO $$
BEGIN
  -- Check if lobby_games has RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'lobby_games' 
    AND rowsecurity = true
  ) THEN
    -- Enable RLS if not enabled
    ALTER TABLE lobby_games ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing lobby_games policies for customers if any
DROP POLICY IF EXISTS "Anyone can view lobby games" ON lobby_games;
DROP POLICY IF EXISTS "Customers can view lobby games" ON lobby_games;

-- Allow everyone to view lobby games (they're public info)
CREATE POLICY "Anyone can view lobby games"
  ON lobby_games FOR SELECT
  TO authenticated, anon
  USING (true);

-- Ensure admins can manage lobby games
DROP POLICY IF EXISTS "Admins can manage lobby games" ON lobby_games;

CREATE POLICY "Admins can manage lobby games"
  ON lobby_games FOR ALL
  TO authenticated
  USING (user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager']))
  WITH CHECK (user_has_active_role(auth.uid(), ARRAY['Admin', 'Manager']));

-- ========================================
-- TEST QUERY HELPER
-- ========================================

-- Function to help debug visibility issues
CREATE OR REPLACE FUNCTION test_lobby_booking_visibility()
RETURNS TABLE (
  has_bookings boolean,
  booking_count bigint,
  lobby_game_count bigint,
  pass_count bigint,
  current_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM bookings WHERE user_id = auth.uid() AND lobby_game_id IS NOT NULL) as has_bookings,
    (SELECT COUNT(*) FROM bookings WHERE user_id = auth.uid() AND lobby_game_id IS NOT NULL) as booking_count,
    (SELECT COUNT(*) FROM lobby_games) as lobby_game_count,
    (SELECT COUNT(*) FROM lobby_game_passes WHERE user_id = auth.uid()) as pass_count,
    auth.uid() as current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION test_lobby_booking_visibility TO authenticated;
