/*
  # Add Active Role Flag to User Roles

  1. Changes
    - Add is_active boolean column to user_roles table
    - Default is_active to false for new assignments
    - Add constraint to ensure only one active role per user
    - Create function to set active role
    
  2. Notes
    - Users can have multiple roles but only one can be active at a time
    - The active role is displayed in the user management interface
*/

-- Add is_active column to user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN is_active boolean DEFAULT false;
  END IF;
END $$;

-- Create unique partial index to ensure only one active role per user
DROP INDEX IF EXISTS user_roles_one_active_per_user;
CREATE UNIQUE INDEX user_roles_one_active_per_user 
ON public.user_roles (user_id) 
WHERE is_active = true;

-- Create function to set active role (deactivates other roles for the user)
CREATE OR REPLACE FUNCTION public.set_active_role(
  p_user_id uuid,
  p_role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deactivate all roles for the user
  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = p_user_id;
  
  -- Activate the specified role
  UPDATE public.user_roles
  SET is_active = true
  WHERE user_id = p_user_id AND role_id = p_role_id;
END;
$$;
