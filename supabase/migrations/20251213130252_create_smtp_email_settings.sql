/*
  # Create SMTP Email Settings System

  ## Overview
  This migration creates the infrastructure for managing SMTP email settings
  that will be used to send transactional emails from the system.

  ## New Tables
  
  ### `smtp_settings`
  Stores SMTP configuration for sending emails (Google SMTP by default).
  - `id` (uuid, primary key) - Unique identifier
  - `smtp_host` (text) - SMTP server host (e.g., smtp.gmail.com)
  - `smtp_port` (integer) - SMTP port (587 for TLS, 465 for SSL)
  - `smtp_username` (text) - SMTP username/email
  - `smtp_password` (text) - SMTP password/app password (encrypted)
  - `from_email` (text) - Email address to send from
  - `from_name` (text) - Display name for sender
  - `use_tls` (boolean) - Whether to use TLS (default true)
  - `is_active` (boolean) - Whether this configuration is active
  - `created_at` (timestamptz) - When the record was created
  - `updated_at` (timestamptz) - When the record was last updated

  ### `email_templates`
  Stores email templates for various transactional emails.
  - `id` (uuid, primary key) - Unique identifier
  - `template_key` (text, unique) - Template identifier (e.g., 'booking_confirmation')
  - `subject` (text) - Email subject line
  - `html_body` (text) - HTML email content
  - `text_body` (text) - Plain text fallback
  - `variables` (jsonb) - Available template variables
  - `is_active` (boolean) - Whether template is active
  - `created_at` (timestamptz) - When created
  - `updated_at` (timestamptz) - When last updated

  ### `email_logs`
  Logs all sent emails for debugging and tracking.
  - `id` (uuid, primary key) - Unique identifier
  - `to_email` (text) - Recipient email
  - `from_email` (text) - Sender email
  - `subject` (text) - Email subject
  - `template_key` (text) - Template used (if any)
  - `status` (text) - Status: 'sent', 'failed', 'pending'
  - `error_message` (text) - Error details if failed
  - `sent_at` (timestamptz) - When email was sent
  - `created_at` (timestamptz) - When record was created

  ## Security
  - Enable RLS on all tables
  - Only admins can read/write SMTP settings
  - Only admins can read/write email templates
  - Only admins can read email logs

  ## Notes
  - SMTP password should be encrypted at application level before storage
  - Email templates support variable substitution
  - Email logs help track delivery and debug issues
*/

-- Create smtp_settings table
CREATE TABLE IF NOT EXISTS smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text NOT NULL,
  smtp_password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT 'Escape Room',
  use_tls boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text NOT NULL,
  template_key text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_smtp_settings_active ON smtp_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);

-- Enable RLS
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- SMTP Settings Policies (Admin only)
CREATE POLICY "Admins can view SMTP settings"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can insert SMTP settings"
  ON smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can update SMTP settings"
  ON smtp_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- Email Templates Policies (Admin only)
CREATE POLICY "Admins can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can insert email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can update email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can delete email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- Email Logs Policies (Admin read-only)
CREATE POLICY "Admins can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- Insert default email templates
INSERT INTO email_templates (template_key, subject, html_body, text_body, variables) VALUES
(
  'user_signup',
  'Welcome to {{site_name}}!',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{site_name}}!</h1>
    </div>
    <div class="content">
      <p>Hi {{user_name}},</p>
      <p>Thank you for signing up! Your account has been successfully created.</p>
      <p>You can now book amazing escape room experiences and manage your bookings online.</p>
      <a href="{{login_url}}" class="button">Login to Your Account</a>
      <p>If you have any questions, feel free to contact us.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Welcome to {{site_name}}!

Hi {{user_name}},

Thank you for signing up! Your account has been successfully created.

You can now book amazing escape room experiences and manage your bookings online.

Login: {{login_url}}

