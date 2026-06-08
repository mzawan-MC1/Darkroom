/*
  # Fix Remaining Child Table RLS Policies

  1. Overview
    - Updates RLS policies for child/junction tables
    - Ensures all tables use permission-based access
    - Enables RLS on order_items table

  2. Tables Updated
    - invoice_line_items
    - order_items (enable RLS + add policies)
    - promo_code_usage
    - booking_confirmations
    - email_notifications
    - invoice_payments
    - payment_webhook_logs
    - chat_conversations
    - chat_messages

  3. Security
    - Users can view their own related data
    - Admin users with permissions can view/manage all data
*/

-- INVOICE LINE ITEMS
DROP POLICY IF EXISTS "Admin can manage invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Staff can view all invoice line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Users can view their invoice line items" ON invoice_line_items;

CREATE POLICY "Users can view own invoice line items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN bookings ON bookings.id = invoices.booking_id
      WHERE invoices.id = invoice_line_items.invoice_id
      AND bookings.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'invoices.view')
  );

CREATE POLICY "Authorized users can manage invoice line items"
  ON invoice_line_items FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'invoices.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'invoices.edit'));

-- ORDER ITEMS - Enable RLS and add policies
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Authorized users can manage order items" ON order_items;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'orders.view')
  );

CREATE POLICY "Authorized users can manage order items"
  ON order_items FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'orders.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'orders.edit'));

-- PROMO CODE USAGE
DROP POLICY IF EXISTS "Users can view own promo code usage" ON promo_code_usage;
DROP POLICY IF EXISTS "Staff can view all promo code usage" ON promo_code_usage;

CREATE POLICY "Users can view own promo code usage"
  ON promo_code_usage FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'promotions.view')
  );

CREATE POLICY "Authorized users can manage promo code usage"
  ON promo_code_usage FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'promotions.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'promotions.edit'));

-- BOOKING CONFIRMATIONS
DROP POLICY IF EXISTS "Users can view own booking confirmations" ON booking_confirmations;
DROP POLICY IF EXISTS "Staff can view all booking confirmations" ON booking_confirmations;

CREATE POLICY "Users can view own booking confirmations"
  ON booking_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_confirmations.booking_id
      AND bookings.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'bookings.view')
  );

CREATE POLICY "Authorized users can manage booking confirmations"
  ON booking_confirmations FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'bookings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'bookings.edit'));

-- EMAIL NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own email notifications" ON email_notifications;
DROP POLICY IF EXISTS "Staff can view all email notifications" ON email_notifications;

CREATE POLICY "Users can view own email notifications"
  ON email_notifications FOR SELECT
  TO authenticated
  USING (
    recipient_user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'settings.view')
  );

CREATE POLICY "Authorized users can manage email notifications"
  ON email_notifications FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'settings.edit'));

-- INVOICE PAYMENTS
DROP POLICY IF EXISTS "Users can view own invoice payments" ON invoice_payments;
DROP POLICY IF EXISTS "Staff can view all invoice payments" ON invoice_payments;

CREATE POLICY "Users can view own invoice payments"
  ON invoice_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN bookings ON bookings.id = invoices.booking_id
      WHERE invoices.id = invoice_payments.invoice_id
      AND bookings.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'invoices.view')
  );

CREATE POLICY "Authorized users can manage invoice payments"
  ON invoice_payments FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'invoices.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'invoices.edit'));

-- PAYMENT WEBHOOK LOGS
DROP POLICY IF EXISTS "Staff can view payment webhook logs" ON payment_webhook_logs;

CREATE POLICY "Authorized users can view payment webhook logs"
  ON payment_webhook_logs FOR SELECT
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.view'));

CREATE POLICY "Authorized users can manage payment webhook logs"
  ON payment_webhook_logs FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'settings.edit'));

-- CHAT CONVERSATIONS
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Staff can view all conversations" ON chat_conversations;

CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'dashboard.view')
  );

CREATE POLICY "Users can manage own conversations"
  ON chat_conversations FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'dashboard.view')
  )
  WITH CHECK (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'dashboard.view')
  );

-- CHAT MESSAGES
DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;
DROP POLICY IF EXISTS "Staff can view all messages" ON chat_messages;

CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (chat_conversations.user_id = auth.uid() OR user_has_permission(auth.uid(), 'dashboard.view'))
    )
  );

CREATE POLICY "Users can manage own chat messages"
  ON chat_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (chat_conversations.user_id = auth.uid() OR user_has_permission(auth.uid(), 'dashboard.view'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND (chat_conversations.user_id = auth.uid() OR user_has_permission(auth.uid(), 'dashboard.view'))
    )
  );
