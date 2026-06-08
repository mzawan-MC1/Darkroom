-- ==============================================================================
-- Enforce action-level permissions using roles.permissions (jsonb)
-- Modules: games + game_features + game_faqs + game_gallery + game_schedules
-- Idempotent: drops and recreates policies to require specific action keys
-- ==============================================================================

BEGIN;

-- Helper condition snippets (inline in policies):
-- EXISTS (
--   SELECT 1
--   FROM public.user_roles ur
--   JOIN public.roles r ON r.id = ur.role_id
--   WHERE ur.user_id = auth.uid()
--     AND ur.is_active = true
--     AND COALESCE((r.permissions ->> 'games.<action>')::boolean, false) = true
-- )

-- ===== games =====
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Public view of active games (unchanged)
DROP POLICY IF EXISTS games_select_public_active ON public.games;
CREATE POLICY games_select_public_active
ON public.games
FOR SELECT
USING (status = 'active');

-- Authenticated view must have games.view
DROP POLICY IF EXISTS games_select_authenticated_view ON public.games;
CREATE POLICY games_select_authenticated_view
ON public.games
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND COALESCE((r.permissions ->> 'games.view')::boolean, false) = true
  )
);

-- INSERT requires games.create
DROP POLICY IF EXISTS games_insert_requires_create ON public.games;
CREATE POLICY games_insert_requires_create
ON public.games
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND COALESCE((r.permissions ->> 'games.create')::boolean, false) = true
  )
);

-- UPDATE requires games.edit
DROP POLICY IF EXISTS games_update_requires_edit ON public.games;
CREATE POLICY games_update_requires_edit
ON public.games
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

-- DELETE requires games.delete (no implicit delete via edit)
DROP POLICY IF EXISTS games_delete_requires_delete ON public.games;
CREATE POLICY games_delete_requires_delete
ON public.games
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND COALESCE((r.permissions ->> 'games.delete')::boolean, false) = true
  )
);

-- ===== game_features =====
ALTER TABLE public.game_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_features_select_view ON public.game_features;
CREATE POLICY game_features_select_view ON public.game_features FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.view')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_features_insert_edit ON public.game_features;
CREATE POLICY game_features_insert_edit ON public.game_features FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_features_update_edit ON public.game_features;
CREATE POLICY game_features_update_edit ON public.game_features FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_features_delete_delete ON public.game_features;
CREATE POLICY game_features_delete_delete ON public.game_features FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.delete')::boolean, false) = true
  )
);

-- ===== game_faqs =====
ALTER TABLE public.game_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_faqs_select_view ON public.game_faqs;
CREATE POLICY game_faqs_select_view ON public.game_faqs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.view')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_faqs_insert_edit ON public.game_faqs;
CREATE POLICY game_faqs_insert_edit ON public.game_faqs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_faqs_update_edit ON public.game_faqs;
CREATE POLICY game_faqs_update_edit ON public.game_faqs FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_faqs_delete_delete ON public.game_faqs;
CREATE POLICY game_faqs_delete_delete ON public.game_faqs FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.delete')::boolean, false) = true
  )
);

-- ===== game_gallery =====
ALTER TABLE public.game_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_gallery_select_view ON public.game_gallery;
CREATE POLICY game_gallery_select_view ON public.game_gallery FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.view')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_gallery_insert_edit ON public.game_gallery;
CREATE POLICY game_gallery_insert_edit ON public.game_gallery FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_gallery_update_edit ON public.game_gallery;
CREATE POLICY game_gallery_update_edit ON public.game_gallery FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_gallery_delete_delete ON public.game_gallery;
CREATE POLICY game_gallery_delete_delete ON public.game_gallery FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.delete')::boolean, false) = true
  )
);

-- ===== game_schedules =====
ALTER TABLE public.game_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_schedules_select_view ON public.game_schedules;
CREATE POLICY game_schedules_select_view ON public.game_schedules FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.view')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_schedules_insert_edit ON public.game_schedules;
CREATE POLICY game_schedules_insert_edit ON public.game_schedules FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_schedules_update_edit ON public.game_schedules;
CREATE POLICY game_schedules_update_edit ON public.game_schedules FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.edit')::boolean, false) = true
  )
);

DROP POLICY IF EXISTS game_schedules_delete_delete ON public.game_schedules;
CREATE POLICY game_schedules_delete_delete ON public.game_schedules FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND ur.is_active = true AND COALESCE((r.permissions ->> 'games.delete')::boolean, false) = true
  )
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

