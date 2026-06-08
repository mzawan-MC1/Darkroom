/*
  # Update Additional RLS Policies for Admin Access v2

  1. Overview
    - Updates RLS policies for additional tables to use permission-based system
    - Ensures admin users can manage all system resources
    - Drops existing policies before recreating

  2. Tables Updated
    - promo_codes
    - reviews
    - merchandise
    - blog_posts
    - static_pages
    - user_roles
    - roles
    - waiver_templates
    - booking_participants
    - site_settings
    - email templates, logs, and SMTP settings
    - testimonials
    - page_seo
    - payment_settings and payments

  3. Security
    - Maintains proper permission checks
    - Customers can view/manage their own data
    - Admin users with permissions can manage all data
*/

-- PROMO CODES
DROP POLICY IF EXISTS "Admin can manage promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Public can view active promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Users can view active promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Authorized users can manage promo codes" ON promo_codes;

CREATE POLICY "Users can view active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    user_has_permission(auth.uid(), 'promotions.view')
  );

CREATE POLICY "Authorized users can manage promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'promotions.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'promotions.edit'));

-- REVIEWS
DROP POLICY IF EXISTS "Public can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can manage reviews" ON reviews;
DROP POLICY IF EXISTS "Anyone can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Authorized users can manage reviews" ON reviews;

CREATE POLICY "Anyone can view published reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (is_published = true OR user_has_permission(auth.uid(), 'reviews.view'));

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_has_permission(auth.uid(), 'reviews.create'));

CREATE POLICY "Authorized users can manage reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'reviews.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'reviews.edit'));

-- MERCHANDISE
DROP POLICY IF EXISTS "Public can view available merchandise" ON merchandise;
DROP POLICY IF EXISTS "Admin can manage merchandise" ON merchandise;
DROP POLICY IF EXISTS "Anyone can view available merchandise" ON merchandise;
DROP POLICY IF EXISTS "Authorized users can manage merchandise" ON merchandise;

CREATE POLICY "Anyone can view available merchandise"
  ON merchandise FOR SELECT
  TO authenticated
  USING (is_available = true OR user_has_permission(auth.uid(), 'merchandise.view'));

CREATE POLICY "Authorized users can manage merchandise"
  ON merchandise FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'merchandise.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'merchandise.edit'));

-- BLOG POSTS
DROP POLICY IF EXISTS "Public can view published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin can manage blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authorized users can manage blog posts" ON blog_posts;

CREATE POLICY "Anyone can view published blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (is_published = true OR user_has_permission(auth.uid(), 'cms.edit'));

CREATE POLICY "Authorized users can manage blog posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'cms.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'cms.edit'));

-- STATIC PAGES
DROP POLICY IF EXISTS "Anyone can view published static pages" ON static_pages;
DROP POLICY IF EXISTS "Public can view published static pages" ON static_pages;
DROP POLICY IF EXISTS "Admin can manage static pages" ON static_pages;
DROP POLICY IF EXISTS "Staff can manage static pages" ON static_pages;
DROP POLICY IF EXISTS "Authorized users can manage static pages" ON static_pages;

CREATE POLICY "Anyone can view published static pages"
  ON static_pages FOR SELECT
  USING (is_published = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'cms.edit')));

CREATE POLICY "Authorized users can manage static pages"
  ON static_pages FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'cms.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'cms.edit'));

-- USER ROLES
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admin can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON user_roles;
DROP POLICY IF EXISTS "Authorized users can manage user roles" ON user_roles;

CREATE POLICY "Users can view roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'roles.view')
  );

CREATE POLICY "Authorized users can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'roles.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'roles.edit'));

-- ROLES
DROP POLICY IF EXISTS "Users can view roles" ON roles;
DROP POLICY IF EXISTS "Admin can manage roles" ON roles;
DROP POLICY IF EXISTS "Authorized users can manage roles" ON roles;

CREATE POLICY "Users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'roles.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'roles.edit'));

-- WAIVER TEMPLATES
DROP POLICY IF EXISTS "Public can view active templates" ON waiver_templates;
DROP POLICY IF EXISTS "Admin can manage templates" ON waiver_templates;
DROP POLICY IF EXISTS "Users can view active waiver templates" ON waiver_templates;
DROP POLICY IF EXISTS "Authorized users can manage waiver templates" ON waiver_templates;

