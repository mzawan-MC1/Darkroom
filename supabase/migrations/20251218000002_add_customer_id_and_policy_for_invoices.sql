-- Ensure invoices has customer_id and policy so customers can view their own invoices

BEGIN;

-- Add customer_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN customer_id uuid;
  END IF;
END $$;

-- Add foreign key to profiles(id) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'invoices'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_name = 'invoices_customer_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Reset select policy for customers to view own invoices via customer_id
DROP POLICY IF EXISTS "Customers view own invoices" ON public.invoices;
CREATE POLICY "Customers view own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

