-- Backfill invoices.customer_id by matching profiles.email
-- Ensures existing invoices (including Video Order) become visible to the owning customer via RLS

BEGIN;

UPDATE invoices i
SET customer_id = p.id
FROM profiles p
WHERE i.customer_id IS NULL
  AND i.customer_email IS NOT NULL
  AND LOWER(p.email) = LOWER(i.customer_email);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

