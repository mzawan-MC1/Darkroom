/*
  # Create Testimonials Table

  1. New Tables
    - `testimonials`
      - `id` (uuid, primary key)
      - `customer_name` (text) - Name of the customer
      - `customer_role` (text) - Optional role/title (e.g., "Regular Player", "Birthday Party Host")
      - `customer_avatar_url` (text) - Optional URL to customer avatar image
      - `rating` (integer) - Rating out of 5
      - `testimonial_text` (text) - The testimonial content
      - `is_featured` (boolean) - Whether to show on landing page
      - `display_order` (integer) - Order of display
      - `is_active` (boolean) - Whether testimonial is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `testimonials` table
    - Add policy for public to read active testimonials
    - Add policies for admin/manager to manage testimonials
*/

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_role text,
  customer_avatar_url text,
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  testimonial_text text NOT NULL,
  is_featured boolean DEFAULT true,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read active testimonials
CREATE POLICY "Anyone can view active testimonials"
  ON testimonials
  FOR SELECT
  USING (is_active = true);

-- Admin and Manager can view all testimonials
CREATE POLICY "Admin and Manager can view all testimonials"
  ON testimonials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  );

-- Admin and Manager can insert testimonials
CREATE POLICY "Admin and Manager can insert testimonials"
  ON testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  );

-- Admin and Manager can update testimonials
CREATE POLICY "Admin and Manager can update testimonials"
  ON testimonials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name IN ('Admin', 'Manager')
      AND user_roles.is_active = true
    )
  );

-- Admin can delete testimonials
CREATE POLICY "Admin can delete testimonials"
  ON testimonials
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON user_roles.role_id = roles.id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'Admin'
      AND user_roles.is_active = true
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_testimonials_active_featured ON testimonials(is_active, is_featured, display_order);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();