/*
  # Add Promo Code Support to Invoice Line Items

  1. Changes
    - Update create_invoice_for_booking function to include promo code discount as a separate line item
    - Add promo code details (code and discount amount) to invoice line items when applicable
    - This makes promo code discounts clearly visible on invoices

  2. Benefits
    - Clear visibility of promo code discounts on invoices
    - Better tracking of promotional campaign effectiveness
    - Improved customer transparency
*/

CREATE OR REPLACE FUNCTION create_invoice_for_booking(booking_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_id uuid;
  booking_record RECORD;
  game_record RECORD;
  promo_record RECORD;
  booking_total decimal;
  add_ons_total decimal;
  tax_rate decimal := 0.05;
  subtotal_amount decimal;
  tax_amount_calc decimal;
  total_amount_calc decimal;
  add_on_record RECORD;
BEGIN
  -- Get booking details with promo code info
  SELECT 
    b.*,
    g.name as game_name,
    g.base_price,
    pc.code as promo_code,
    pc.discount_type as promo_discount_type,
    pc.discount_value as promo_discount_value
  INTO booking_record
  FROM bookings b
  LEFT JOIN games g ON g.id = b.game_id
  LEFT JOIN promo_codes pc ON pc.id = b.promo_code_id
  WHERE b.id = booking_id_param;
  
  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE booking_id = booking_id_param) THEN
    RAISE EXCEPTION 'Invoice already exists for this booking';
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
    discount_amount,
    admin_discount_percentage,
    admin_discount_amount,
    total_amount,
    due_date,
    status,
    game_name,
    booking_type
  ) VALUES (
    generate_invoice_number(),
    booking_id_param,
    booking_record.customer_name,
    booking_record.customer_email,
    booking_record.customer_phone,
    subtotal_amount,
    tax_amount_calc,
    COALESCE(booking_record.discount_amount, 0),
    0,
    0,
    total_amount_calc,
    now() + interval '7 days',
    'pending',
    booking_record.game_name,
    CASE 
      WHEN booking_record.lobby_game_id IS NOT NULL THEN 'lobby_game'
      ELSE 'escape_room'
    END
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
    booking_record.game_name || ' - ' || booking_record.number_of_players || ' players',
    1,
    booking_total,
    booking_total
  );
  
  -- Add line items for add-ons
  FOR add_on_record IN
    SELECT 
      bao.id,
      ba.name,
      bao.quantity,
      bao.price_at_booking
    FROM booking_add_on_selections bao
    JOIN booking_add_ons ba ON ba.id = bao.add_on_id
    WHERE bao.booking_id = booking_id_param
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
      add_on_record.id,
      add_on_record.name,
      add_on_record.quantity,
      add_on_record.price_at_booking,
      add_on_record.quantity * add_on_record.price_at_booking
    );
  END LOOP;
  
  -- Add promo code discount as a line item if applicable
  IF booking_record.promo_code_id IS NOT NULL AND booking_record.discount_amount > 0 THEN
    -- Get the promo code specific discount amount from promo_code_usage
    SELECT discount_applied INTO promo_record
    FROM promo_code_usage
    WHERE booking_id = booking_id_param
    ORDER BY used_at DESC
    LIMIT 1;
    
    IF promo_record.discount_applied > 0 THEN
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
        'discount',
        booking_record.promo_code_id,
        'Promo Code: ' || booking_record.promo_code || ' (' || 
        CASE 
          WHEN booking_record.promo_discount_type = 'percentage' 
          THEN booking_record.promo_discount_value || '% OFF'
          ELSE 'AED ' || booking_record.promo_discount_value || ' OFF'
        END || ')',
        1,
        -promo_record.discount_applied,
        -promo_record.discount_applied
      );
    END IF;
  END IF;
  
  RETURN invoice_id;
END;
$$;
