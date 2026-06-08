/*
  # Fix User Registration RLS Issues
  
  1. Changes
    - Create a SECURITY DEFINER function to handle new user profile creation
    - This function bypasses RLS to ensure profiles and role assignments are created successfully
    - Remove dependency on manual profile insertion from frontend
  
  2. Security
    - Function runs with elevated privileges but only performs specific, safe operations
    - Validates that the user calling the function is the same as the profile being created
    - Uses proper error handling
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.create_user_profile(uuid, text, text, text);

-- Create a SECURITY DEFINER function to handle profile creation
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_role_id uuid;
  v_profile_exists boolean;
  v_result jsonb;
BEGIN
  -- Security check: ensure the caller is the user being created
  IF auth.uid() != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Can only create profile for authenticated user'
    );
  END IF;

  -- Check if profile already exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = p_user_id
  ) INTO v_profile_exists;

  IF v_profile_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Profile already exists'
    );
  END IF;

  -- Get the Customer role ID
  SELECT id INTO v_customer_role_id
  FROM public.roles
  WHERE name = 'Customer'
  LIMIT 1;

  IF v_customer_role_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Customer role not found in database'
    );
  END IF;

  -- Insert profile (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (p_user_id, p_email, p_full_name, p_phone, 'customer');

  -- Assign Customer role (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.user_roles (user_id, role_id, is_active, assigned_at)
  VALUES (p_user_id, v_customer_role_id, true, now())
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile and role created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_user_profile IS 'Creates a new user profile and assigns Customer role. Bypasses RLS for reliable user registration.';
