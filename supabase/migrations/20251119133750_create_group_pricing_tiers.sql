/*
  # Create Group Pricing Tiers System

  1. New Tables
    - `pricing_tiers`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games) - optional, null means applies to all games
      - `min_participants` (integer) - minimum number of people for this tier
      - `max_participants` (integer) - maximum number of people for this tier
      - `discount_percentage` (decimal) - discount percentage (0-100)
      - `is_active` (boolean) - whether this tier is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `pricing_tiers` table
    - Add policies for public read access (customers need to see pricing)
    - Add policies for admin write access

  3. Indexes
    - Index on game_id for faster lookups
    - Index on min_participants and max_participants for range queries
*/

-- Create pricing_tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  min_participants integer NOT NULL CHECK (min_participants > 0),
  max_participants integer NOT NULL CHECK (max_participants >= min_participants),
  discount_percentage decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_game_id ON pricing_tiers(game_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_participants ON pricing_tiers(min_participants, max_participants);

-- Enable RLS
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active pricing tiers
CREATE POLICY "Anyone can view active pricing tiers"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage pricing tiers
CREATE POLICY "Admins can insert pricing tiers"
  ON pricing_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Admins can update pricing tiers"
  ON pricing_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Admins can delete pricing tiers"
  ON pricing_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

-- Insert default pricing tiers (example: discount increases with group size)
INSERT INTO pricing_tiers (min_participants, max_participants, discount_percentage, is_active) VALUES
(1, 2, 0, true),      -- 1-2 people: no discount
(3, 4, 10, true),     -- 3-4 people: 10% discount
(5, 6, 15, true),     -- 5-6 people: 15% discount
(7, 8, 20, true)      -- 7-8 people: 20% discount
ON CONFLICT DO NOTHING;