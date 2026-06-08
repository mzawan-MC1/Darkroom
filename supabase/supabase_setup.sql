-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES SETUP (Idempotent)
-- ==========================================

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'game_master', 'customer_service', 'customer')),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- GAMES
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  storyline TEXT,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  duration_minutes INTEGER,
  min_players INTEGER,
  max_players INTEGER,
  base_price DECIMAL(10,2),
  room_number TEXT,
  image_url TEXT,
  gallery_urls TEXT[],
  status TEXT DEFAULT 'active',
  features JSONB DEFAULT '[]'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  tagline TEXT,
  mission_objectives JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- LOBBY GAMES
CREATE TABLE IF NOT EXISTS lobby_games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hourly_price DECIMAL(10,2),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  max_players INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lobby_games ENABLE ROW LEVEL SECURITY;

-- MERCHANDISE
CREATE TABLE IF NOT EXISTS merchandise (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  game_id UUID REFERENCES games(id),
  base_price DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  sku TEXT,
  image_url TEXT,
  gallery_urls TEXT[],
  variants JSONB DEFAULT '[]'::jsonb,
  is_available BOOLEAN DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  cost_price DECIMAL(10,2),
  has_variants BOOLEAN DEFAULT false,
  attributes_schema JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE merchandise ENABLE ROW LEVEL SECURITY;

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- PAGE SEO
CREATE TABLE IF NOT EXISTS page_seo (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_identifier TEXT UNIQUE NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT,
  canonical_url TEXT,
  robots TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER,
  change_frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE page_seo ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. RLS POLICIES (Fixing Visibility)
-- ==========================================

-- PROFILES: Users can read own, Admin can read all
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- GAMES: Public read
DROP POLICY IF EXISTS "Public can view active games" ON games;
CREATE POLICY "Public can view active games" ON games FOR SELECT USING (true);

-- LOBBY GAMES: Public read
DROP POLICY IF EXISTS "Public can view lobby games" ON lobby_games;
CREATE POLICY "Public can view lobby games" ON lobby_games FOR SELECT USING (true);

-- MERCHANDISE: Public read
DROP POLICY IF EXISTS "Public can view merchandise" ON merchandise;
CREATE POLICY "Public can view merchandise" ON merchandise FOR SELECT USING (true);

-- SITE SETTINGS: Public read
DROP POLICY IF EXISTS "Public can view site settings" ON site_settings;
CREATE POLICY "Public can view site settings" ON site_settings FOR SELECT USING (true);

-- PAGE SEO: Public read
DROP POLICY IF EXISTS "Public can view page seo" ON page_seo;
CREATE POLICY "Public can view page seo" ON page_seo FOR SELECT USING (true);

-- ==========================================
-- 3. STORAGE SETUP
-- ==========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'images' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'images' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ==========================================
-- 4. DEFAULT DATA (If Empty)
-- ==========================================

-- Site Settings Defaults
INSERT INTO site_settings (setting_key, setting_value)
VALUES 
  ('company_name', '"LockOut Recreational Playground"'),
  ('address', '"Dubai, UAE"'),
  ('phone_number', '"+971 50 123 4567"'),
  ('primary_email', '"info@thelockout.ae"'),
  ('footer_company_intro', '"Experience the ultimate escape room adventure."'),
  ('footer_copyright_text', '"LockOut Recreational Playground. All rights reserved."')
ON CONFLICT (setting_key) DO NOTHING;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
