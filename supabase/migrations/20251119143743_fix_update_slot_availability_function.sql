/*
  # Fix update_slot_availability Function

  1. Changes
    - Fix the function to correctly count participants
    - Use bp.id instead of bp.user_id (which doesn't exist)
    - Count total participants across all bookings for a slot

  2. Purpose
    - Eliminates "column bp.user_id does not exist" error
    - Correctly tracks slot availability based on participant count
*/

-- Fix update_slot_availability function
CREATE OR REPLACE FUNCTION update_slot_availability()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE booking_slots
    SET 
      current_participants = (
        SELECT COALESCE(SUM(b.number_of_players), 0)
        FROM bookings b
        WHERE b.booking_slot_id = NEW.booking_slot_id
        AND b.booking_status IN ('confirmed', 'pending')
      ),
      is_available = CASE
        WHEN (
          SELECT COALESCE(SUM(b.number_of_players), 0)
          FROM bookings b
          WHERE b.booking_slot_id = NEW.booking_slot_id
          AND b.booking_status IN ('confirmed', 'pending')
        ) < max_participants THEN true
        ELSE false
      END
    WHERE id = NEW.booking_slot_id;
  END IF;
  RETURN NEW;
END;
$$;