/*
  # Set Currency to UAE Dirhams (AED) for All Price Fields

  1. Changes
    - Add comments to all price, cost, and amount columns
    - Document that all monetary values are in UAE Dirhams (AED)
    - Ensures consistency across the entire system

  2. Purpose
    - Provides clear documentation for all price fields
    - Standardizes currency across the booking and merchandise system
*/

-- Games table
COMMENT ON COLUMN games.base_price IS 'Base price per player in UAE Dirhams (AED)';

-- Game time slots
COMMENT ON COLUMN game_time_slots.price_override IS 'Override price in UAE Dirhams (AED) for this specific time slot';

-- Bookings table
COMMENT ON COLUMN bookings.total_amount IS 'Total booking amount in UAE Dirhams (AED) before discounts';
COMMENT ON COLUMN bookings.discount_amount IS 'Discount amount in UAE Dirhams (AED)';
COMMENT ON COLUMN bookings.final_amount IS 'Final amount to pay in UAE Dirhams (AED) after discounts';

-- Booking addons
COMMENT ON COLUMN booking_addons.price IS 'Addon price in UAE Dirhams (AED)';

-- Booking addon items
COMMENT ON COLUMN booking_addon_items.price IS 'Price paid for this addon in UAE Dirhams (AED)';

-- Merchandise table
COMMENT ON COLUMN merchandise.base_price IS 'Retail price in UAE Dirhams (AED)';
COMMENT ON COLUMN merchandise.cost_price IS 'Cost price in UAE Dirhams (AED) for inventory tracking';

-- Orders table
COMMENT ON COLUMN orders.total_amount IS 'Total order amount in UAE Dirhams (AED) before discounts';
COMMENT ON COLUMN orders.discount_amount IS 'Discount amount in UAE Dirhams (AED)';
COMMENT ON COLUMN orders.final_amount IS 'Final amount paid in UAE Dirhams (AED) after discounts';

-- Order items
COMMENT ON COLUMN order_items.unit_price IS 'Unit price in UAE Dirhams (AED)';
COMMENT ON COLUMN order_items.total_price IS 'Total price for this line item in UAE Dirhams (AED)';

-- Promo codes
COMMENT ON COLUMN promo_codes.min_purchase_amount IS 'Minimum purchase amount in UAE Dirhams (AED) to use this promo code';
COMMENT ON COLUMN promo_codes.max_discount_amount IS 'Maximum discount amount in UAE Dirhams (AED) for this promo code';

-- Lobby games
COMMENT ON COLUMN lobby_games.hourly_price IS 'Hourly rental price in UAE Dirhams (AED)';