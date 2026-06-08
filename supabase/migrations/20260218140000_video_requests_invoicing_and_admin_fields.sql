DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_booking_type_check'
  ) THEN
    ALTER TABLE public.invoices DROP CONSTRAINT invoices_booking_type_check;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'booking_type'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_booking_type_check
      CHECK (booking_type IN ('escape_room', 'lobby_game', 'merchandise', 'custom', 'video_request'));
  END IF;
END $$;

ALTER TABLE public.video_requests
  ADD COLUMN IF NOT EXISTS booking_reference text,
  ADD COLUMN IF NOT EXISTS request_method text DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS video_type_detail text,
  ADD COLUMN IF NOT EXISTS visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_id uuid,
  ADD COLUMN IF NOT EXISTS player_count integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'video_requests'
      AND constraint_name = 'video_requests_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.video_requests
      ADD CONSTRAINT video_requests_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'video_requests_status_check'
  ) THEN
    ALTER TABLE public.video_requests DROP CONSTRAINT video_requests_status_check;
  END IF;
END $$;

ALTER TABLE public.video_requests
  ADD CONSTRAINT video_requests_status_check
  CHECK (status IN ('pending', 'processing', 'ready', 'delivered', 'cancelled', 'rejected'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'video_requests_request_method_check'
  ) THEN
    ALTER TABLE public.video_requests DROP CONSTRAINT video_requests_request_method_check;
  END IF;
END $$;

ALTER TABLE public.video_requests
  ADD CONSTRAINT video_requests_request_method_check
  CHECK (request_method IN ('reception', 'phone', 'whatsapp', 'email', 'online'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'video_requests_payment_status_check'
  ) THEN
    ALTER TABLE public.video_requests DROP CONSTRAINT video_requests_payment_status_check;
  END IF;
END $$;

ALTER TABLE public.video_requests
  ADD CONSTRAINT video_requests_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'video_requests_video_type_detail_check'
  ) THEN
    ALTER TABLE public.video_requests DROP CONSTRAINT video_requests_video_type_detail_check;
  END IF;
END $$;

ALTER TABLE public.video_requests
  ADD CONSTRAINT video_requests_video_type_detail_check
  CHECK (video_type_detail IS NULL OR video_type_detail IN ('short_video', 'full_video', 'raw_recording', 'custom_edited_video'));

CREATE INDEX IF NOT EXISTS idx_video_requests_booking_reference ON public.video_requests(booking_reference);
CREATE INDEX IF NOT EXISTS idx_video_requests_invoice_id ON public.video_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_video_requests_visit_at ON public.video_requests(visit_at);
CREATE INDEX IF NOT EXISTS idx_video_requests_payment_status ON public.video_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_video_requests_request_method ON public.video_requests(request_method);

CREATE OR REPLACE FUNCTION public.create_invoice_for_video_request(p_video_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_request record;
  v_existing_invoice_id uuid;
  v_invoice_id uuid;
  v_subtotal numeric;
  v_tax numeric;
  v_total numeric;
  v_invoice_status text;
BEGIN
  SELECT * INTO v_request
  FROM public.video_requests
  WHERE id = p_video_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Video request not found';
  END IF;

  IF v_request.invoice_id IS NOT NULL THEN
    RETURN v_request.invoice_id;
  END IF;

  SELECT ili.invoice_id INTO v_existing_invoice_id
  FROM public.invoice_line_items ili
  WHERE ili.item_type = 'video_request'
    AND ili.item_id = p_video_request_id
  LIMIT 1;

  IF v_existing_invoice_id IS NOT NULL THEN
    UPDATE public.video_requests
    SET invoice_id = v_existing_invoice_id
    WHERE id = p_video_request_id;
    RETURN v_existing_invoice_id;
  END IF;

  v_subtotal := COALESCE(v_request.price, 0);
  v_tax := v_subtotal * 0.05;
  v_total := v_subtotal + v_tax;

  IF v_request.payment_status = 'paid' THEN
    v_invoice_status := 'paid';
  ELSIF v_request.payment_status = 'refunded' THEN
    v_invoice_status := 'refunded';
  ELSE
    v_invoice_status := 'pending';
  END IF;

  INSERT INTO public.invoices (
    invoice_number,
    booking_id,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    subtotal,
    tax_amount,
    total_amount,
    due_date,
    status,
    booking_type,
    game_name,
    notes,
    amount_paid,
    paid_at,
    refunded_amount,
    refunded_at
  ) VALUES (
    public.generate_invoice_number(),
    v_request.booking_id,
    v_request.user_id,
    v_request.full_name,
    v_request.email,
    v_request.phone,
    v_subtotal,
    v_tax,
    v_total,
    now() + interval '7 days',
    v_invoice_status,
    'video_request',
    v_request.game_name,
    concat(
      'Video Request ', p_video_request_id::text,
      CASE WHEN v_request.booking_reference IS NOT NULL AND v_request.booking_reference <> '' THEN concat(E'\nReference: ', v_request.booking_reference) ELSE '' END,
      CASE WHEN v_request.video_type_detail IS NOT NULL THEN concat(E'\nType: ', v_request.video_type_detail) ELSE '' END
    ),
    CASE WHEN v_invoice_status = 'paid' THEN v_total ELSE 0 END,
    CASE WHEN v_invoice_status = 'paid' THEN now() ELSE NULL END,
    CASE WHEN v_invoice_status = 'refunded' THEN v_total ELSE 0 END,
    CASE WHEN v_invoice_status = 'refunded' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_line_items (
    invoice_id,
    item_type,
    item_id,
    description,
    quantity,
    unit_price,
    line_total
  ) VALUES (
    v_invoice_id,
    'video_request',
    p_video_request_id,
    concat('Video Request - ', COALESCE(v_request.video_type_detail, v_request.video_type), ' - ', COALESCE(v_request.game_name, '')),
    1,
    v_subtotal,
    v_subtotal
  );

  UPDATE public.video_requests
  SET invoice_id = v_invoice_id
  WHERE id = p_video_request_id;

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_create_invoice_for_video_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM public.create_invoice_for_video_request(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_invoice_on_video_request ON public.video_requests;
CREATE TRIGGER trigger_invoice_on_video_request
AFTER INSERT ON public.video_requests
FOR EACH ROW
EXECUTE FUNCTION public.trigger_create_invoice_for_video_request();

CREATE OR REPLACE FUNCTION public.trigger_sync_invoice_on_video_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_invoice_status text;
  v_total numeric;
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT total_amount INTO v_total
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF NEW.status IN ('cancelled', 'rejected') THEN
    v_invoice_status := 'cancelled';
  ELSIF NEW.payment_status = 'paid' THEN
    v_invoice_status := 'paid';
  ELSIF NEW.payment_status = 'refunded' THEN
    v_invoice_status := 'refunded';
  ELSE
    v_invoice_status := 'pending';
  END IF;

  UPDATE public.invoices
  SET
    status = v_invoice_status,
    amount_paid = CASE WHEN v_invoice_status = 'paid' THEN v_total ELSE amount_paid END,
    paid_at = CASE WHEN v_invoice_status = 'paid' THEN COALESCE(paid_at, now()) ELSE paid_at END,
    refunded_amount = CASE WHEN v_invoice_status = 'refunded' THEN v_total ELSE refunded_amount END,
    refunded_at = CASE WHEN v_invoice_status = 'refunded' THEN COALESCE(refunded_at, now()) ELSE refunded_at END,
    updated_at = now()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_invoice_on_video_request_update ON public.video_requests;
CREATE TRIGGER trigger_sync_invoice_on_video_request_update
AFTER UPDATE OF status, payment_status ON public.video_requests
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_invoice_on_video_request_update();

NOTIFY pgrst, 'reload schema';
