/*
  # Update Merchandise Table for Variants

  1. Changes
    - Add `cost_price` column for tracking cost
    - Update `variants` JSONB structure to support:
      - Size (XS, S, M, L, XL, XXL)
      - Color (name and hex code)
      - Quantity for each variant combination
    - Add `has_variants` boolean to indicate if product uses variants
    - Update `stock_quantity` to represent total stock across all variants

  2. Notes
    - Variants structure: [{ size: "M", color: "Red", color_hex: "#FF0000", quantity: 10, sku: "SHIRT-M-RED" }]
    - If `has_variants` is false, use `stock_quantity` directly
    - If `has_variants` is true, sum all variant quantities for total stock
*/

-- Add cost_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchandise' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE merchandise ADD COLUMN cost_price numeric DEFAULT 0;
  END IF;
END $$;

-- Add has_variants column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchandise' AND column_name = 'has_variants'
  ) THEN
    ALTER TABLE merchandise ADD COLUMN has_variants boolean DEFAULT false;
  END IF;
END $$;

-- Update existing records to set has_variants based on variants column
UPDATE merchandise
SET has_variants = (variants IS NOT NULL AND jsonb_array_length(variants) > 0)
WHERE has_variants IS NULL;

-- Create index on has_variants for faster queries
CREATE INDEX IF NOT EXISTS idx_merchandise_has_variants ON merchandise(has_variants) WHERE has_variants = true;