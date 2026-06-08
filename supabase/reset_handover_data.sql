-- ==============================================================================
-- RESET HANDOVER DATA (TRANSACTIONAL DATA WIPE)
-- ==============================================================================
-- 
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard -> SQL Editor
-- 2. Create a new query
-- 3. Paste this entire file content
-- 4. Run the query
--
-- SAFETY:
-- - This script deletes ONLY transactional data (bookings, payments, waivers, etc.)
-- - It PRESERVES configuration (games, rooms, users, roles, settings, etc.)
-- - It uses a transaction to ensure all-or-nothing execution
--
-- ==============================================================================

BEGIN;

-- 1. DELETE PAYMENT RELATED DATA (Leaves payment_settings intact)
DELETE FROM invoice_payments;
DELETE FROM payment_webhook_logs;
DELETE FROM payments;

-- 2. DELETE INVOICE RELATED DATA
DELETE FROM invoice_line_items;
DELETE FROM invoices;

-- 3. DELETE BOOKING RELATED CHILD TABLES
DELETE FROM booking_participants;
DELETE FROM booking_confirmations;
DELETE FROM booking_add_on_selections;
DELETE FROM booking_achievements;
DELETE FROM waivers;
DELETE FROM promo_code_usage;

-- 4. DELETE LOBBY PASSES (Before orders/bookings)
DELETE FROM lobby_game_passes;

-- 5. DELETE ORDERS (If used)
DELETE FROM order_items; -- Assuming this exists if orders exists
DELETE FROM orders;

-- 6. DELETE BOOKINGS (Root of transaction data)
DELETE FROM bookings;

-- 7. DELETE POS SESSIONS (Transactional)
DELETE FROM pos_sessions;

-- 8. DELETE CHAT/COMMUNICATIONS (Transactional)
DELETE FROM chat_messages;
DELETE FROM chat_conversations;
DELETE FROM email_logs;
DELETE FROM email_notifications;
DELETE FROM reviews; -- User feedback is transactional

-- 9. RESET AUTO-INCREMENTS / COUNTERS (If applicable)
-- Reset booking slots availability (if they persist)
UPDATE booking_slots 
SET current_participants = 0, is_available = true 
WHERE current_participants > 0;

-- 10. VERIFICATION QUERIES (Will show 0 for wiped tables)
SELECT 'invoice_payments' as table_name, count(*) as count FROM invoice_payments
UNION ALL
SELECT 'payment_webhook_logs', count(*) FROM payment_webhook_logs
UNION ALL
SELECT 'payments', count(*) FROM payments
UNION ALL
SELECT 'invoice_line_items', count(*) FROM invoice_line_items
UNION ALL
SELECT 'invoices', count(*) FROM invoices
UNION ALL
SELECT 'booking_participants', count(*) FROM booking_participants
UNION ALL
SELECT 'booking_confirmations', count(*) FROM booking_confirmations
UNION ALL
SELECT 'booking_add_on_selections', count(*) FROM booking_add_on_selections
UNION ALL
SELECT 'booking_achievements', count(*) FROM booking_achievements
UNION ALL
SELECT 'waivers', count(*) FROM waivers
UNION ALL
SELECT 'promo_code_usage', count(*) FROM promo_code_usage
UNION ALL
SELECT 'lobby_game_passes', count(*) FROM lobby_game_passes
UNION ALL
SELECT 'orders', count(*) FROM orders
UNION ALL
SELECT 'bookings', count(*) FROM bookings
UNION ALL
SELECT 'pos_sessions', count(*) FROM pos_sessions
UNION ALL
SELECT 'chat_conversations', count(*) FROM chat_conversations
UNION ALL
SELECT 'email_logs', count(*) FROM email_logs
UNION ALL
SELECT 'reviews', count(*) FROM reviews;

-- 11. VERIFICATION OF PROTECTED TABLES (Should NOT be 0)
SELECT 'games' as protected_table, count(*) as count FROM games
UNION ALL
SELECT 'profiles', count(*) FROM profiles
UNION ALL
SELECT 'site_settings', count(*) FROM site_settings
UNION ALL
SELECT 'merchandise', count(*) FROM merchandise;

COMMIT;
