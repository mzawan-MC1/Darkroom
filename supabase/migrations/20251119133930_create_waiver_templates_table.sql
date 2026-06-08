/*
  # Create Waiver Templates Management System

  1. New Tables
    - `waiver_templates`
      - `id` (uuid, primary key)
      - `title` (text) - waiver template name
      - `content` (text) - the actual waiver content in markdown or HTML
      - `version` (text) - version number for tracking changes
      - `is_active` (boolean) - whether this template is currently in use
      - `is_required` (boolean) - whether signing this waiver is mandatory
      - `applies_to` (text[]) - what this waiver applies to (e.g., ['all_games'], ['specific_game'])
      - `game_ids` (uuid[]) - specific games this waiver applies to (if applicable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid) - admin who created it

  2. Security
    - Enable RLS on `waiver_templates` table
    - Allow all authenticated users to view active waivers
    - Only admins can create, update, or delete waivers
*/

-- Create waiver_templates table
CREATE TABLE IF NOT EXISTS waiver_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  version text DEFAULT '1.0',
  is_active boolean DEFAULT false,
  is_required boolean DEFAULT true,
  applies_to text[] DEFAULT ARRAY['all_games'],
  game_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_waiver_templates_active ON waiver_templates(is_active);

-- Enable RLS
ALTER TABLE waiver_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view active waivers
CREATE POLICY "All users can view active waiver templates"
  ON waiver_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can view all waivers (including inactive ones)
CREATE POLICY "Admins can view all waiver templates"
  ON waiver_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

-- Admins can insert waiver templates
CREATE POLICY "Admins can insert waiver templates"
  ON waiver_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

-- Admins can update waiver templates
CREATE POLICY "Admins can update waiver templates"
  ON waiver_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

-- Admins can delete waiver templates
CREATE POLICY "Admins can delete waiver templates"
  ON waiver_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Manager')
      )
    )
  );

-- Insert default waiver template
INSERT INTO waiver_templates (title, content, version, is_active, is_required, created_by) VALUES
(
  'Standard Escape Room Waiver',
  E'# Escape Room Dubai - Participant Waiver and Release of Liability\n\n## 1. Assumption of Risk\n\nI understand that escape room activities may include crawling, climbing, problem-solving under time pressure, dim lighting, confined spaces, and other physical challenges. I acknowledge that these activities carry inherent risks including but not limited to: minor injuries, bruises, psychological stress, and in rare cases, more serious injuries.\n\n## 2. Health Declaration\n\nI certify that I am in good physical and mental health and have no medical conditions that would prevent me from safely participating in escape room activities. I will inform staff immediately if I experience any discomfort, anxiety, or medical issues during the activity.\n\n## 3. Release of Liability\n\nI hereby release, waive, discharge, and covenant not to sue the Company, its owners, employees, volunteers, and agents from any and all liability, claims, demands, actions, and causes of action whatsoever arising out of or related to any loss, damage, or injury that may be sustained by me while participating in escape room activities.\n\n## 4. Rules and Guidelines\n\nI agree to follow all safety rules, instructions, and guidelines provided by the Company''s staff. I understand that failure to comply may result in immediate termination of my participation without refund. I will not use excessive force, vandalize property, or engage in any behavior that could harm myself, other participants, or Company property.\n\n## 5. Minors\n\nIf I am signing on behalf of a minor participant, I certify that I am the parent or legal guardian and have the authority to sign this waiver. I accept full responsibility for the minor''s participation and agree to all terms on their behalf.\n\n## 6. Photo and Video Release\n\nI grant permission to the Company to use photographs and videos taken during my participation for promotional purposes, including on social media, websites, and marketing materials.\n\n## 7. Acknowledgment\n\nI have read this waiver and fully understand its contents. I voluntarily agree to its terms and conditions and sign it of my own free will.',
  '1.0',
  true,
  true,
  (SELECT id FROM profiles WHERE email LIKE '%admin%' LIMIT 1)
)
ON CONFLICT DO NOTHING;