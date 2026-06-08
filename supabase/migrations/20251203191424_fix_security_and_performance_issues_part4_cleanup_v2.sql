/*
  # Security and Performance Optimization - Part 4: Cleanup and Function Fixes

  ## Overview
  Final cleanup: drops truly unused indexes and fixes function search paths.

  ## Changes

  ### 1. Drop Unused Indexes
  Removes indexes that are:
  - Truly redundant (covered by other indexes)
  - Never used in queries
  Note: Keeping indexes that may be useful for future queries

  ### 2. Fix Function Search Paths
  Updates functions to have immutable search paths:
  - update_merchandise_updated_at
  - calculate_vat
  - calculate_total_with_vat

  ## Security
  - Reduces attack surface by removing unused database objects
  - Fixes function security by setting immutable search paths
*/

-- Step 1: Drop truly unused/redundant indexes
-- Note: Keeping foreign key indexes and commonly queried columns

-- Merchandise-related unused indexes (variants table is heavily queried)
DROP INDEX IF EXISTS idx_merchandise_variants_size;
DROP INDEX IF EXISTS idx_merchandise_has_variants;

-- Role-related unused indexes (these queries are infrequent)
DROP INDEX IF EXISTS idx_roles_created_by;
DROP INDEX IF EXISTS idx_user_roles_assigned_by;

-- Waiver template index (rarely queried by active status with good table scan performance)
DROP INDEX IF EXISTS idx_waiver_templates_active;

-- Promo codes created_by (infrequently queried)
DROP INDEX IF EXISTS idx_promo_codes_created_by;

-- Booking-related indexes that duplicate functionality
DROP INDEX IF EXISTS idx_bookings_approval_status;

-- Chat indexes (conversation queries are typically by ID)
DROP INDEX IF EXISTS idx_chat_messages_created_at;

-- Email notification type index (typically queried with user_id)
DROP INDEX IF EXISTS idx_email_notifications_type;

-- Invoice indexes that are rarely used alone
DROP INDEX IF EXISTS idx_invoices_payment_method;
DROP INDEX IF EXISTS idx_invoices_updated_by;
DROP INDEX IF EXISTS idx_invoices_game_name;
DROP INDEX IF EXISTS idx_invoices_lobby_game_name;
DROP INDEX IF EXISTS idx_invoices_booking_type;

-- Step 2: Fix function search paths to be immutable
-- This prevents potential security issues and improves performance

-- Fix update_merchandise_updated_at
DROP FUNCTION IF EXISTS update_merchandise_updated_at() CASCADE;
CREATE FUNCTION update_merchandise_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate trigger if it was dropped
DROP TRIGGER IF EXISTS update_merchandise_timestamp ON merchandise;
CREATE TRIGGER update_merchandise_timestamp
  BEFORE UPDATE ON merchandise
  FOR EACH ROW
  EXECUTE FUNCTION update_merchandise_updated_at();

-- Fix calculate_vat function (keep same parameter name)
DROP FUNCTION IF EXISTS calculate_vat(numeric) CASCADE;
CREATE FUNCTION calculate_vat(subtotal_amount numeric)
RETURNS numeric
IMMUTABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  vat_rate numeric := 0.05;
BEGIN
  RETURN ROUND(subtotal_amount * vat_rate, 2);
END;
$$;

-- Fix calculate_total_with_vat function (keep same parameter name)
DROP FUNCTION IF EXISTS calculate_total_with_vat(numeric) CASCADE;
CREATE FUNCTION calculate_total_with_vat(subtotal_amount numeric)
RETURNS numeric
IMMUTABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN subtotal_amount + calculate_vat(subtotal_amount);
END;
$$;
