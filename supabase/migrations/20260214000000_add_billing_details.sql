-- Add billing_address column to bookings and invoices
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_address jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_address jsonb;

-- Update create_booking_flow to handle billing_address
CREATE OR REPLACE FUNCTION create_booking_flow(
  p_booking_data jsonb,
  p_participants jsonb DEFAULT NULL,
  p_waiver_data jsonb DEFAULT NULL,
  p_order_data jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_order_id uuid;
  v_booking_record bookings;
BEGIN
  -- 1. Insert Booking
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

  -- 4. Insert Waiver (if provided)
  IF p_waiver_data IS NOT NULL THEN
    INSERT INTO waivers (
      booking_id, user_id, waiver_template_id, participant_name,
      participant_email, participant_phone, participant_age,
      waiver_status, signed_at, ip_address, signature_data
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
      p_waiver_data->>'signature_data'
    );
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

-- Update auto_generate_invoice_for_booking to copy billing_address
CREATE OR REPLACE FUNCTION auto_generate_invoice_for_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number text;
  v_invoice_id uuid;
  v_description text;
BEGIN
  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::text, 6, '0');

  -- Determine description based on booking type
  IF NEW.lobby_game_id IS NOT NULL THEN
    -- Lobby game booking
    SELECT 'Lobby Game: ' || name INTO v_description
    FROM lobby_games
    WHERE id = NEW.lobby_game_id;
  ELSIF NEW.game_id IS NOT NULL THEN
    -- Escape room booking
    SELECT 'Booking for ' || name INTO v_description
    FROM games
    WHERE id = NEW.game_id;
  ELSE
    -- Fallback for unknown booking type
    v_description := 'Booking #' || NEW.booking_number;
  END IF;

  -- Ensure description is never NULL
  v_description := COALESCE(v_description, 'Booking');

  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    booking_id,
    customer_name,
    customer_email,
    customer_phone,
    billing_address,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    currency,
    status
  )
  VALUES (
    v_invoice_number,
    NEW.id,
    NEW.customer_name,
    NEW.customer_email,
    NEW.customer_phone,
    NEW.billing_address,
    NEW.subtotal,
    NEW.vat_amount,
    NEW.discount_amount,
    NEW.final_amount,
    'AED',
    'pending'
  )
  RETURNING id INTO v_invoice_id;

  -- Create line item for the booking
  INSERT INTO invoice_line_items (
    invoice_id,
    item_type,
    item_id,
    description,
    quantity,
    unit_price,
    line_total
  )
  VALUES (
    v_invoice_id,
    'booking',
    NEW.id,
    v_description,
    COALESCE(NEW.number_of_players, 1),
    CASE 
      WHEN COALESCE(NEW.number_of_players, 0) > 0 THEN NEW.subtotal / NEW.number_of_players
      ELSE NEW.subtotal
    END,
    NEW.subtotal
  );

  RETURN NEW;
END;
$$;
