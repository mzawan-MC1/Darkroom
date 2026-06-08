-- Add refund columns to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS refunded_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS refunded_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refund_reason text DEFAULT NULL;

-- Add constraints
ALTER TABLE invoices 
ADD CONSTRAINT check_refunded_amount_positive CHECK (refunded_amount >= 0),
ADD CONSTRAINT check_refunded_amount_limit CHECK (refunded_amount <= total_amount);

-- Update status check constraint to include refund statuses
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'paid'::text, 'cancelled'::text, 'partially_paid'::text, 'refunded'::text, 'partially_refunded'::text]));

-- Create RPC for processing refunds
CREATE OR REPLACE FUNCTION process_invoice_refund(
  p_invoice_id uuid,
  p_refund_amount numeric,
  p_reason text,
  p_updated_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice record;
  v_new_refunded_amount numeric;
  v_new_status text;
  v_booking_id uuid;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Validate refund amount
  v_new_refunded_amount := COALESCE(v_invoice.refunded_amount, 0) + p_refund_amount;
  
  IF v_new_refunded_amount > v_invoice.amount_paid THEN
     RETURN json_build_object('success', false, 'error', 'Refund amount cannot exceed amount paid');
  END IF;

  -- Determine new status
  IF v_new_refunded_amount >= v_invoice.amount_paid THEN
    v_new_status := 'refunded';
  ELSIF v_new_refunded_amount > 0 THEN
    v_new_status := 'partially_refunded';
  ELSE
    v_new_status := v_invoice.status;
  END IF;

  -- Update invoice
  UPDATE invoices 
  SET 
    refunded_amount = v_new_refunded_amount,
    refunded_at = now(),
    refund_reason = p_reason,
    status = v_new_status,
    updated_by = p_updated_by,
    updated_at = now()
  WHERE id = p_invoice_id;

  -- Update linked booking if exists
  v_booking_id := v_invoice.booking_id;
  IF v_booking_id IS NOT NULL THEN
    UPDATE bookings
    SET 
      payment_status = CASE 
        WHEN v_new_status = 'refunded' THEN 'refunded'
        WHEN v_new_status = 'partially_refunded' THEN 'partially_paid' -- booking enum might not support partially_refunded yet
        ELSE payment_status
      END,
      updated_at = now()
    WHERE id = v_booking_id;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'new_status', v_new_status, 
    'refunded_amount', v_new_refunded_amount
  );
END;
$$;
