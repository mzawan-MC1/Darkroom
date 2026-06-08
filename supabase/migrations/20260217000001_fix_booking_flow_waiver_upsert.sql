-- Fix duplicate waiver insertion in create_booking_flow
-- This handles the conflict between the trigger-generated waiver (player 1) and the explicit waiver insertion

-- Force search path for the session
SET search_path = public;

CREATE OR REPLACE FUNCTION create_booking_flow(
  p_booking_data jsonb,
  p_participants jsonb DEFAULT NULL,
  p_waiver_data jsonb DEFAULT NULL,
  p_order_data jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_order_id uuid;
  v_booking_record record;
BEGIN
  -- 1. Insert Booking
  -- This will trigger generate_waiver_slots_for_booking which creates empty waiver slots
  INSERT INTO bookings (
    user_id, game_id, lobby_game_id, booking_slot_id, booking_date, start_time, end_time,
    number_of_players, customer_name, customer_email, customer_phone,
    special_requests, referral_source, booking_status, payment_status,
    subtotal, vat_amount, total_amount, discount_amount, final_amount,
    booking_type_id, promo_code_id, difficulty_level, billing_address
  )
  VALUES (
    (p_booking_data->>'user_id')::uuid,
    (p_booking_data->>'game_id')::uuid,
    (p_booking_data->>'lobby_game_id')::uuid,
    (p_booking_data->>'booking_slot_id')::uuid,
    (p_booking_data->>'booking_date')::date,
    (p_booking_data->>'start_time')::time,
    (p_booking_data->>'end_time')::time,
    (p_booking_data->>'number_of_players')::integer,
    p_booking_data->>'customer_name',
    p_booking_data->>'customer_email',
    p_booking_data->>'customer_phone',
    p_booking_data->>'special_requests',
    p_booking_data->>'referral_source',
    (p_booking_data->>'booking_status')::booking_status,
    (p_booking_data->>'payment_status')::payment_status,
    (p_booking_data->>'subtotal')::numeric,
    (p_booking_data->>'vat_amount')::numeric,
    (p_booking_data->>'total_amount')::numeric,
    (p_booking_data->>'discount_amount')::numeric,
    (p_booking_data->>'final_amount')::numeric,
    (p_booking_data->>'booking_type_id')::uuid,
    (p_booking_data->>'promo_code_id')::uuid,
    p_booking_data->>'difficulty_level',
    p_booking_data->'billing_address'
  )
  RETURNING id INTO v_booking_id;

  -- Get the full record to return
  SELECT * INTO v_booking_record FROM bookings WHERE id = v_booking_id;

  -- 2. Insert Order (if provided)
  IF p_order_data IS NOT NULL THEN
    INSERT INTO orders (
      user_id, booking_id, order_type, customer_name, customer_email,
      subtotal, vat_amount, total_amount, discount_amount, final_amount,
      payment_status, promo_code_id
    )
    VALUES (
      (p_order_data->>'user_id')::uuid,
      v_booking_id,
      (p_order_data->>'order_type')::order_type,
      p_order_data->>'customer_name',
      p_order_data->>'customer_email',
      (p_order_data->>'subtotal')::numeric,
      (p_order_data->>'vat_amount')::numeric,
      (p_order_data->>'total_amount')::numeric,
      (p_order_data->>'discount_amount')::numeric,
      (p_order_data->>'final_amount')::numeric,
      (p_order_data->>'payment_status')::payment_status,
      (p_order_data->>'promo_code_id')::uuid
    )
    RETURNING id INTO v_order_id;
  END IF;

  -- 3. Insert Participants (if provided)
  IF p_participants IS NOT NULL THEN
    INSERT INTO booking_participants (
      booking_id, full_name, phone_number, email, age, is_waiver_signed
    )
    SELECT
      v_booking_id,
      (participant->>'full_name'),
      (participant->>'phone_number'),
      (participant->>'email'),
      (participant->>'age')::integer,
      COALESCE((participant->>'is_waiver_signed')::boolean, false)
    FROM jsonb_array_elements(p_participants) AS participant;
  END IF;

  -- 4. Insert/Update Waiver (if provided)
  -- Use UPSERT to handle conflict with trigger-generated waiver for player 1
  IF p_waiver_data IS NOT NULL THEN
    INSERT INTO waivers (
      booking_id, user_id, waiver_template_id, participant_name,
      participant_email, participant_phone, participant_age,
      waiver_status, signed_at, ip_address, signature_data,
      player_number
    )
    VALUES (
      v_booking_id,
      (p_waiver_data->>'user_id')::uuid,
      (p_waiver_data->>'waiver_template_id')::uuid,
      p_waiver_data->>'participant_name',
      p_waiver_data->>'participant_email',
      p_waiver_data->>'participant_phone',
      (p_waiver_data->>'participant_age')::integer,
      (p_waiver_data->>'waiver_status'),
      (p_waiver_data->>'signed_at')::timestamptz,
      p_waiver_data->>'ip_address',
      p_waiver_data->>'signature_data',
      1 -- Always map initial waiver to player 1
    )
    ON CONFLICT (booking_id, player_number) 
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      waiver_template_id = EXCLUDED.waiver_template_id,
      participant_name = EXCLUDED.participant_name,
      participant_email = EXCLUDED.participant_email,
      participant_phone = EXCLUDED.participant_phone,
      participant_age = EXCLUDED.participant_age,
      waiver_status = EXCLUDED.waiver_status,
      signed_at = EXCLUDED.signed_at,
      ip_address = EXCLUDED.ip_address,
      signature_data = EXCLUDED.signature_data;
  END IF;

  -- 5. Promo Code Usage
  IF (p_booking_data->>'promo_code_id') IS NOT NULL THEN
    INSERT INTO promo_code_usage (
      promo_code_id, user_id, booking_id, order_id, discount_applied
    )
    VALUES (
      (p_booking_data->>'promo_code_id')::uuid,
      (p_booking_data->>'user_id')::uuid,
      v_booking_id,
      v_order_id,
      (p_booking_data->>'discount_amount')::numeric
    );
    
    -- Update usage count
    UPDATE promo_codes
    SET usage_count = COALESCE(usage_count, 0) + 1
    WHERE id = (p_booking_data->>'promo_code_id')::uuid;
  END IF;

  RETURN to_jsonb(v_booking_record);
END;
$$;
