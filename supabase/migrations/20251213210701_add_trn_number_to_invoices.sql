/*
  # Add TRN Number to Invoices

  ## Overview
  This migration adds a Tax Registration Number (TRN) field to the invoices table.
  The TRN is required for UAE tax compliance and will be displayed on all invoices.

  ## Changes
  1. Add `trn_number` column to invoices table
  2. Set default value to '105214492800001' (company TRN)
  3. The TRN will be displayed on invoices below the invoice number

  ## Implementation Details
  - TRN is a text field with a default value
  - All existing invoices will automatically get the TRN number
  - New invoices will automatically include the TRN
*/

-- Add TRN number column to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'trn_number'
  ) THEN
    ALTER TABLE invoices 
    ADD COLUMN trn_number text DEFAULT '105214492800001';
  END IF;
END $$;