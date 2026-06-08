-- Ensure Manager role can view and manage waiver PDFs
-- 1) Update storage.objects policies for waivers bucket to include Manager
-- 2) Grant waivers.view/create/edit permissions to Manager role

DO $$
BEGIN
  -- -------------------------------------------------------------------
  -- SELECT Policy
  -- -------------------------------------------------------------------
  
  -- Drop OLD policy name if it exists
  DROP POLICY IF EXISTS "Users can view own waiver PDFs or admins view all" ON storage.objects;
  
  -- Drop NEW policy name if it exists (for idempotency)
  DROP POLICY IF EXISTS "Users can view own waiver PDFs or admins/managers view all" ON storage.objects;

  -- Create the NEW policy
  CREATE POLICY "Users can view own waiver PDFs or admins/managers view all"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'waivers' AND
      (
        EXISTS (
          SELECT 1 FROM waivers
          WHERE waivers.signed_pdf_url = storage.objects.name
          AND waivers.user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = auth.uid()
          AND r.name IN ('Admin', 'Manager')
          AND ur.is_active = true
        )
      )
    );

  -- -------------------------------------------------------------------
  -- DELETE Policy
  -- -------------------------------------------------------------------

  -- Drop OLD policy name if it exists
  DROP POLICY IF EXISTS "Admin and Staff can delete waiver PDFs" ON storage.objects;
  
  -- Drop NEW policy name if it exists (for idempotency)
  DROP POLICY IF EXISTS "Admin and Manager can delete waiver PDFs" ON storage.objects;

  -- Create the NEW policy
  CREATE POLICY "Admin and Manager can delete waiver PDFs"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'waivers' AND
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('Admin', 'Manager')
        AND ur.is_active = true
      )
    );

  -- -------------------------------------------------------------------
  -- Role Permissions
  -- -------------------------------------------------------------------

  -- Grant waivers permissions to Manager role in roles.permissions JSON
  UPDATE roles
  SET permissions = COALESCE(permissions, '{}'::jsonb)
    || jsonb_build_object(
      'waivers.view', true,
      'waivers.create', true,
      'waivers.edit', true
    )
  WHERE name = 'Manager';
END $$;
