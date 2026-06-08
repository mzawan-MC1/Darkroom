-- Update create_flexible_invoice to accept optional customer_id and set it on invoices
-- This enables RLS policy "Customers view own invoices" that relies on invoices.customer_id = auth.uid()

BEGIN;

CREATE OR REPLACE FUNCTION create_flexible_invoice(
  customer_name_param text,
  customer_email_param text,
  customer_phone_param text,
  line_items jsonb,
  admin_discount_pct decimal DEFAULT 0,
  discount_reason_param text DEFAULT NULL,
  notes_param text DEFAULT NULL,
  booking_id_param uuid DEFAULT NULL,
  customer_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_id uuid;
  subtotal_amount decimal := 0;
  tax_rate decimal := 0.05;
  tax_amount_calc decimal;
  admin_discount_calc decimal := 0;
  total_amount_calc decimal;
  line_item jsonb;
BEGIN
  -- Calculate subtotal from line items
  FOR line_item IN SELECT * FROM jsonb_array_elements(line_items)
  LOOP
    subtotal_amount := subtotal_amount + ((line_item->>'quantity')::decimal * (line_item->>'unit_price')::decimal);
  END LOOP;
  
  -- Calculate admin discount if provided
  IF admin_discount_pct > 0 THEN
    admin_discount_calc := subtotal_amount * (admin_discount_pct / 100);
  END IF;
  
  -- Calculate tax on (subtotal - discount)
  tax_amount_calc := (subtotal_amount - admin_discount_calc) * tax_rate;
  
  -- Calculate total
  total_amount_calc := subtotal_amount - admin_discount_calc + tax_amount_calc;
  
  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    booking_id,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    subtotal,
    tax_amount,
    admin_discount_percentage,
    admin_discount_amount,
    admin_discount_reason,
    total_amount,
    notes,
    due_date,
    status
  ) VALUES (
    generate_invoice_number(),
    booking_id_param,
    customer_id_param,
    customer_name_param,
    customer_email_param,
    customer_phone_param,
    subtotal_amount,
    tax_amount_calc,
    admin_discount_pct,
    admin_discount_calc,
    discount_reason_param,
    total_amount_calc,
    notes_param,
    now() + interval '7 days',
    'pending'
  )
  RETURNING id INTO invoice_id;
  
  -- Insert line items
  FOR line_item IN SELECT * FROM jsonb_array_elements(line_items)
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
      line_item->>'item_type',
      (line_item->>'item_id')::uuid,
      line_item->>'description',
      (line_item->>'quantity')::integer,
      (line_item->>'unit_price')::decimal,
      (line_item->>'quantity')::decimal * (line_item->>'unit_price')::decimal
    );
  END LOOP;
  
  RETURN invoice_id;
END;
$$;

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

