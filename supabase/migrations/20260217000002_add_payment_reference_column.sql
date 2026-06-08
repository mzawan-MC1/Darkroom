
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_payment_reference 
ON payments(payment_reference);
