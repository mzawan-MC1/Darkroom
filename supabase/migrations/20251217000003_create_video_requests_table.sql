-- Create video_requests table
CREATE TABLE IF NOT EXISTS public.video_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','cancelled')),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  game_name text NOT NULL,
  played_date date,
  played_time text,
  video_type text NOT NULL CHECK (video_type IN ('short','long')),
  price numeric NOT NULL,
  delivery_method text DEFAULT 'email' CHECK (delivery_method IN ('email','whatsapp')),
  notes text,
  admin_notes text,
  delivered_link text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_requests_user_id ON public.video_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_video_requests_booking_id ON public.video_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_video_requests_status ON public.video_requests(status);
CREATE INDEX IF NOT EXISTS idx_video_requests_created_at ON public.video_requests(created_at DESC);

-- RLS Policies
ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

-- Guests (anon) can insert only
CREATE POLICY "Guests can insert video requests"
  ON public.video_requests FOR INSERT
  TO anon
  WITH CHECK (true);

-- Auth users can insert and view own
CREATE POLICY "Auth users can insert and view own video requests"
  ON public.video_requests FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin/Manager can view/update all
CREATE POLICY "Admin and Manager can view/update all video requests"
  ON public.video_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Admin','Manager')
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('Admin','Manager')
      AND ur.is_active = true
    )
  );