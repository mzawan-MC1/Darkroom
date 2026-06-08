
-- Add cancelled_by column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by ON bookings(cancelled_by);
