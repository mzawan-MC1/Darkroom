-- ==============================================================================
-- Granular Action Permissions & RLS Enforcement (Games module and related)
-- Idempotent migration: creates role_permissions, has_permission function,
-- and updates RLS policies to gate by action-level permissions
-- ==============================================================================

BEGIN;

-- 1) Role permissions mapping (optional, in addition to roles.permissions JSON)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_pk PRIMARY KEY (role_id, permission_key)
);

-- 2) Helper: has_permission(p_key)
-- Accepts keys in either 'module:action' or 'module.action' format
CREATE OR REPLACE FUNCTION public.has_permission(p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  normalized_key text;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  normalized_key := replace(lower(p_key), ':', '.');

  -- Check active role and evaluate against roles.permissions JSON or role_permissions mapping
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = uid
      AND ur.is_active = true
      AND (
        (r.permissions ? normalized_key AND COALESCE((r.permissions ->> normalized_key)::boolean, false) = true)
        OR EXISTS (
          SELECT 1 FROM public.role_permissions rp
          WHERE rp.role_id = r.id
            AND lower(rp.permission_key) = normalized_key
            AND rp.is_allowed = true
        )
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

-- 3) RLS enforcement: games and related tables use action-level permissions

-- games
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- View: public can view active games
DROP POLICY IF EXISTS "Public can view active games" ON public.games;
CREATE POLICY "Public can view active games"
ON public.games
FOR SELECT
USING (status = 'active');

-- View: staff via permission
DROP POLICY IF EXISTS "Staff can view games with permission" ON public.games;
CREATE POLICY "Staff can view games with permission"
ON public.games
FOR SELECT
TO authenticated
USING (public.has_permission('games:view'));

-- Create
DROP POLICY IF EXISTS "Create games with permission" ON public.games;
CREATE POLICY "Create games with permission"
ON public.games
FOR INSERT
TO authenticated
WITH CHECK (public.has_permission('games:create'));

-- Edit
DROP POLICY IF EXISTS "Edit games with permission" ON public.games;
CREATE POLICY "Edit games with permission"
ON public.games
FOR UPDATE
TO authenticated
USING (public.has_permission('games:edit'))
WITH CHECK (public.has_permission('games:edit'));

-- Delete
DROP POLICY IF EXISTS "Delete games with permission" ON public.games;
CREATE POLICY "Delete games with permission"
ON public.games
FOR DELETE
TO authenticated
USING (public.has_permission('games:delete'));

-- Helper macro: apply same pattern to related game tables
-- game_features
ALTER TABLE public.game_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View features with permission" ON public.game_features;
CREATE POLICY "View features with permission" ON public.game_features FOR SELECT TO authenticated USING (public.has_permission('games:view'));
DROP POLICY IF EXISTS "Insert features with permission" ON public.game_features;
CREATE POLICY "Insert features with permission" ON public.game_features FOR INSERT TO authenticated WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Update features with permission" ON public.game_features;
CREATE POLICY "Update features with permission" ON public.game_features FOR UPDATE TO authenticated USING (public.has_permission('games:edit')) WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Delete features with permission" ON public.game_features;
CREATE POLICY "Delete features with permission" ON public.game_features FOR DELETE TO authenticated USING (public.has_permission('games:delete'));

-- game_faqs
ALTER TABLE public.game_faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View faqs with permission" ON public.game_faqs;
CREATE POLICY "View faqs with permission" ON public.game_faqs FOR SELECT TO authenticated USING (public.has_permission('games:view'));
DROP POLICY IF EXISTS "Insert faqs with permission" ON public.game_faqs;
CREATE POLICY "Insert faqs with permission" ON public.game_faqs FOR INSERT TO authenticated WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Update faqs with permission" ON public.game_faqs;
CREATE POLICY "Update faqs with permission" ON public.game_faqs FOR UPDATE TO authenticated USING (public.has_permission('games:edit')) WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Delete faqs with permission" ON public.game_faqs;
CREATE POLICY "Delete faqs with permission" ON public.game_faqs FOR DELETE TO authenticated USING (public.has_permission('games:delete'));

-- game_gallery
ALTER TABLE public.game_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View gallery with permission" ON public.game_gallery;
CREATE POLICY "View gallery with permission" ON public.game_gallery FOR SELECT TO authenticated USING (public.has_permission('games:view'));
DROP POLICY IF EXISTS "Insert gallery with permission" ON public.game_gallery;
CREATE POLICY "Insert gallery with permission" ON public.game_gallery FOR INSERT TO authenticated WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Update gallery with permission" ON public.game_gallery;
CREATE POLICY "Update gallery with permission" ON public.game_gallery FOR UPDATE TO authenticated USING (public.has_permission('games:edit')) WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Delete gallery with permission" ON public.game_gallery;
CREATE POLICY "Delete gallery with permission" ON public.game_gallery FOR DELETE TO authenticated USING (public.has_permission('games:delete'));

-- game_schedules
ALTER TABLE public.game_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View schedules with permission" ON public.game_schedules;
CREATE POLICY "View schedules with permission" ON public.game_schedules FOR SELECT TO authenticated USING (public.has_permission('games:view'));
DROP POLICY IF EXISTS "Insert schedules with permission" ON public.game_schedules;
CREATE POLICY "Insert schedules with permission" ON public.game_schedules FOR INSERT TO authenticated WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Update schedules with permission" ON public.game_schedules;
CREATE POLICY "Update schedules with permission" ON public.game_schedules FOR UPDATE TO authenticated USING (public.has_permission('games:edit')) WITH CHECK (public.has_permission('games:edit'));
DROP POLICY IF EXISTS "Delete schedules with permission" ON public.game_schedules;
CREATE POLICY "Delete schedules with permission" ON public.game_schedules FOR DELETE TO authenticated USING (public.has_permission('games:delete'));

-- 4) Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;

