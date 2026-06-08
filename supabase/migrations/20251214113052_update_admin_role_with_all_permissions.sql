/*
  # Update Admin Role with All Module Permissions

  Updates the existing Admin role to have all permissions for all modules using the new permission format (module.action).

  ## Changes
  - Updates the Admin role's permissions to include all module-action combinations
  - Covers all 24 modules with their respective actions:
    - Dashboard, Games, Game Schedules, Bookings, Lobby Games, Lobby Passes
    - Waivers, Waiver Templates, Users, Roles, Merchandise, Orders
    - Blog, Pages, SEO, Site Settings, Email Settings, Payment Settings
    - Promotions, Reports, Analytics, POS, Calendar

  ## Notes
  - This migration ensures existing Admin users have full access to all features
  - The new permission format uses "module.action" (e.g., "games.view", "users.create")
*/

-- Update Admin role with all permissions
UPDATE roles
SET permissions = '{
  "dashboard.view": true,
  "games.view": true,
  "games.create": true,
  "games.edit": true,
  "games.delete": true,
  "game_schedules.view": true,
  "game_schedules.create": true,
  "game_schedules.edit": true,
  "game_schedules.delete": true,
  "bookings.view": true,
  "bookings.create": true,
  "bookings.edit": true,
  "bookings.delete": true,
  "bookings.approve": true,
  "lobby_games.view": true,
  "lobby_games.create": true,
  "lobby_games.edit": true,
  "lobby_games.delete": true,
  "lobby_passes.view": true,
  "lobby_passes.create": true,
  "lobby_passes.edit": true,
  "lobby_passes.delete": true,
  "lobby_passes.approve": true,
  "waivers.view": true,
  "waivers.create": true,
  "waivers.edit": true,
  "waivers.delete": true,
  "waiver_templates.view": true,
  "waiver_templates.create": true,
  "waiver_templates.edit": true,
  "waiver_templates.delete": true,
  "users.view": true,
  "users.create": true,
  "users.edit": true,
  "users.delete": true,
  "roles.view": true,
  "roles.create": true,
  "roles.edit": true,
  "roles.delete": true,
  "merchandise.view": true,
  "merchandise.create": true,
  "merchandise.edit": true,
  "merchandise.delete": true,
  "orders.view": true,
  "orders.create": true,
  "orders.edit": true,
  "orders.delete": true,
  "blog.view": true,
  "blog.create": true,
  "blog.edit": true,
  "blog.delete": true,
  "pages.view": true,
  "pages.create": true,
  "pages.edit": true,
  "pages.delete": true,
  "seo.view": true,
  "seo.edit": true,
  "site_settings.view": true,
  "site_settings.edit": true,
  "email_settings.view": true,
  "email_settings.edit": true,
  "payment_settings.view": true,
  "payment_settings.edit": true,
  "promotions.view": true,
  "promotions.create": true,
  "promotions.edit": true,
  "promotions.delete": true,
  "reports.view": true,
  "analytics.view": true,
  "pos.view": true,
  "pos.create": true,
  "calendar.view": true
}'::jsonb
WHERE name = 'Admin';
