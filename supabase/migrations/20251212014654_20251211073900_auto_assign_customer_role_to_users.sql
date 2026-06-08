/*
  # Auto-assign Customer Role to All Users

  ## Overview
  This migration ensures that all users automatically receive the "Customer" role:
  - New users signing up get the Customer role automatically
  - Existing users without an active role are assigned the Customer role

  ## Changes
  1. Create trigger function to auto-assign Customer role on user creation
  2. Update existing users without active roles to have Customer role
*/

-- Create function to auto-assign Customer role to new users
CREATE OR REPLACE FUNCTION public.auto_assign_customer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_role_id uuid;
BEGIN
  -- Get the Customer role ID
  SELECT id INTO v_customer_role_id
  FROM public.roles
  WHERE name = 'Customer'
  LIMIT 1;

  -- Only proceed if Customer role exists
  IF v_customer_role_id IS NOT NULL THEN
    -- Assign Customer role to the new user
    INSERT INTO public.user_roles (user_id, role_id, is_active, assigned_at)
    VALUES (NEW.id, v_customer_role_id, true, now())
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign Customer role on profile creation
DROP TRIGGER IF EXISTS trigger_auto_assign_customer_role ON public.profiles;
CREATE TRIGGER trigger_auto_assign_customer_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_customer_role();

-- Assign Customer role to all existing users without an active role
DO $$
DECLARE
  v_customer_role_id uuid;
  v_user RECORD;
BEGIN
  -- Get the Customer role ID
  SELECT id INTO v_customer_role_id
  FROM public.roles
  WHERE name = 'Customer'
  LIMIT 1;

  -- Only proceed if Customer role exists
  IF v_customer_role_id IS NOT NULL THEN
    -- Find all users without an active role
    FOR v_user IN 
      SELECT DISTINCT p.id
      FROM public.profiles p
      LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.is_active = true
      WHERE ur.id IS NULL
    LOOP
      -- Assign Customer role to user
      INSERT INTO public.user_roles (user_id, role_id, is_active, assigned_at)
      VALUES (v_user.id, v_customer_role_id, true, now())
      ON CONFLICT (user_id, role_id) DO UPDATE
      SET is_active = true;
    END LOOP;
  END IF;
END;
$$;