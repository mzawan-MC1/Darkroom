-- ==============================================================================
-- PRODUCTION FIX: CREATE MISSING POS_TRANSACTIONS TABLE + RLS
-- ==============================================================================
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard -> SQL Editor
-- 2. Run this script to create the missing table and policies.
-- 3. This is safe to run; it checks for existence before creating.
--
-- ==============================================================================

BEGIN;

-- 1. Create Table if not exists
CREATE TABLE IF NOT EXISTS public.pos_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NULL,
    customer_id uuid NULL,
    order_id uuid NULL,
    subtotal numeric NOT NULL DEFAULT 0,
    tax numeric NOT NULL DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    payment_method text NOT NULL DEFAULT 'cash',
    status text NOT NULL DEFAULT 'completed',
    notes text NULL,
    CONSTRAINT pos_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT pos_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
    CONSTRAINT pos_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE SET NULL,
    CONSTRAINT pos_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- 2. Enable RLS
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Drop existing first to allow re-run)

-- Policy: Admin/Manager/Staff Full Access
DROP POLICY IF EXISTS "Staff can manage all pos transactions" ON public.pos_transactions;
CREATE POLICY "Staff can manage all pos transactions" 
ON public.pos_transactions 
FOR ALL 
TO authenticated 
USING (
  public.has_role(auth.uid(), ARRAY['admin', 'manager', 'staff'])
);

-- Policy: Users can view their own transactions (as customer or creator)
DROP POLICY IF EXISTS "Users can view their own pos transactions" ON public.pos_transactions;
CREATE POLICY "Users can view their own pos transactions" 
ON public.pos_transactions 
FOR SELECT 
TO authenticated 
USING (
  created_by = auth.uid() OR customer_id = auth.uid()
);

-- Policy: Users can create transactions (if they are the creator)
DROP POLICY IF EXISTS "Users can create their own pos transactions" ON public.pos_transactions;
CREATE POLICY "Users can create their own pos transactions" 
ON public.pos_transactions 
FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by = auth.uid()
);

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

COMMIT;
