/*
  # Add Booking Cancellation Email Template

  ## Overview
  This migration adds a new email template for booking cancellations.
  This template will be used when a booking is cancelled or rejected.

  ## Changes
  - Insert new "booking_cancellation" email template with:
    - Professional HTML layout matching existing templates
    - Variables for booking details
    - Cancellation reason field
    - Customer name, booking number, game name, etc.

  ## Template Variables
  - site_name: Name of the site
  - customer_name: Customer's name
  - booking_number: Booking reference number
  - game_name: Name of the game/experience
  - booking_date: Date of the booking
  - booking_time: Time of the booking
  - cancellation_reason: Reason for cancellation (optional)
  - year: Current year for footer
*/

-- Insert booking cancellation email template
INSERT INTO email_templates (template_key, subject, html_body, text_body, variables) VALUES
(
  'booking_cancellation',
  'Booking Cancelled - {{booking_number}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .booking-details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; }
    .cancellation-notice { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Cancelled</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Your booking has been cancelled.</p>

      <div class="booking-details">
        <h2 style="margin-top: 0;">Cancelled Booking Details</h2>
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
      </div>

      <p><strong>Cancellation Reason:</strong> {{cancellation_reason}}</p>

      <p>If you have any questions or would like to make a new booking, please contact us or visit our website.</p>

      <a href="{{site_url}}" class="button">Book Again</a>

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you believe this cancellation was made in error, please contact us immediately.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{site_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Booking Cancelled

Hi {{customer_name}},

Your booking has been cancelled.

Cancelled Booking Details:
- Booking Number: {{booking_number}}
- Game: {{game_name}}
- Date: {{booking_date}}
- Time: {{booking_time}}

Cancellation Reason: {{cancellation_reason}}

If you have any questions or would like to make a new booking, please contact us or visit our website.

Book again: {{site_url}}

If you believe this cancellation was made in error, please contact us immediately.',
  '["site_name", "customer_name", "booking_number", "game_name", "booking_date", "booking_time", "cancellation_reason", "site_url", "year"]'::jsonb
)
ON CONFLICT (template_key) DO NOTHING;