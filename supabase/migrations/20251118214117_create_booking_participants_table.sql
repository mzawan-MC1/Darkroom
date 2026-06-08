/*
  # Create Booking Participants Table

  1. New Tables
    - `booking_participants`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, foreign key to bookings)
      - `full_name` (text, required)
      - `phone_number` (text, optional)
      - `age` (integer, required)
      - `waiver_signed` (boolean, default false)
      - `waiver_signed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `booking_participants` table
    - Add policies for authenticated users to manage their booking participants
    - Add policies for admins to manage all participants

  3. Important Notes
    - Participants are linked to bookings
    - Each participant must sign a waiver before the booking
    - Age is stored to ensure minors have guardian consent
*/

-- Create booking_participants table
CREATE TABLE IF NOT EXISTS booking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_number text,
  age integer NOT NULL CHECK (age > 0 AND age < 150),
  waiver_signed boolean DEFAULT false,
  waiver_signed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_participants_booking_id ON booking_participants(booking_id);

-- Policy: Users can view participants for their own bookings
CREATE POLICY "Users can view own booking participants"
  ON booking_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Policy: Users can insert participants for their own bookings
CREATE POLICY "Users can insert own booking participants"
  ON booking_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Policy: Users can update participants for their own bookings
CREATE POLICY "Users can update own booking participants"
  ON booking_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Policy: Users can delete participants from their own bookings
CREATE POLICY "Users can delete own booking participants"
  ON booking_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Policy: Admins can view all participants
CREATE POLICY "Admins can view all booking participants"
  ON booking_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Policy: Admins can insert all participants
CREATE POLICY "Admins can insert all booking participants"
  ON booking_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Policy: Admins can update all participants
CREATE POLICY "Admins can update all booking participants"
  ON booking_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );

-- Policy: Admins can delete all participants
CREATE POLICY "Admins can delete all booking participants"
  ON booking_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      JOIN roles ON roles.id = user_roles.role_id
      WHERE user_roles.user_id = auth.uid()
      AND roles.name = 'admin'
      AND user_roles.is_active = true
    )
  );