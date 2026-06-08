/*
  # Security and Performance Optimization - Part 1: Indexes

  ## Overview
  This migration addresses critical security and performance issues identified by Supabase.

  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  Foreign keys without indexes can cause performance degradation:
  - `booking_add_on_selections.add_on_id`
  - `bookings.approved_by`
  - `lobby_game_passes.activated_by`
  - `promo_code_usage.booking_id`
  - `promo_code_usage.order_id`
  - `site_settings.updated_by`
  - `waiver_templates.created_by`
  - `waivers.waiver_template_id`

  ### 2. Drop Duplicate Indexes
  Multiple identical indexes waste space and slow down writes:
  - Drop redundant `_fk` suffixed indexes where base index exists
  
  ## Security
  - Improves query performance which helps prevent DoS attacks
  - Reduces database resource consumption
*/

-- Step 1: Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_booking_add_on_selections_add_on_id 
  ON booking_add_on_selections(add_on_id);

CREATE INDEX IF NOT EXISTS idx_bookings_approved_by 
  ON bookings(approved_by);

CREATE INDEX IF NOT EXISTS idx_lobby_game_passes_activated_by 
  ON lobby_game_passes(activated_by);

CREATE INDEX IF NOT EXISTS idx_promo_code_usage_booking_id 
  ON promo_code_usage(booking_id);

CREATE INDEX IF NOT EXISTS idx_promo_code_usage_order_id 
  ON promo_code_usage(order_id);

CREATE INDEX IF NOT EXISTS idx_site_settings_updated_by 
  ON site_settings(updated_by);

CREATE INDEX IF NOT EXISTS idx_waiver_templates_created_by 
  ON waiver_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_waivers_waiver_template_id 
  ON waivers(waiver_template_id);

-- Step 2: Drop duplicate indexes (keep the shorter named ones)
DROP INDEX IF EXISTS idx_booking_addon_items_booking_id_fk;
DROP INDEX IF EXISTS idx_bookings_game_id_fk;
DROP INDEX IF EXISTS idx_bookings_user_id_fk;
DROP INDEX IF EXISTS idx_game_time_slots_game_id_fk;
DROP INDEX IF EXISTS idx_merchandise_game_id_fk;
DROP INDEX IF EXISTS idx_order_items_order_id_fk;
DROP INDEX IF EXISTS idx_orders_user_id_fk;
DROP INDEX IF EXISTS idx_promo_codes_created_by_fk;
DROP INDEX IF EXISTS idx_reviews_booking_id_fk;
DROP INDEX IF EXISTS idx_reviews_game_id_fk;
DROP INDEX IF EXISTS idx_reviews_user_id_fk;
DROP INDEX IF EXISTS idx_user_roles_role_id_fk;
DROP INDEX IF EXISTS idx_waivers_booking_id_fk;
DROP INDEX IF EXISTS idx_waivers_user_id_fk;
