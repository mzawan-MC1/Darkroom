/*
  # Update Profiles RLS Policies to Use Permission-Based Access

  Updates the profiles table RLS policies to use the new permission-based system instead of hardcoded role checks.

  ## Changes
  - Drops old admin-based policies
  - Creates new permission-based policies for SELECT, UPDATE, DELETE
  - Policies check for users.view, users.edit, users.delete permissions
  - Maintains user's ability to view and update their own profile (existing policies)

  ## Security
  - Users can view their own profile (existing policy)
  - Users with users.view permission can view all profiles
  - Users can update their own profile (existing policy)
  - Users with users.edit permission can update all profiles
  - Users with users.delete permission can delete profiles
*/

-- Drop old admin-based policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Allow users with users.view permission to read all profiles
CREATE POLICY "Users with permission can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (r.permissions->>'users.view')::boolean = true
    )
  );

-- Allow users with users.edit permission to update all profiles
CREATE POLICY "Users with permission can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (r.permissions->>'users.edit')::boolean = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (r.permissions->>'users.edit')::boolean = true
    )
  );

-- Allow users with users.delete permission to delete profiles
CREATE POLICY "Users with permission can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND (r.permissions->>'users.delete')::boolean = true
    )
  );
