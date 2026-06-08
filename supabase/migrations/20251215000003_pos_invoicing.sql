-- ==============================================================================
-- POS Invoicing & Discounts - Minimal, Idempotent Migration
-- ==============================================================================
-- Run in Supabase SQL Editor for project jkidjlfoqsgklqavjvpb
-- This adds minimal columns and RLS to support POS → Invoice generation
-- No schema renames; only additive changes. Safe to re-run.

BEGIN;

-- 1) Link POS transactions to invoices (preferred Option 1)
ALTER TABLE IF EXISTS public.pos_transactions
  ADD COLUMN IF NOT EXISTS invoice_id uuid;
ALTER TABLE IF EXISTS public.pos_transactions
  ADD CONSTRAINT IF NOT EXISTS pos_transactions_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Ensure commonly used columns exist to match app code
ALTER TABLE IF EXISTS public.pos_transactions
  ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE IF EXISTS public.pos_transactions
  ADD CONSTRAINT IF NOT EXISTS pos_transactions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.pos_transactions
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';

-- 2) Discounts on POS
ALTER TABLE IF EXISTS public.pos_transactions
  ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'fixed';
ALTER TABLE IF EXISTS public.pos_transactions
  ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.pos_transactions
  ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

-- POS item table (create minimal if missing)
CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  item_code text NULL,
  item_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;

-- 3) Ensure invoice_line_items supports discount/tax/line_total (additive only)
ALTER TABLE IF EXISTS public.invoice_line_items
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.invoice_line_items
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.invoice_line_items
  ADD COLUMN IF NOT EXISTS line_total numeric DEFAULT 0;

-- 4) RLS policies for POS-related tables

-- pos_transaction_items policies
DROP POLICY IF EXISTS "Staff manage pos items" ON public.pos_transaction_items;
CREATE POLICY "Staff manage pos items"
ON public.pos_transaction_items
FOR ALL
TO authenticated
USING (public.has_role(ARRAY['admin','manager','staff']))
WITH CHECK (public.has_role(ARRAY['admin','manager','staff']));

-- invoices policies (staff full access; customers view own via customer_id)
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Staff manage invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (public.has_role(ARRAY['admin','manager','staff']))
WITH CHECK (public.has_role(ARRAY['admin','manager','staff']));

-- Customers can view their own invoices if customer_id is set
DROP POLICY IF EXISTS "Customers view own invoices" ON public.invoices;
CREATE POLICY "Customers view own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- invoice_line_items policies (staff manage)
ALTER TABLE IF EXISTS public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage invoice line items" ON public.invoice_line_items;
CREATE POLICY "Staff manage invoice line items"
ON public.invoice_line_items
FOR ALL
TO authenticated
USING (public.has_role(ARRAY['admin','manager','staff']))
WITH CHECK (public.has_role(ARRAY['admin','manager','staff']));

-- invoice_payments policies (staff manage)
ALTER TABLE IF EXISTS public.invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage invoice payments" ON public.invoice_payments;
CREATE POLICY "Staff manage invoice payments"
ON public.invoice_payments
FOR ALL
TO authenticated
USING (public.has_role(ARRAY['admin','manager','staff']))
WITH CHECK (public.has_role(ARRAY['admin','manager','staff']));

-- Add invoices.customer_id to support customer RLS (minimal, optional)
ALTER TABLE IF EXISTS public.invoices
  ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE IF EXISTS public.invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

