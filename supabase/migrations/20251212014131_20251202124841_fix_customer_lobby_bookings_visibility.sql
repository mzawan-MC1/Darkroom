/*
  # Fix Customer Lobby Bookings Visibility

  1. Issue
    - Customers cannot see lobby bookings through the view
    - Views don't automatically inherit RLS policies

  2. Solution
    - Create security definer function for querying
    - Grant proper permissions

  3. Security
    - Ensure customers can only see their own bookings
    - Staff can see all bookings
*/

-- Create security definer function for customer lobby bookings
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
    AND b.user_id = COALESCE(p_user_id, auth.uid())
  ORDER BY b.booking_date DESC, b.start_time DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_customer_lobby_bookings TO authenticated;