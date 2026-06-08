-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new','in_progress','closed')),
  admin_notes text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON public.contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- RLS Policies
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Public/anon can insert only
CREATE POLICY "Public can insert contact messages"
  ON public.contact_messages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Auth users can insert and view own
CREATE POLICY "Auth users can insert and view own contact messages"
  ON public.contact_messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin/Manager can view/update all
CREATE POLICY "Admin and Manager can view/update all contact messages"
  ON public.contact_messages FOR ALL
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