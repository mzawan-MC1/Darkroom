/*
  # User and Role Management System

  ## Overview
  This migration creates a flexible role-based access control system where admins
  can create custom roles with specific permissions and assign them to users.

  ## New Tables
  
  ### `roles`
  Custom roles that can be created by admins with specific permissions
  - `id` (uuid, primary key) - Unique role identifier
  - `name` (text, unique) - Role name (e.g., "Manager", "Supervisor")
  - `description` (text) - Role description
  - `permissions` (jsonb) - JSON object containing permission flags
  - `is_system_role` (boolean) - True for built-in roles (admin, customer)
  - `created_at` (timestamptz) - Creation timestamp
  - `created_by` (uuid) - User who created this role
  - `updated_at` (timestamptz) - Last update timestamp

  ### `user_roles`
  Junction table for assigning multiple roles to users
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles)
  - `role_id` (uuid, foreign key to roles)
  - `assigned_at` (timestamptz)
  - `assigned_by` (uuid) - Admin who assigned this role

  ## Changes to Existing Tables
  - Keep existing `profiles.role` for backward compatibility
  - New system uses `user_roles` for more flexible role assignment

  ## Security
  - Enable RLS on all new tables
  - Only admins can manage roles and assign them to users
  - All users can view their own assigned roles
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  permissions jsonb DEFAULT '{}',
  is_system_role boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  UNIQUE(user_id, role_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Insert default system roles
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
  ('Admin', 'Full system access with all permissions', 
   '{"manage_users": true, "manage_roles": true, "manage_games": true, "manage_bookings": true, "manage_waivers": true, "manage_merchandise": true, "manage_promotions": true, "manage_cms": true}', 
   true),
  ('Customer', 'Standard customer access', 
   '{"view_games": true, "create_bookings": true, "view_own_bookings": true, "sign_waivers": true, "purchase_merchandise": true}', 
   true),
  ('Manager', 'Operations manager with booking and game management', 
   '{"manage_games": true, "manage_bookings": true, "view_reports": true, "manage_waivers": true}', 
   false),
  ('Staff', 'Front desk staff with limited booking access', 
   '{"view_games": true, "manage_bookings": true, "view_waivers": true}', 
   false)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles table

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can create non-system roles
CREATE POLICY "Admins can create roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update non-system roles
CREATE POLICY "Admins can update non-system roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (
    NOT is_system_role AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    NOT is_system_role AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete non-system roles
CREATE POLICY "Admins can delete non-system roles"
  ON roles FOR DELETE
  TO authenticated
  USING (
    NOT is_system_role AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_roles table

-- Users can view their own role assignments
CREATE POLICY "Users can view own role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all role assignments
CREATE POLICY "Admins can view all role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can assign roles to users
CREATE POLICY "Admins can assign roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can remove role assignments
CREATE POLICY "Admins can remove role assignments"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
