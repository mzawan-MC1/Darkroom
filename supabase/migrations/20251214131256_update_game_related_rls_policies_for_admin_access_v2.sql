/*
  # Update Game-Related RLS Policies for Admin Access v2

  1. Overview
    - Updates RLS policies for game-related tables
    - Ensures admin users can manage all game resources
    - Drops ALL existing policies first

  2. Tables Updated
    - games
    - game_schedules
    - booking_slots
    - pricing_tiers
    - booking_types
    - booking_add_ons
    - booking_add_on_selections
    - game_features
    - game_faqs
    - game_gallery
    - lobby_games
    - merchandise_variants
    - merchandise_images

  3. Security
    - Public/customers can view active/available items
    - Admin users with permissions can manage all items
*/

-- GAMES
DROP POLICY IF EXISTS "Public can view active games" ON games;
DROP POLICY IF EXISTS "Admin can manage games" ON games;
DROP POLICY IF EXISTS "Anyone can view active games" ON games;
DROP POLICY IF EXISTS "Admins can manage games" ON games;
DROP POLICY IF EXISTS "Authorized users can manage games" ON games;

CREATE POLICY "Anyone can view active games"
  ON games FOR SELECT
  USING (status = 'active' OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'games.view')));

CREATE POLICY "Authorized users can manage games"
  ON games FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- GAME SCHEDULES
DROP POLICY IF EXISTS "Public can view active schedules" ON game_schedules;
DROP POLICY IF EXISTS "Staff can manage schedules" ON game_schedules;
DROP POLICY IF EXISTS "Anyone can view active schedules" ON game_schedules;
DROP POLICY IF EXISTS "Admins can insert game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Managers can delete game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Managers can update game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Staff can view game schedules" ON game_schedules;
DROP POLICY IF EXISTS "Users can view active schedules" ON game_schedules;
DROP POLICY IF EXISTS "Authorized users can manage schedules" ON game_schedules;

CREATE POLICY "Anyone can view active schedules"
  ON game_schedules FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'games.view')));

CREATE POLICY "Authorized users can manage schedules"
  ON game_schedules FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- BOOKING SLOTS
DROP POLICY IF EXISTS "Public can view available slots" ON booking_slots;
DROP POLICY IF EXISTS "Staff can manage slots" ON booking_slots;
DROP POLICY IF EXISTS "Anyone can view available slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins can insert booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Customers can view available slots" ON booking_slots;
DROP POLICY IF EXISTS "Managers can delete booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Managers can update booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Staff can view booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Authorized users can manage slots" ON booking_slots;

CREATE POLICY "Anyone can view available slots"
  ON booking_slots FOR SELECT
  USING (is_available = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'games.view')));

CREATE POLICY "Authorized users can manage slots"
  ON booking_slots FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- PRICING TIERS
DROP POLICY IF EXISTS "Public can view active pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Admin can manage pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Anyone can view active pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Admins can insert pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Managers can delete pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Managers can update pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Authorized users can manage pricing tiers" ON pricing_tiers;

CREATE POLICY "Anyone can view active pricing tiers"
  ON pricing_tiers FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'games.view')));

CREATE POLICY "Authorized users can manage pricing tiers"
  ON pricing_tiers FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- BOOKING TYPES
DROP POLICY IF EXISTS "Public can view active booking types" ON booking_types;
DROP POLICY IF EXISTS "Admin can manage booking types" ON booking_types;
DROP POLICY IF EXISTS "Anyone can view active booking types" ON booking_types;
DROP POLICY IF EXISTS "Authorized users can manage booking types" ON booking_types;

CREATE POLICY "Anyone can view active booking types"
  ON booking_types FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'games.view')));

CREATE POLICY "Authorized users can manage booking types"
  ON booking_types FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- BOOKING ADD ONS
DROP POLICY IF EXISTS "Public can view available add ons" ON booking_add_ons;
DROP POLICY IF EXISTS "Admin can manage add ons" ON booking_add_ons;
DROP POLICY IF EXISTS "Anyone can view available add ons" ON booking_add_ons;
DROP POLICY IF EXISTS "Authorized users can manage add ons" ON booking_add_ons;

CREATE POLICY "Anyone can view available add ons"
  ON booking_add_ons FOR SELECT
  USING (is_available = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'games.view')));

CREATE POLICY "Authorized users can manage add ons"
  ON booking_add_ons FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- BOOKING ADD ON SELECTIONS
DROP POLICY IF EXISTS "Users can view own add on selections" ON booking_add_on_selections;
DROP POLICY IF EXISTS "Staff can view all add on selections" ON booking_add_on_selections;
DROP POLICY IF EXISTS "Users can view add on selections" ON booking_add_on_selections;
DROP POLICY IF EXISTS "Authorized users can manage add on selections" ON booking_add_on_selections;

CREATE POLICY "Users can view add on selections"
  ON booking_add_on_selections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_on_selections.booking_id
      AND bookings.user_id = auth.uid()
    ) OR
    user_has_permission(auth.uid(), 'bookings.view')
  );

CREATE POLICY "Authorized users can manage add on selections"
  ON booking_add_on_selections FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'bookings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'bookings.edit'));

