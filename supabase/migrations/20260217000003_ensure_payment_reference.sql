
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_reference text;
CREATE INDEX IF NOT EXISTS payments_payment_reference_idx ON public.payments(payment_reference);
