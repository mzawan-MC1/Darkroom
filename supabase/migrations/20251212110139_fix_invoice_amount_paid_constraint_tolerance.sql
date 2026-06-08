/*
  # Fix Invoice Amount Paid Constraint with Floating-Point Tolerance

  1. Changes
    - Drop the strict amount_paid constraint that doesn't allow for floating-point precision
    - Create new constraint with 0.01 tolerance to handle rounding issues
    
  2. Reason
    - The strict constraint `amount_paid <= total_amount` fails when values are equal due to floating-point precision
    - Adding a small tolerance (1 cent) allows for rounding while still preventing significant overpayments
*/

-- Drop the existing strict constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_amount_paid_valid;

-- Create new constraint with tolerance for floating-point precision
ALTER TABLE invoices 
ADD CONSTRAINT invoices_amount_paid_valid 
CHECK (
  amount_paid >= 0 
  AND amount_paid <= total_amount + 0.01
);

COMMENT ON CONSTRAINT invoices_amount_paid_valid ON invoices IS 
  'Ensures amount_paid is non-negative and does not exceed total_amount (with 0.01 tolerance for rounding)';