-- GAME FEATURES
DROP POLICY IF EXISTS "Public can view game features" ON game_features;
DROP POLICY IF EXISTS "Admin can manage game features" ON game_features;
DROP POLICY IF EXISTS "Anyone can view game features" ON game_features;
DROP POLICY IF EXISTS "Authorized users can manage game features" ON game_features;

CREATE POLICY "Anyone can view game features"
  ON game_features FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can manage game features"
  ON game_features FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- GAME FAQS
DROP POLICY IF EXISTS "Public can view game faqs" ON game_faqs;
DROP POLICY IF EXISTS "Admin can manage game faqs" ON game_faqs;
DROP POLICY IF EXISTS "Anyone can view game faqs" ON game_faqs;
DROP POLICY IF EXISTS "Authorized users can manage game faqs" ON game_faqs;

CREATE POLICY "Anyone can view game faqs"
  ON game_faqs FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can manage game faqs"
  ON game_faqs FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- GAME GALLERY
DROP POLICY IF EXISTS "Public can view game gallery" ON game_gallery;
DROP POLICY IF EXISTS "Admin can manage game gallery" ON game_gallery;
DROP POLICY IF EXISTS "Anyone can view game gallery" ON game_gallery;
DROP POLICY IF EXISTS "Authorized users can manage game gallery" ON game_gallery;

CREATE POLICY "Anyone can view game gallery"
  ON game_gallery FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can manage game gallery"
  ON game_gallery FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- LOBBY GAMES
DROP POLICY IF EXISTS "Public can view available lobby games" ON lobby_games;
DROP POLICY IF EXISTS "Admin can manage lobby games" ON lobby_games;
DROP POLICY IF EXISTS "Anyone can view available lobby games" ON lobby_games;
DROP POLICY IF EXISTS "Admins can manage lobby games" ON lobby_games;
DROP POLICY IF EXISTS "Anyone can view lobby games" ON lobby_games;
DROP POLICY IF EXISTS "Authorized users can manage lobby games" ON lobby_games;

CREATE POLICY "Anyone can view available lobby games"
  ON lobby_games FOR SELECT
  USING (is_available = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'games.view')));

CREATE POLICY "Authorized users can manage lobby games"
  ON lobby_games FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'games.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'games.edit'));

-- MERCHANDISE VARIANTS
DROP POLICY IF EXISTS "Public can view available variants" ON merchandise_variants;
DROP POLICY IF EXISTS "Admin can manage variants" ON merchandise_variants;
DROP POLICY IF EXISTS "Anyone can view available variants" ON merchandise_variants;
DROP POLICY IF EXISTS "Authorized users can manage variants" ON merchandise_variants;

CREATE POLICY "Anyone can view available variants"
  ON merchandise_variants FOR SELECT
  USING (is_available = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'merchandise.view')));

CREATE POLICY "Authorized users can manage variants"
  ON merchandise_variants FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'merchandise.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'merchandise.edit'));

-- MERCHANDISE IMAGES
DROP POLICY IF EXISTS "Public can view merchandise images" ON merchandise_images;
DROP POLICY IF EXISTS "Admin can manage merchandise images" ON merchandise_images;
DROP POLICY IF EXISTS "Anyone can view merchandise images" ON merchandise_images;
DROP POLICY IF EXISTS "Authorized users can manage merchandise images" ON merchandise_images;

CREATE POLICY "Anyone can view merchandise images"
  ON merchandise_images FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can manage merchandise images"
  ON merchandise_images FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'merchandise.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'merchandise.edit'));

-- CHALLENGE FEATURES (for landing page)
DROP POLICY IF EXISTS "Public can view active challenge features" ON challenge_features;
DROP POLICY IF EXISTS "Admin can manage challenge features" ON challenge_features;
DROP POLICY IF EXISTS "Anyone can view active challenge features" ON challenge_features;
DROP POLICY IF EXISTS "Authorized users can manage challenge features" ON challenge_features;

CREATE POLICY "Anyone can view active challenge features"
  ON challenge_features FOR SELECT
  USING (is_active = true OR (auth.uid() IS NOT NULL AND user_has_permission(auth.uid(), 'cms.edit')));

CREATE POLICY "Authorized users can manage challenge features"
  ON challenge_features FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'cms.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'cms.edit'));

-- POPUP BANNER SETTINGS
DROP POLICY IF EXISTS "Public can view popup banner settings" ON popup_banner_settings;
DROP POLICY IF EXISTS "Admin can manage popup banner settings" ON popup_banner_settings;
DROP POLICY IF EXISTS "Anyone can view popup banner settings" ON popup_banner_settings;
DROP POLICY IF EXISTS "Authorized users can manage popup banner settings" ON popup_banner_settings;

CREATE POLICY "Anyone can view popup banner settings"
  ON popup_banner_settings FOR SELECT
  USING (true);

CREATE POLICY "Authorized users can manage popup banner settings"
  ON popup_banner_settings FOR ALL
  TO authenticated
  USING (user_has_permission(auth.uid(), 'settings.edit'))
  WITH CHECK (user_has_permission(auth.uid(), 'settings.edit'));
