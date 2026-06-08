/*
  # Game Scheduling and Time Slots System

  1. New Tables
    - `game_schedules`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `day_of_week` (integer, 0=Sunday to 6=Saturday)
      - `start_time` (time)
      - `duration_minutes` (integer, game session duration)
      - `max_participants` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `booking_slots`
      - `id` (uuid, primary key)
      - `game_schedule_id` (uuid, foreign key to game_schedules)
      - `slot_date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `is_available` (boolean)
      - `max_participants` (integer)
      - `current_participants` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Update `bookings` table to link to `booking_slots`
    - Add `allow_overbooking` flag for admin overrides

  3. Security
    - Enable RLS on all new tables
    - Admin can manage schedules and slots
    - Customers can only view available slots
    - Admin can override booking restrictions

  4. Important Notes
    - Schedules define recurring weekly patterns
    - Slots are generated from schedules for specific dates
    - Bookings are linked to specific slots
    - Only available slots are shown to customers
    - Admins can create multiple bookings on same slot
*/

-- Create game_schedules table
CREATE TABLE IF NOT EXISTS game_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  max_participants integer NOT NULL DEFAULT 8,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create booking_slots table
CREATE TABLE IF NOT EXISTS booking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_schedule_id uuid NOT NULL REFERENCES game_schedules(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  max_participants integer NOT NULL DEFAULT 8,
  current_participants integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_schedule_id, slot_date, start_time)
);

-- Add new columns to bookings table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'booking_slot_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_slot_id uuid REFERENCES booking_slots(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'allow_overbooking'
  ) THEN
    ALTER TABLE bookings ADD COLUMN allow_overbooking boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_schedules_game_id ON game_schedules(game_id);
CREATE INDEX IF NOT EXISTS idx_game_schedules_day ON game_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_booking_slots_schedule_id ON booking_slots(game_schedule_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_date ON booking_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_booking_slots_available ON booking_slots(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(booking_slot_id);

-- Enable RLS
ALTER TABLE game_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;

-- Policies for game_schedules

-- Admins can do everything with schedules
CREATE POLICY "Admins can view all game schedules"
  ON game_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Admins can insert game schedules"
  ON game_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Admins can update game schedules"
  ON game_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Admins can delete game schedules"
  ON game_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

-- Policies for booking_slots

-- Admins can view all slots
CREATE POLICY "Admins can view all booking slots"
  ON booking_slots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

-- Customers can only view available slots
CREATE POLICY "Customers can view available booking slots"
  ON booking_slots FOR SELECT
  TO authenticated
  USING (
    is_available = true
    AND slot_date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

-- Admins can manage slots
CREATE POLICY "Admins can insert booking slots"
  ON booking_slots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Admins can update booking slots"
  ON booking_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Admins can delete booking slots"
  ON booking_slots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

-- Function to automatically update booking slot availability
CREATE OR REPLACE FUNCTION update_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE booking_slots
    SET 
      current_participants = (
        SELECT COUNT(DISTINCT bp.user_id)
        FROM bookings b
        JOIN booking_participants bp ON b.id = bp.booking_id
        WHERE b.booking_slot_id = NEW.booking_slot_id
        AND b.booking_status IN ('confirmed', 'pending')
      ),
      is_available = CASE
        WHEN (
          SELECT COUNT(DISTINCT bp.user_id)
          FROM bookings b
          JOIN booking_participants bp ON b.id = bp.booking_id
          WHERE b.booking_slot_id = NEW.booking_slot_id
          AND b.booking_status IN ('confirmed', 'pending')
        ) < max_participants THEN true
        ELSE false
      END
    WHERE id = NEW.booking_slot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update slot availability when bookings change
DROP TRIGGER IF EXISTS trigger_update_slot_availability ON bookings;
CREATE TRIGGER trigger_update_slot_availability
  AFTER INSERT OR UPDATE OF booking_status, booking_slot_id ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_availability();

-- Function to generate slots from schedules
CREATE OR REPLACE FUNCTION generate_slots_for_date_range(
  p_start_date date,
  p_end_date date,
  p_game_id uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  schedule_record RECORD;
  iter_date date;
  slot_end_time time;
BEGIN
  FOR schedule_record IN
    SELECT * FROM game_schedules
    WHERE is_active = true
    AND (p_game_id IS NULL OR game_id = p_game_id)
  LOOP
    iter_date := p_start_date;
    WHILE iter_date <= p_end_date LOOP
      IF EXTRACT(DOW FROM iter_date) = schedule_record.day_of_week THEN
        slot_end_time := schedule_record.start_time + (schedule_record.duration_minutes || ' minutes')::interval;
        
        INSERT INTO booking_slots (
          game_schedule_id,
          slot_date,
          start_time,
          end_time,
          max_participants,
          is_available
        )
        VALUES (
          schedule_record.id,
          iter_date,
          schedule_record.start_time,
          slot_end_time,
          schedule_record.max_participants,
          true
        )
        ON CONFLICT (game_schedule_id, slot_date, start_time) DO NOTHING;
      END IF;
      iter_date := iter_date + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;