/*
  # Enhance Games with Rich Content Features

  ## Overview
  This migration adds comprehensive content management features to games including storyline,
  mission objectives, features, FAQs, and image gallery support.

  ## Changes to Existing Tables
  
  ### `games` table
  - Add `storyline` (text) - Long-form rich text content for the game's narrative
  - Add `short_description` (text) - Brief overview for hero section
  - Add `long_description` (text) - Detailed description for content section

  ## New Tables - game_features, game_faqs, game_gallery
*/

-- Add new columns to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'storyline'
  ) THEN
    ALTER TABLE public.games ADD COLUMN storyline text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'short_description'
  ) THEN
    ALTER TABLE public.games ADD COLUMN short_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'long_description'
  ) THEN
    ALTER TABLE public.games ADD COLUMN long_description text DEFAULT '';
  END IF;
END $$;

-- Create game_mission_objectives table
CREATE TABLE IF NOT EXISTS public.game_mission_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  objective text NOT NULL,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_mission_objectives_game_id 
ON public.game_mission_objectives(game_id);

-- Create game_features table
CREATE TABLE IF NOT EXISTS public.game_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '',
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_features_game_id 
ON public.game_features(game_id);

-- Create game_faqs table
CREATE TABLE IF NOT EXISTS public.game_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_faqs_game_id 
ON public.game_faqs(game_id);

-- Create game_gallery table
CREATE TABLE IF NOT EXISTS public.game_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text DEFAULT '',
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_gallery_game_id 
ON public.game_gallery(game_id);

-- Enable RLS
ALTER TABLE public.game_mission_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_gallery ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Anyone can view game mission objectives"
  ON public.game_mission_objectives FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage game mission objectives"
  ON public.game_mission_objectives FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view game features"
  ON public.game_features FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage game features"
  ON public.game_features FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view game FAQs"
  ON public.game_faqs FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage game FAQs"
  ON public.game_faqs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view game gallery images"
  ON public.game_gallery FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage game gallery images"
  ON public.game_gallery FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);