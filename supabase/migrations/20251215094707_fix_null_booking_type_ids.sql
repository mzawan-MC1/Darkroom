/*
  # Fix Null Booking Type IDs

  1. Changes
    - Update all bookings with null booking_type_id to use the default "General Booking" type
    - This ensures all bookings display properly in the Enhanced Bookings management page
  
  2. Data Updates
    - Sets booking_type_id to the General Booking type ID for all existing bookings where it's null
*/

-- Update all bookings with null booking_type_id to use General Booking
UPDATE bookings
SET booking_type_id = '6a9e9640-9036-429f-9eec-a95dc12d8e25'
WHERE booking_type_id IS NULL;