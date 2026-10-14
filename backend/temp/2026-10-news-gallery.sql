-- News gallery: the photos a news entry can carry beyond its one feature
-- image. Shown on the homepage as a slider under the entry's heading once
-- there are at least three of them.
--
-- A JSON array of URLs on the row itself rather than a table of its own: the
-- photos have no life outside their entry, are always read with it, and are
-- only ever replaced as a whole list from the admin form. NULL and [] both
-- mean "no gallery".
--
-- Not idempotent — MySQL has no ADD COLUMN IF NOT EXISTS. Run it once:
--
--   docker exec -i -e MYSQL_PWD=gallery gall_pr-mysql-1 \
--     mysql -ugallery gallery < backend/temp/2026-10-news-gallery.sql

ALTER TABLE `news` ADD COLUMN `gallery` JSON NULL AFTER `image_url`;
