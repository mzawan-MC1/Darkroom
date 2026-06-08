/*
  # Fix Invoice Description for Lobby Game Bookings

  1. Problem
    - The `auto_generate_invoice_for_booking()` function only handles escape room bookings
    - For lobby bookings, game_id is NULL and lobby_game_id is set

  2. Solution
    - Update function to check both `game_id` AND `lobby_game_id`
    - Use COALESCE to query from either `games` or `lobby_games` table
    - Provide fallback description if both are NULL
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_invoice_on_booking ON bookings;
CREATE TRIGGER trigger_auto_invoice_on_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invoice_for_booking();