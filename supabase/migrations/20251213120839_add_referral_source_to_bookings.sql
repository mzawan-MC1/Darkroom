/*
  # Add Referral Source Field to Bookings

  1. Changes
    - Add `referral_source` (text) to bookings table - Tracks where customers heard about the business
  
  2. Notes
    - This field is optional and helps track marketing effectiveness
    - Common values: "Google Search", "Social Media", "Friend/Family", "Advertisement", etc.
*/

-- Add referral_source field to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE bookings ADD COLUMN referral_source text;
  END IF;
END $$;