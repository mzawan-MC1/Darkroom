/*
  # Fix Security Issues - Part 3: Fix Function Search Paths

  1. Fix Function Search Paths
    - Sets explicit search_path for all security-sensitive functions
    - Prevents potential security vulnerabilities from search_path manipulation
    - Uses SECURITY DEFINER with safe search_path
*/

-- Fix update_slot_availability function
CREATE OR REPLACE FUNCTION update_slot_availability()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE booking_slots
    SET 
      current_participants = (
        SELECT COUNT(DISTINCT bp.user_id)
        FROM bookings b
        LEFT JOIN booking_participants bp ON b.id = bp.booking_id
        WHERE b.booking_slot_id = NEW.booking_slot_id
        AND b.booking_status IN ('confirmed', 'pending')
      ),
      is_available = CASE
        WHEN (
          SELECT COUNT(DISTINCT bp.user_id)
          FROM bookings b
          LEFT JOIN booking_participants bp ON b.id = bp.booking_id
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

-- Fix generate_slots_for_date_range function
CREATE OR REPLACE FUNCTION generate_slots_for_date_range(
  p_start_date date,
  p_end_date date,
  p_game_id uuid DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

-- Fix set_active_role function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'set_active_role'
    AND n.nspname = 'public'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION set_active_role(p_role_id uuid)
      RETURNS void
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $func$
      BEGIN
        UPDATE user_roles
        SET active_role = false
        WHERE user_id = auth.uid();
        
        UPDATE user_roles
        SET active_role = true
        WHERE user_id = auth.uid() AND role_id = p_role_id;
      END;
      $func$ LANGUAGE plpgsql;
    ';
  END IF;
END $$;