CREATE POLICY "Users can view active waiver templates"
  ON waiver_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR user_has_permission(auth.uid(), 'waivers.edit'));

CREATE POLICY "Authorized users can manage waiver templates"
  ON waiver_templates FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'waivers.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'waivers.edit'));

-- BOOKING PARTICIPANTS
DROP POLICY IF EXISTS "Users can view own booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Staff can view all booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Users can view booking participants" ON booking_participants;
DROP POLICY IF EXISTS "Authorized users can manage booking participants" ON booking_participants;

CREATE POLICY "Users can view booking participants"
  ON booking_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'bookings.view')
  );

CREATE POLICY "Authorized users can manage booking participants"
  ON booking_participants FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'bookings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'bookings.edit'));

-- SITE SETTINGS
DROP POLICY IF EXISTS "Public can view site settings" ON site_settings;
DROP POLICY IF EXISTS "Admin can manage site settings" ON site_settings;
DROP POLICY IF EXISTS "Anyone can view site settings" ON site_settings;
DROP POLICY IF EXISTS "Authorized users can manage site settings" ON site_settings;

CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'settings.edit'));

-- EMAIL TEMPLATES
DROP POLICY IF EXISTS "Staff can manage email templates" ON email_templates;
DROP POLICY IF EXISTS "Authorized users can view email templates" ON email_templates;
DROP POLICY IF EXISTS "Authorized users can manage email templates" ON email_templates;

CREATE POLICY "Authorized users can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'));

CREATE POLICY "Authorized users can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'settings.edit'));

-- EMAIL LOGS
DROP POLICY IF EXISTS "Staff can view email logs" ON email_logs;
DROP POLICY IF EXISTS "Authorized users can view email logs" ON email_logs;

CREATE POLICY "Authorized users can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.view'));

-- SMTP SETTINGS
DROP POLICY IF EXISTS "Staff can manage smtp settings" ON smtp_settings;
DROP POLICY IF EXISTS "Authorized users can view smtp settings" ON smtp_settings;
DROP POLICY IF EXISTS "Authorized users can manage smtp settings" ON smtp_settings;

CREATE POLICY "Authorized users can view smtp settings"
  ON smtp_settings FOR SELECT
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.view'));

CREATE POLICY "Authorized users can manage smtp settings"
  ON smtp_settings FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'settings.edit'));

-- TESTIMONIALS
DROP POLICY IF EXISTS "Public can view active testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admin can manage testimonials" ON testimonials;
DROP POLICY IF EXISTS "Anyone can view active testimonials" ON testimonials;
DROP POLICY IF EXISTS "Authorized users can manage testimonials" ON testimonials;

CREATE POLICY "Anyone can view active testimonials"
  ON testimonials FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'cms.edit')));

CREATE POLICY "Authorized users can manage testimonials"
  ON testimonials FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'cms.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'cms.edit'));

-- PAGE SEO
DROP POLICY IF EXISTS "Public can view active page seo" ON page_seo;
DROP POLICY IF EXISTS "Staff can manage page seo" ON page_seo;
DROP POLICY IF EXISTS "Anyone can view active page seo" ON page_seo;
DROP POLICY IF EXISTS "Authorized users can manage page seo" ON page_seo;

CREATE POLICY "Anyone can view active page seo"
  ON page_seo FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'cms.edit')));

CREATE POLICY "Authorized users can manage page seo"
  ON page_seo FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'cms.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'cms.edit'));

-- PAYMENT SETTINGS
DROP POLICY IF EXISTS "Authorized users can view payment settings" ON payment_settings;
DROP POLICY IF EXISTS "Authorized users can manage payment settings" ON payment_settings;

CREATE POLICY "Authorized users can view payment settings"
  ON payment_settings FOR SELECT
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.view'));

CREATE POLICY "Authorized users can manage payment settings"
  ON payment_settings FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'settings.edit'));

-- PAYMENTS
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Authorized users can manage payments" ON payments;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_has_permission(auth.uid(), 'invoices.view')
  );

CREATE POLICY "Authorized users can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'invoices.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'invoices.edit'));
