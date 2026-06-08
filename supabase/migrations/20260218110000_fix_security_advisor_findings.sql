-- 1. Fix security_definer_view on public.public_payment_settings

DROP VIEW IF EXISTS public.public_payment_settings;

CREATE OR REPLACE VIEW public.public_payment_settings AS
SELECT
  id,
  provider,
  is_active,
  mode,
  merchant_id,
  merchant_name,
  gateway_region_base_url AS gateway_base_url,
  api_version,
  timeout_url,
  return_url AS success_return_url,
  cancel_url AS cancel_return_url
FROM public.payment_settings
WHERE is_active = true;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active payment settings" ON public.payment_settings;

CREATE POLICY "public read active payment settings"
ON public.payment_settings
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2. Fix rls_disabled_in_public on public.pos_transaction_items

ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read pos items" ON public.pos_transaction_items;
DROP POLICY IF EXISTS "staff can read pos items" ON public.pos_transaction_items;
DROP POLICY IF EXISTS "staff can write pos items" ON public.pos_transaction_items;
DROP POLICY IF EXISTS "staff can manage pos items" ON public.pos_transaction_items;

-- Unified Staff Access Policy (Read + Write)
CREATE POLICY "staff can manage pos items"
ON public.pos_transaction_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('Admin','Manager','Cashier','Staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('Admin','Manager','Cashier','Staff')
  )
);
