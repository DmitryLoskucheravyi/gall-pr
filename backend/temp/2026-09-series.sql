-- Series: a named body of work, holding many paintings.
--
-- 1:N, so the foreign key lives on the "many" side — `paintings.series_id`.
-- Nullable, because a work that belongs to no series is the ordinary case and
-- not an error. ON DELETE SET NULL, because deleting a series must release its
-- paintings, never delete them.
--
-- Idempotent (IF NOT EXISTS throughout), so re-running it is a no-op.
--
--   mysql --ssl-mode=VERIFY_IDENTITY -h "$DB_HOST" -P "$DB_PORT" \
--         -u "$DB_USERNAME" -p "$DB_DATABASE" < backend/temp/2026-09-series.sql

CREATE TABLE IF NOT EXISTS `series` (
  `id`             int          NOT NULL AUTO_INCREMENT,
  `name`           varchar(255) NOT NULL,
  `name_en`        varchar(255) DEFAULT NULL,
  `description`    text         DEFAULT NULL,
  `description_en` text         DEFAULT NULL,
  `cover_image`    varchar(500) DEFAULT NULL,
  -- The artist's own ordering, which is rarely alphabetical. Ties break by id
  -- in the query, so a shared sort_order never reshuffles between requests.
  `sort_order`     int          NOT NULL DEFAULT 0,
  -- Somewhere to assemble a series before it is announced: hidden ones stay in
  -- the admin and never reach the storefront.
  `is_published`   tinyint(1)   NOT NULL DEFAULT 1,
  `created_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_series_name` (`name`),
  KEY `idx_series_published_order` (`is_published`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE paintings ADD COLUMN IF NOT EXISTS `series_id` int DEFAULT NULL;

-- Indexed because it is the column the catalogue filters on and the one the
-- series showcase groups by.
ALTER TABLE paintings ADD INDEX IF NOT EXISTS `idx_paintings_series` (`series_id`);

-- Add the constraint only if it isn't already there. MySQL has no
-- ADD CONSTRAINT IF NOT EXISTS, so this checks the catalogue first and runs
-- the ALTER through a prepared statement.
SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'paintings'
    AND CONSTRAINT_NAME = 'fk_paintings_series'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE paintings ADD CONSTRAINT `fk_paintings_series` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`) ON DELETE SET NULL',
  'SELECT "fk_paintings_series already present" AS note'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
