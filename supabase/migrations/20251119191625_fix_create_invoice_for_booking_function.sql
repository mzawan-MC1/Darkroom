/*
  # Fix create_invoice_for_booking Function

  ## Changes
  - Update function to populate new invoice fields
  - Add customer information from booking
  - Create invoice line items for bookings
  - Add proper error handling

  ## Details
  - Fetches customer data from booking
  - Creates line items for base booking and add-ons
  - Uses the new invoice schema with all fields
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
  booking_total decimal;
  add_ons_total decimal;
  tax_rate decimal := 0.05;
  subtotal_amount decimal;
  tax_amount_calc decimal;
  total_amount_calc decimal;
  add_on_record RECORD;
BEGIN
  -- Get booking details
  SELECT 
    b.*,
    g.name as game_name,
    g.base_price
  INTO booking_record
  FROM bookings b
  LEFT JOIN games g ON g.id = b.game_id
  WHERE b.id = booking_id_param;
  
  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE booking_id = booking_id_param) THEN
    RAISE EXCEPTION 'Invoice already exists for this booking';
  END IF;
  
  -- Calculate totals
  booking_total := booking_record.final_price;
  
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
    COALESCE(booking_record.game_name || ' - Escape Room Booking', 'Escape Room Booking'),
    booking_record.number_of_players,
    booking_record.final_price / NULLIF(booking_record.number_of_players, 0),
    booking_record.final_price
  );
  
  -- Create line items for add-ons if any
  FOR add_on_record IN
    SELECT 
      baos.*,
      a.name as add_on_name
    FROM booking_add_on_selections baos
    LEFT JOIN add_ons a ON a.id = baos.add_on_id
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
