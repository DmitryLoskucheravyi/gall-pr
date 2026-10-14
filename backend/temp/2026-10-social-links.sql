-- A Facebook link for the site settings, beside instagram_url: both are shown
-- as icons at the foot of the mobile menu, each only when filled in.
--
-- Not idempotent — MySQL has no ADD COLUMN IF NOT EXISTS. Run it once:
--
--   docker exec -i -e MYSQL_PWD=gallery gall_pr-mysql-1 \
--     mysql -ugallery gallery < backend/temp/2026-10-social-links.sql

ALTER TABLE `app_settings`
  ADD COLUMN `facebook_url` varchar(255) NOT NULL DEFAULT '' AFTER `instagram_url`;
