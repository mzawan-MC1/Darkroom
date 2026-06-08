/*
  # Cleanup Remaining Old RLS Policies

  1. Overview
    - Removes all remaining policies that check profiles.role
    - These are duplicate/old policies that weren't properly dropped

  2. Tables Cleaned
    - booking_add_on_selections
    - booking_add_ons
    - booking_confirmations
    - chat_conversations
    - chat_messages
    - invoice_payments
    - merchandise
    - order_items
    - promo_codes
    - reviews
    - roles
    - static_pages

  3. Result
    - All tables now use only permission-based policies
    - No references to old profiles.role enum
*/

-- BOOKING ADD ON SELECTIONS
DROP POLICY IF EXISTS "Admin can manage all booking add-ons" ON booking_add_on_selections;
DROP POLICY IF EXISTS "Staff can view all booking add-ons" ON booking_add_on_selections;

-- BOOKING ADD ONS
DROP POLICY IF EXISTS "Admin can manage add-ons" ON booking_add_ons;

-- BOOKING CONFIRMATIONS
DROP POLICY IF EXISTS "Staff can create confirmations" ON booking_confirmations;
DROP POLICY IF EXISTS "Staff can view all confirmations" ON booking_confirmations;

-- CHAT CONVERSATIONS
DROP POLICY IF EXISTS "Admins can view all conversations" ON chat_conversations;

-- CHAT MESSAGES
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;

-- INVOICE PAYMENTS
DROP POLICY IF EXISTS "Staff can create invoice payments" ON invoice_payments;

-- MERCHANDISE
DROP POLICY IF EXISTS "Admins can manage merchandise" ON merchandise;

-- ORDER ITEMS
DROP POLICY IF EXISTS "Staff can read all order items" ON order_items;

-- PROMO CODES
DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;

-- REVIEWS
DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;

-- ROLES
DROP POLICY IF EXISTS "Admins can delete roles" ON roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON roles;
DROP POLICY IF EXISTS "Admins can update roles" ON roles;

-- STATIC PAGES
DROP POLICY IF EXISTS "Admins can manage static pages" ON static_pages;
