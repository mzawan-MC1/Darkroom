/*
  # Create Lobby Games System

  1. New Tables
    - `lobby_games` - Stores lobby game information
    - `lobby_game_passes` - Stores time-based passes for lobby games

  2. Security
    - Enable RLS on both tables
    - Add policies for public viewing and admin management
*/

-- Create lobby_games table
CREATE TABLE IF NOT EXISTS lobby_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  hourly_price numeric DEFAULT 0,
  image_url text,
  is_available boolean DEFAULT true,
  max_players integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lobby_games ENABLE ROW LEVEL SECURITY;

-- Anyone can view lobby games
CREATE POLICY "Anyone can view lobby games"
  ON lobby_games FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admins can manage lobby games (temporarily permissive)
CREATE POLICY "Admins can manage lobby games"
  ON lobby_games FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create lobby_game_passes table
CREATE TABLE IF NOT EXISTS lobby_game_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_game_id uuid REFERENCES lobby_games(id),
  order_id uuid REFERENCES orders(id),
  pass_code text,
  customer_name text NOT NULL,
  hours_purchased integer NOT NULL DEFAULT 1,
  start_time timestamptz,
  end_time timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lobby_game_passes ENABLE ROW LEVEL SECURITY;

-- Staff can view all passes (temporarily permissive)
CREATE POLICY "Staff can view all lobby passes"
  ON lobby_game_passes FOR SELECT
  TO authenticated
  USING (true);

-- Staff can manage passes (temporarily permissive)
CREATE POLICY "Staff can manage lobby passes"
  ON lobby_game_passes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lobby_game_passes_lobby_game_id ON lobby_game_passes(lobby_game_id);
CREATE INDEX IF NOT EXISTS idx_lobby_game_passes_order_id ON lobby_game_passes(order_id);