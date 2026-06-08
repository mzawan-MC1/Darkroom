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

  ## New Tables
  
  ### `game_mission_objectives`
  Stores mission objectives/goals for each game
  - `id` (uuid, primary key)
  - `game_id` (uuid, foreign key to games)
  - `objective` (text) - The mission objective text
  - `order_position` (integer) - Display order
  - `created_at` (timestamptz)

  ### `game_features`
  Stores feature highlights for each game
  - `id` (uuid, primary key)
  - `game_id` (uuid, foreign key to games)
  - `title` (text) - Feature title
  - `description` (text) - Feature description
  - `icon` (text) - Optional icon identifier
  - `order_position` (integer) - Display order
  - `created_at` (timestamptz)

  ### `game_faqs`
  Stores frequently asked questions for each game
  - `id` (uuid, primary key)
  - `game_id` (uuid, foreign key to games)
  - `question` (text) - FAQ question
  - `answer` (text) - FAQ answer
  - `order_position` (integer) - Display order
  - `created_at` (timestamptz)

  ### `game_gallery`
  Stores gallery images for each game
  - `id` (uuid, primary key)
  - `game_id` (uuid, foreign key to games)
  - `image_url` (text) - URL to the image in storage
  - `caption` (text) - Optional image caption
  - `order_position` (integer) - Display order
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Public read access for all game content (customers need to view)
  - Admin-only write access for content management
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

-- RLS Policies for game_mission_objectives

-- Public read access
CREATE POLICY "Anyone can view game mission objectives"
  ON public.game_mission_objectives FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin write access
CREATE POLICY "Admins can insert game mission objectives"
  ON public.game_mission_objectives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can update game mission objectives"
  ON public.game_mission_objectives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can delete game mission objectives"
  ON public.game_mission_objectives FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

-- RLS Policies for game_features

-- Public read access
CREATE POLICY "Anyone can view game features"
  ON public.game_features FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin write access
CREATE POLICY "Admins can insert game features"
  ON public.game_features FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can update game features"
  ON public.game_features FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can delete game features"
  ON public.game_features FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

-- RLS Policies for game_faqs

-- Public read access
CREATE POLICY "Anyone can view game FAQs"
  ON public.game_faqs FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin write access
CREATE POLICY "Admins can insert game FAQs"
  ON public.game_faqs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can update game FAQs"
  ON public.game_faqs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can delete game FAQs"
  ON public.game_faqs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

-- RLS Policies for game_gallery

-- Public read access
CREATE POLICY "Anyone can view game gallery images"
  ON public.game_gallery FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admin write access
CREATE POLICY "Admins can insert game gallery images"
  ON public.game_gallery FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can update game gallery images"
  ON public.game_gallery FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );

CREATE POLICY "Admins can delete game gallery images"
  ON public.game_gallery FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND LOWER(r.name) = 'admin'
    )
  );
