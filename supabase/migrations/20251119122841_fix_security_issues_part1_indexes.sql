/*
  # Fix Security Issues - Part 1: Add Missing Indexes

  1. Add Missing Indexes on Foreign Keys
    - Adds indexes to all foreign key columns for better JOIN performance
    - Critical for query optimization at scale
*/

-- blog_posts indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);

-- booking_addon_items indexes
CREATE INDEX IF NOT EXISTS idx_booking_addon_items_addon_id ON booking_addon_items(addon_id);
CREATE INDEX IF NOT EXISTS idx_booking_addon_items_booking_id_fk ON booking_addon_items(booking_id);

-- bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_game_id_fk ON bookings(game_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_fk ON bookings(user_id);

-- game_time_slots indexes
CREATE INDEX IF NOT EXISTS idx_game_time_slots_game_id_fk ON game_time_slots(game_id);

-- lobby_game_passes indexes
CREATE INDEX IF NOT EXISTS idx_lobby_game_passes_lobby_game_id ON lobby_game_passes(lobby_game_id);
CREATE INDEX IF NOT EXISTS idx_lobby_game_passes_order_id ON lobby_game_passes(order_id);

-- merchandise indexes
CREATE INDEX IF NOT EXISTS idx_merchandise_game_id_fk ON merchandise(game_id);

-- order_items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_merchandise_id ON order_items(merchandise_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_fk ON order_items(order_id);

-- orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_booking_id ON orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_fk ON orders(user_id);

-- pos_sessions indexes
CREATE INDEX IF NOT EXISTS idx_pos_sessions_staff_id ON pos_sessions(staff_id);

-- promo_codes indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_created_by_fk ON promo_codes(created_by);

-- reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id_fk ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_game_id_fk ON reviews(game_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id_fk ON reviews(user_id);

-- user_roles indexes  
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id_fk ON user_roles(role_id);

-- waivers indexes
CREATE INDEX IF NOT EXISTS idx_waivers_booking_id_fk ON waivers(booking_id);
CREATE INDEX IF NOT EXISTS idx_waivers_user_id_fk ON waivers(user_id);