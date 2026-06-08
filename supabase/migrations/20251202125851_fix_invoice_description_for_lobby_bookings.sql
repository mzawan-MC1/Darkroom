/*
  # Fix Invoice Description for Lobby Game Bookings

  1. Problem
    - The `auto_generate_invoice_for_booking()` function only handles escape room bookings
    - When a lobby game booking is created, the description query returns NULL
    - This violates the NOT NULL constraint on `invoice_line_items.description`
    - Line 288: `'Booking for ' || (SELECT name FROM games WHERE id = NEW.game_id)`
    - For lobby bookings, `game_id` is NULL and `lobby_game_id` is set

  2. Solution
    - Update function to check both `game_id` AND `lobby_game_id`
    - Use COALESCE to query from either `games` or `lobby_games` table
    - Provide fallback description if both are NULL

  3. Changes
    - Replace simple subquery with CASE statement
    - Check if `lobby_game_id` is set → query `lobby_games` table
    - Check if `game_id` is set → query `games` table
    - Fallback to generic description if both NULL
*/

-- Drop and recreate the function with lobby game support
DROP FUNCTION IF EXISTS auto_generate_invoice_for_booking() CASCADE;

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
    NEW.number_of_players,
    CASE 
      WHEN NEW.number_of_players > 0 THEN NEW.subtotal / NEW.number_of_players
      ELSE NEW.subtotal
    END,
    NEW.subtotal
  );

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_invoice_on_booking ON bookings;
CREATE TRIGGER trigger_auto_invoice_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invoice_for_booking();

-- Update the create_invoice_for_booking function to also handle lobby games
CREATE OR REPLACE FUNCTION create_invoice_for_booking(booking_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_id uuid;
  booking_record RECORD;
  game_name_var text;
  booking_total decimal;
  add_ons_total decimal;
  tax_rate decimal := 0.05;
  subtotal_amount decimal;
  tax_amount_calc decimal;
  total_amount_calc decimal;
  add_on_record RECORD;
BEGIN
  -- Get booking details
  SELECT b.* INTO booking_record
  FROM bookings b
  WHERE b.id = booking_id_param;
  
  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE booking_id = booking_id_param) THEN
    RAISE EXCEPTION 'Invoice already exists for this booking';
  END IF;
  
  -- Get game name based on booking type
  IF booking_record.lobby_game_id IS NOT NULL THEN
    SELECT 'Lobby Game: ' || name INTO game_name_var
    FROM lobby_games
    WHERE id = booking_record.lobby_game_id;
  ELSIF booking_record.game_id IS NOT NULL THEN
    SELECT name || ' - Escape Room Booking' INTO game_name_var
    FROM games
    WHERE id = booking_record.game_id;
  ELSE
    game_name_var := 'Booking';
  END IF;
  
  -- Calculate totals (use final_amount from booking)
  booking_total := booking_record.final_amount;
  
  SELECT COALESCE(SUM(price_at_booking * quantity), 0) INTO add_ons_total
  FROM booking_add_on_selections
  WHERE booking_id = booking_id_param;
  
  subtotal_amount := booking_total + add_ons_total;
  tax_amount_calc := subtotal_amount * tax_rate;
  total_amount_calc := subtotal_amount + tax_amount_calc;
  
  -- Create invoice with customer details
  INSERT INTO invoices (
    invoice_number,
    booking_id,
    customer_name,
    customer_email,
    customer_phone,
    subtotal,
    tax_amount,
    admin_discount_percentage,
    admin_discount_amount,
    total_amount,
    due_date,
    status
  ) VALUES (
    generate_invoice_number(),
    booking_id_param,
    booking_record.customer_name,
    booking_record.customer_email,
    booking_record.customer_phone,
    subtotal_amount,
    tax_amount_calc,
    0,
    0,
    total_amount_calc,
    now() + interval '7 days',
    'pending'
  )
  RETURNING id INTO invoice_id;
  
  -- Create line item for base booking
  INSERT INTO invoice_line_items (
    invoice_id,
    item_type,
    item_id,
    description,
    quantity,
    unit_price,
    line_total
  ) VALUES (
    invoice_id,
    'booking',
    booking_id_param,
    COALESCE(game_name_var, 'Booking'),
    booking_record.number_of_players,
    CASE 
      WHEN booking_record.number_of_players > 0 
      THEN booking_record.final_amount / booking_record.number_of_players
      ELSE booking_record.final_amount
    END,
    booking_record.final_amount
  );
  
  -- Create line items for add-ons if any
  FOR add_on_record IN
    SELECT 
      baos.*,
      ba.name as add_on_name
    FROM booking_add_on_selections baos
    LEFT JOIN booking_add_ons ba ON ba.id = baos.add_on_id
    WHERE baos.booking_id = booking_id_param
  LOOP
    INSERT INTO invoice_line_items (
      invoice_id,
      item_type,
      item_id,
      description,
      quantity,
      unit_price,
      line_total
    ) VALUES (
      invoice_id,
      'add_on',
      add_on_record.add_on_id,
      COALESCE(add_on_record.add_on_name, 'Add-on'),
      add_on_record.quantity,
      add_on_record.price_at_booking,
      add_on_record.price_at_booking * add_on_record.quantity
    );
  END LOOP;
  
  RETURN invoice_id;
END;
$$;
