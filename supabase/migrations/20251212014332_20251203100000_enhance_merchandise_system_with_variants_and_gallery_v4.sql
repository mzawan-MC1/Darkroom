/*
  # Enhanced Merchandise System with Variants, Gallery, and Size Charts

  1. New Tables
    - merchandise_variants: Store product variants (size, color, attributes)
    - merchandise_images: Store multiple product images for gallery

  2. Purpose
    - Support multiple images per product (gallery)
    - Support product variants with sizes and attributes
    - Support size charts with measurements
    - Enable POS merchandise sales
*/

-- Create merchandise_images table for product gallery
CREATE TABLE IF NOT EXISTS merchandise_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchandise_id uuid REFERENCES merchandise(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  alt_text text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create merchandise_variants table for product options
CREATE TABLE IF NOT EXISTS merchandise_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchandise_id uuid REFERENCES merchandise(id) ON DELETE CASCADE NOT NULL,
  sku text UNIQUE,
  variant_name text NOT NULL,
  size text,
  color text,
  attributes jsonb DEFAULT '{}',
  measurements jsonb DEFAULT '{}',
  price numeric(10,2),
  cost_price numeric(10,2),
  stock_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  is_available boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchandise_images_merchandise_id ON merchandise_images(merchandise_id);
CREATE INDEX IF NOT EXISTS idx_merchandise_images_display_order ON merchandise_images(merchandise_id, display_order);
CREATE INDEX IF NOT EXISTS idx_merchandise_variants_merchandise_id ON merchandise_variants(merchandise_id);
CREATE INDEX IF NOT EXISTS idx_merchandise_variants_sku ON merchandise_variants(sku);
CREATE INDEX IF NOT EXISTS idx_merchandise_variants_size ON merchandise_variants(size);

-- Update merchandise table to ensure fields exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchandise' AND column_name = 'attributes_schema'
  ) THEN
    ALTER TABLE merchandise ADD COLUMN attributes_schema jsonb DEFAULT '{}';
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE merchandise_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchandise_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchandise_images (simplified)
CREATE POLICY "Public can view merchandise images"
  ON merchandise_images FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admin can manage merchandise images"
  ON merchandise_images FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for merchandise_variants (simplified)
CREATE POLICY "Public can view merchandise variants"
  ON merchandise_variants FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admin can manage merchandise variants"
  ON merchandise_variants FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);