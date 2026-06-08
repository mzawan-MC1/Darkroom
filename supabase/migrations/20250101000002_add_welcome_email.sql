
-- Add welcome_email_sent column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS welcome_email_sent boolean DEFAULT false;

-- Insert Welcome Email Template
INSERT INTO email_templates (template_key, subject, html_body, text_body, is_active)
VALUES (
  'welcome_email',
  'Welcome to The Lockout - Your Adventure Begins!',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; padding: 20px; text-align: center; }
    .logo { max-height: 50px; }
    .content { padding: 30px 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #ef4444; margin: 0;">THE LOCKOUT</h1>
    </div>
    <div class="content">
      <h2>Welcome, {{user_name}}!</h2>
      <p>We''re thrilled to have you join The Lockout community.</p>
      <p>Your account has been successfully created. You can now:</p>
      <ul>
        <li>Book your next escape adventure</li>
        <li>View your booking history</li>
        <li>Manage your profile</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{login_url}}" class="button">Access My Account</a>
      </p>
      <p>If you have any questions, feel free to reply to this email or contact us at info@thelockout.ae.</p>
      <p>Get ready to escape!</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} The Lockout. All rights reserved.</p>
      <p>Street 3 - Al Qouz Ind. - Al Quoz - Dubai</p>
    </div>
  </div>
</body>
</html>',
  'Welcome to The Lockout! Your account has been created successfully. Visit {{login_url}} to access your account.',
  true
)
ON CONFLICT (template_key) DO NOTHING;

-- Insert Admin Notification Template
INSERT INTO email_templates (template_key, subject, html_body, text_body, is_active)
VALUES (
  'admin_new_user_notification',
  '[ADMIN] New Customer Signup',
  '<!DOCTYPE html>
<html>
<body>
  <h2>New Customer Signup</h2>
  <p>A new customer has signed up.</p>
  <ul>
    <li><strong>Name:</strong> {{user_name}}</li>
    <li><strong>Email:</strong> {{user_email}}</li>
    <li><strong>Signup Method:</strong> {{signup_method}}</li>
    <li><strong>Time:</strong> {{signup_time}}</li>
  </ul>
</body>
</html>',
  'New Customer Signup: {{user_name}} ({{user_email}}) via {{signup_method}} at {{signup_time}}',
  true
)
ON CONFLICT (template_key) DO NOTHING;
