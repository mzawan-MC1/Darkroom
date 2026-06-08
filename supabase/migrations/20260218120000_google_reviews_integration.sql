-- Google Reviews Integration Tables

-- 1. Google Integration Settings
CREATE TABLE IF NOT EXISTS public.google_integration_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active boolean DEFAULT true,
    place_id text NOT NULL,
    google_maps_url text,
    write_review_url text,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_integration_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read google settings"
ON public.google_integration_settings FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admin/Manager manage google settings"
ON public.google_integration_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('Admin', 'Manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.name IN ('Admin', 'Manager')
  )
);

-- 2. Google Rating Cache
CREATE TABLE IF NOT EXISTS public.google_rating_cache (
    place_id text PRIMARY KEY,
    avg_rating numeric,
    total_reviews int,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_rating_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read rating cache"
ON public.google_rating_cache FOR SELECT
TO anon, authenticated
USING (true);

-- Service role (Edge Function) bypasses RLS, but we can add an explicit policy if needed. 
-- Usually service role key is used for writing cache.

-- 3. Google Reviews Cache
CREATE TABLE IF NOT EXISTS public.google_reviews_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id text NOT NULL,
    author_name text,
    rating int,
    text text,
    relative_time text,
    time timestamptz,
    profile_photo_url text,
    google_review_url text,
    raw jsonb,
    updated_at timestamptz DEFAULT now()
);

-- Indexes and Constraints
CREATE INDEX IF NOT EXISTS idx_google_reviews_place_id ON public.google_reviews_cache(place_id);

-- Note: Using a unique index on text columns can be risky if text is huge, but requested by user.
-- We will use a unique constraint on specific fields to identify duplicates if the API returns same reviews.
-- However, "Replaces google_reviews_cache for that place_id (delete old rows for place_id then insert latest reviews)" 
-- suggests we might not need complex unique constraints if we just wipe and replace.
-- But the user asked for: "unique constraint on (place_id, author_name, text, rating, relative_time) to avoid duplicates."
-- We will add it.
ALTER TABLE public.google_reviews_cache 
ADD CONSTRAINT google_reviews_cache_unique_entry 
UNIQUE (place_id, author_name, text, rating, relative_time);

-- Enable RLS
ALTER TABLE public.google_reviews_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read reviews cache"
ON public.google_reviews_cache FOR SELECT
TO anon, authenticated
USING (true);

-- Grant permissions
GRANT SELECT ON public.google_integration_settings TO anon, authenticated;
GRANT SELECT ON public.google_rating_cache TO anon, authenticated;
GRANT SELECT ON public.google_reviews_cache TO anon, authenticated;

GRANT ALL ON public.google_integration_settings TO service_role;
GRANT ALL ON public.google_rating_cache TO service_role;
GRANT ALL ON public.google_reviews_cache TO service_role;
