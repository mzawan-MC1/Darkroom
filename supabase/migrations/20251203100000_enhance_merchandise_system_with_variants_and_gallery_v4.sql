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

-- RLS Policies for merchandise_images
CREATE POLICY "Public can view merchandise images"
  ON merchandise_images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin can insert merchandise images"
  ON merchandise_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admin can update merchandise images"
  ON merchandise_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admin can delete merchandise images"
  ON merchandise_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- RLS Policies for merchandise_variants
CREATE POLICY "Public can view merchandise variants"
  ON merchandise_variants FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admin can insert merchandise variants"
  ON merchandise_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admin can update merchandise variants"
  ON merchandise_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admin can delete merchandise variants"
  ON merchandise_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- Function to update merchandise updated_at timestamp
CREATE OR REPLACE FUNCTION update_merchandise_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for merchandise_variants
DROP TRIGGER IF EXISTS update_merchandise_variants_updated_at ON merchandise_variants;
CREATE TRIGGER update_merchandise_variants_updated_at
  BEFORE UPDATE ON merchandise_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_merchandise_updated_at();

-- Comments
COMMENT ON TABLE merchandise_images IS 'Product images for merchandise gallery display';
COMMENT ON TABLE merchandise_variants IS 'Product variants with sizes, colors, and attributes';
COMMENT ON COLUMN merchandise.product_type IS 'Type of product: shirt, pants, cap, bottle, etc.';
COMMENT ON COLUMN merchandise.size_chart IS 'Size chart with measurements for the product';
COMMENT ON COLUMN merchandise.attributes_schema IS 'Schema defining available attributes for variants';
COMMENT ON COLUMN merchandise_variants.attributes IS 'Variant-specific attributes (material, fit, etc.)';
COMMENT ON COLUMN merchandise_variants.measurements IS 'Variant measurements (width, height, length, etc.)';
