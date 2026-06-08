/*
  # Create Price Calculation Function

  1. New Functions
    - `calculate_booking_price` - calculates the final price with group discounts
      - Takes game_id, number_of_participants as input
      - Returns base_price, discount_percentage, discount_amount, final_price

  2. Purpose
    - Centralized pricing logic
    - Consistent discount application
    - Easy to maintain and update
*/

-- Create function to calculate booking price with group discounts
CREATE OR REPLACE FUNCTION calculate_booking_price(
  p_game_id uuid,
  p_num_participants integer
)
RETURNS TABLE (
  base_price decimal,
  discount_percentage decimal,
  discount_amount decimal,
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
  v_final_price decimal;
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

  -- Calculate discount amount and final price
  v_discount_amt := v_total_base_price * (v_discount_pct / 100);
  v_final_price := v_total_base_price - v_discount_amt;

  -- Return the result
  RETURN QUERY SELECT 
    v_total_base_price,
    v_discount_pct,
    v_discount_amt,
    v_final_price;
END;
$$;