If you have any questions, feel free to contact us.',
  '["site_name", "user_name", "login_url", "year"]'::jsonb
),
(
  'booking_confirmation',
  'Booking Confirmation - {{game_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .booking-details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Your booking has been confirmed. We''re excited to see you!</p>
      
      <div class="booking-details">
        <h2 style="margin-top: 0;">Booking Details</h2>
        <div class="detail-row">
          <span class="detail-label">Booking Number:</span>
          <span>{{booking_number}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Game:</span>
          <span>{{game_name}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span>{{booking_date}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span>{{booking_time}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Players:</span>
          <span>{{player_count}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Amount:</span>
          <span>{{total_amount}}</span>
        </div>
      </div>

      <p><strong>What to bring:</strong></p>
      <ul>
        <li>Your booking confirmation (this email)</li>
        <li>Valid ID for verification</li>
        <li>Arrive 15 minutes early</li>
      </ul>

      <a href="{{booking_url}}" class="button">View Booking</a>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Booking Confirmed!

Hi {{customer_name}},

Your booking has been confirmed. We''re excited to see you!

Booking Details:
- Booking Number: {{booking_number}}
- Game: {{game_name}}
- Date: {{booking_date}}
- Time: {{booking_time}}
- Players: {{player_count}}
- Total Amount: {{total_amount}}

What to bring:
- Your booking confirmation
- Valid ID for verification
- Arrive 15 minutes early

View your booking: {{booking_url}}',
  '["site_name", "customer_name", "booking_number", "game_name", "booking_date", "booking_time", "player_count", "total_amount", "booking_url", "year"]'::jsonb
),
(
  'booking_status_changed',
  'Booking Status Update - {{booking_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; }
    .status-confirmed { background: #dcfce7; color: #166534; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Status Update</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Your booking status has been updated:</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <span class="status-badge status-{{new_status}}">{{new_status}}</span>
      </p>

      <p><strong>Booking Number:</strong> {{booking_number}}</p>
      <p><strong>Game:</strong> {{game_name}}</p>

      <a href="{{booking_url}}" class="button">View Booking</a>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Booking Status Update

Hi {{customer_name}},

Your booking status has been updated to: {{new_status}}

Booking Number: {{booking_number}}
Game: {{game_name}}

View your booking: {{booking_url}}',
  '["site_name", "customer_name", "booking_number", "game_name", "new_status", "booking_url", "year"]'::jsonb
),
(
  'payment_confirmation',
  'Payment Received - {{invoice_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .payment-details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; }
    .total-row { font-size: 18px; font-weight: bold; color: #ea580c; border-top: 2px solid #ea580c; padding-top: 12px; margin-top: 12px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Received</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Thank you! We have received your payment.</p>
      
      <div class="payment-details">
        <h2 style="margin-top: 0;">Payment Details</h2>
        <div class="detail-row">
          <span class="detail-label">Invoice Number:</span>
          <span>{{invoice_number}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span>{{payment_method}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span>{{payment_date}}</span>
        </div>
        <div class="detail-row total-row">
          <span>Amount Paid:</span>
          <span>{{amount_paid}}</span>
        </div>
      </div>

      <p>A receipt has been sent to your email. You can also view your payment history in your account.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Payment Received

Hi {{customer_name}},

Thank you! We have received your payment.

Payment Details:
- Invoice Number: {{invoice_number}}
- Payment Method: {{payment_method}}
- Date: {{payment_date}}
- Amount Paid: {{amount_paid}}

A receipt has been sent to your email.',
  '["site_name", "customer_name", "invoice_number", "payment_method", "payment_date", "amount_paid", "year"]'::jsonb
),
(
  'waiver_signed',
  'Waiver Signed - {{game_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Waiver Signed</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Thank you for signing the waiver for <strong>{{game_name}}</strong>.</p>
      <p>Your waiver has been recorded and you''re all set for your booking.</p>
      <p><strong>Booking Number:</strong> {{booking_number}}</p>
      <p><strong>Date:</strong> {{booking_date}}</p>
      <p>See you soon!</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Waiver Signed

Hi {{customer_name}},

Thank you for signing the waiver for {{game_name}}.

Your waiver has been recorded and you''re all set for your booking.

Booking Number: {{booking_number}}
Date: {{booking_date}}

See you soon!',
  '["site_name", "customer_name", "game_name", "booking_number", "booking_date", "year"]'::jsonb
),
(
  'account_created',
  'Your Account Has Been Created',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .credentials { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ea580c; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Created</h1>
    </div>
    <div class="content">
      <p>Hi {{user_name}},</p>
      <p>An account has been created for you at {{site_name}}.</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0;">Your Login Credentials</h3>
        <p><strong>Email:</strong> {{user_email}}</p>
        <p><strong>Temporary Password:</strong> {{temp_password}}</p>
      </div>

      <p><strong>Important:</strong> Please change your password after logging in for the first time.</p>

      <a href="{{login_url}}" class="button">Login Now</a>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Account Created

Hi {{user_name}},

An account has been created for you at {{site_name}}.

Your Login Credentials:
Email: {{user_email}}
Temporary Password: {{temp_password}}

Important: Please change your password after logging in for the first time.

Login: {{login_url}}',
  '["site_name", "user_name", "user_email", "temp_password", "login_url", "year"]'::jsonb
),
(
  'password_reset',
  'Password Reset Request',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset</h1>
    </div>
    <div class="content">
      <p>Hi {{user_name}},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>

      <div style="text-align: center;">
        <a href="{{reset_url}}" class="button">Reset Password</a>
      </div>

      <div class="warning">
        <p><strong>Security Notice:</strong></p>
        <p>This link will expire in {{expiry_hours}} hours. If you didn''t request this reset, please ignore this email.</p>
      </div>

      <p>If the button doesn''t work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6b7280;">{{reset_url}}</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Password Reset

Hi {{user_name}},

We received a request to reset your password. Click the link below to set a new password:

{{reset_url}}

Security Notice:
This link will expire in {{expiry_hours}} hours. If you didn''t request this reset, please ignore this email.',
  '["site_name", "user_name", "reset_url", "expiry_hours", "year"]'::jsonb
)
ON CONFLICT (template_key) DO NOTHING;
