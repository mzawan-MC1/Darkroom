-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID,
    performed_by TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow service role to insert audit logs
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Add is_deleted and deleted_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update Foreign Keys to ON DELETE SET NULL for critical business tables
-- This ensures that when a user is deleted (auth.users), the business records remain (with user_id becoming NULL)

-- Bookings
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE public.bookings 
    ADD CONSTRAINT bookings_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Invoices
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;
ALTER TABLE public.invoices 
    ADD CONSTRAINT invoices_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;
ALTER TABLE public.invoices 
    ADD CONSTRAINT invoices_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Waivers
ALTER TABLE public.waivers DROP CONSTRAINT IF EXISTS waivers_user_id_fkey;
ALTER TABLE public.waivers 
    ADD CONSTRAINT waivers_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders 
    ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Reviews
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.reviews 
    ADD CONSTRAINT reviews_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Video Requests
ALTER TABLE public.video_requests DROP CONSTRAINT IF EXISTS video_requests_user_id_fkey;
ALTER TABLE public.video_requests 
    ADD CONSTRAINT video_requests_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Contact Messages
ALTER TABLE public.contact_messages DROP CONSTRAINT IF EXISTS contact_messages_user_id_fkey;
ALTER TABLE public.contact_messages 
    ADD CONSTRAINT contact_messages_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Lobby Game Passes
ALTER TABLE public.lobby_game_passes DROP CONSTRAINT IF EXISTS lobby_game_passes_user_id_fkey;
ALTER TABLE public.lobby_game_passes 
    ADD CONSTRAINT lobby_game_passes_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- Promo Code Usage
ALTER TABLE public.promo_code_usage DROP CONSTRAINT IF EXISTS promo_code_usage_user_id_fkey;
ALTER TABLE public.promo_code_usage 
    ADD CONSTRAINT promo_code_usage_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- POS Transactions (Customer ID)
ALTER TABLE public.pos_transactions DROP CONSTRAINT IF EXISTS pos_transactions_customer_id_fkey;
ALTER TABLE public.pos_transactions 
    ADD CONSTRAINT pos_transactions_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
