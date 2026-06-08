/*
  # Fix Games Public Visibility

  1. Changes
    - Add SELECT policy to allow public (anonymous) users to view active games
    - This enables games to appear on the landing page and games page for customers
  
  2. Security
    - Policy restricts visibility to only games with 'active' status
    - Draft, inactive, and maintenance games remain hidden from public
    - Admin management policies remain unchanged
*/

-- Add policy for public to view active games
CREATE POLICY "Anyone can view active games"
  ON games
  FOR SELECT
  TO public
  USING (status = 'active');
