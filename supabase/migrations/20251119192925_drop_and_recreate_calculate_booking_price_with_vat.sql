/*
  # Update Price Calculation Function to Include VAT

  ## Changes
  - Drop old calculate_booking_price function
  - Recreate with VAT support (5%)
  - Return subtotal, VAT amount, and total with VAT
  - Maintain backward compatibility with discount logic

  ## Details
  - Subtotal = base_price - discount
  - VAT = subtotal * 5%
  - Final price = subtotal + VAT
*/

-- Drop the old function
DROP FUNCTION IF EXISTS calculate_booking_price(uuid, integer);

-- Recreate with VAT support
CREATE OR REPLACE FUNCTION calculate_booking_price(
  p_game_id uuid,
  p_num_participants integer
)
RETURNS TABLE (
  base_price decimal,
  discount_percentage decimal,
  discount_amount decimal,
  subtotal decimal,
  vat_amount decimal,
  final_price decimal
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_base_price decimal;
  v_discount_pct decimal := 0;
  v_total_base_price decimal;
  v_discount_amt decimal;
  v_subtotal decimal;
  v_vat_amt decimal;
  v_final_price decimal;
  v_vat_rate decimal := 0.05; -- 5% VAT in UAE
BEGIN
  -- Get the game's base price
  SELECT games.base_price INTO v_game_base_price
  FROM games
  WHERE games.id = p_game_id;

  IF v_game_base_price IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- Calculate total base price
  v_total_base_price := v_game_base_price * p_num_participants;

  -- Find applicable discount tier (game-specific first, then global)
  SELECT pt.discount_percentage INTO v_discount_pct
  FROM pricing_tiers pt
  WHERE pt.is_active = true
    AND p_num_participants >= pt.min_participants
    AND p_num_participants <= pt.max_participants
    AND (pt.game_id = p_game_id OR pt.game_id IS NULL)
  ORDER BY 
    CASE WHEN pt.game_id = p_game_id THEN 0 ELSE 1 END,
    pt.discount_percentage DESC
  LIMIT 1;

  -- Default to 0 if no tier found
  v_discount_pct := COALESCE(v_discount_pct, 0);

  -- Calculate discount amount and subtotal (price after discount, before VAT)
  v_discount_amt := ROUND(v_total_base_price * (v_discount_pct / 100), 2);
  v_subtotal := v_total_base_price - v_discount_amt;

  -- Calculate VAT on subtotal
  v_vat_amt := ROUND(v_subtotal * v_vat_rate, 2);

  -- Calculate final price (subtotal + VAT)
  v_final_price := v_subtotal + v_vat_amt;

  -- Return the result
  RETURN QUERY SELECT 
    v_total_base_price,
    v_discount_pct,
    v_discount_amt,
    v_subtotal,
    v_vat_amt,
    v_final_price;
END;
$$;
