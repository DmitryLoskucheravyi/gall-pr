-- Schema changes for the September 2026 fix pass.
--
-- Apply once against the live database. Every statement is idempotent
-- (IF NOT EXISTS / IF EXISTS), so re-running this is a no-op rather than an
-- error — there is no migration tooling in this project (synchronize: false),
-- so the file itself is the record of what was applied.
--
--   mysql --ssl-mode=VERIFY_IDENTITY -h "$DB_HOST" -P "$DB_PORT" \
--         -u "$DB_USERNAME" -p "$DB_DATABASE" < backend/temp/2026-09-fixes.sql
--
-- db.sql in the repository root has been brought up to date with all of this,
-- so a database created from that dump needs none of it.

-- ---------------------------------------------------------------------------
-- 1. Bilingual columns.
--
-- These were added by scripts/add-bilingual-columns.ts in September and never
-- made it into db.sql, so a database created from the dump was missing every
-- *_en column while the entities selected them — which meant every query
-- against paintings, news, giveaways, materials and techniques failed. Repeated
-- here so that one file is the whole story.
-- ---------------------------------------------------------------------------

ALTER TABLE paintings ADD COLUMN IF NOT EXISTS title_en VARCHAR(255) NULL AFTER title;
ALTER TABLE paintings ADD COLUMN IF NOT EXISTS subtitle_en VARCHAR(255) NULL AFTER subtitle;
ALTER TABLE paintings ADD COLUMN IF NOT EXISTS description_en TEXT NULL;

ALTER TABLE materials ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) NULL AFTER name;
ALTER TABLE techniques ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) NULL AFTER name;

ALTER TABLE news ADD COLUMN IF NOT EXISTS title_en VARCHAR(255) NULL AFTER title;
ALTER TABLE news ADD COLUMN IF NOT EXISTS text_en TEXT NULL;

ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS title_en VARCHAR(255) NULL AFTER title;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS description_en TEXT NULL;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS conditions_en TEXT NULL;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS author_name_en VARCHAR(255) NULL AFTER author_name;

-- ---------------------------------------------------------------------------
-- 2. Sessions as rows.
--
-- The refresh token used to be a single column on `users`, which made being
-- signed in a property of the account rather than of a device: signing in on a
-- phone overwrote the desktop's token and silently ended that session, and
-- there was no way to see where you were signed in or to end one session
-- without ending them all.
--
-- Only the SHA-256 of the token is stored. `token_hash` is unique because it is
-- how a presented token is looked up, and because a token that verifies but
-- holds no row is treated as a replay — see AuthService.refresh.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `refresh_sessions` (
  `id`         int          NOT NULL AUTO_INCREMENT,
  `user_id`    int          NOT NULL,
  `token_hash` char(64)     NOT NULL,
  `created_at` timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime     NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_refresh_sessions_token` (`token_hash`),
  KEY `idx_refresh_sessions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- ---------------------------------------------------------------------------
-- 3. Password resets.
--
-- There was no way back into an account whose password had been forgotten —
-- no reset, no verification, nothing. The token is 32 random bytes and stored
-- only as a hash: it is a full account takeover for as long as it lives.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id`         int       NOT NULL AUTO_INCREMENT,
  `user_id`    int       NOT NULL,
  `token_hash` char(64)  NOT NULL,
  `expires_at` datetime  NOT NULL,
  `used_at`    datetime  DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Superseded by refresh_sessions above. Run this only once the new code is
-- deployed — dropping it under the old code signs everybody out.
ALTER TABLE users DROP COLUMN IF EXISTS refresh_token;

-- ---------------------------------------------------------------------------
-- 4. Indexes the orders table never had.
--
-- `orders` carried nothing but its primary key, so every "my orders" lookup —
-- WHERE user_id = ? or WHERE guest_token = ? — was a full table scan, as was
-- the admin list's ORDER BY created_at.
-- ---------------------------------------------------------------------------

ALTER TABLE orders ADD INDEX IF NOT EXISTS `idx_orders_user` (`user_id`);
ALTER TABLE orders ADD INDEX IF NOT EXISTS `idx_orders_guest_token` (`guest_token`);
ALTER TABLE orders ADD INDEX IF NOT EXISTS `idx_orders_created_at` (`created_at`);
-- The admin list pages by tab: active is is_archived = 0, completed is
-- status = 'COMPLETED', both newest-first.
ALTER TABLE orders ADD INDEX IF NOT EXISTS `idx_orders_archived_created` (`is_archived`, `created_at`);
ALTER TABLE orders ADD INDEX IF NOT EXISTS `idx_orders_status_created` (`status`, `created_at`);

-- The cart is read by identity on every page that shows a badge.
ALTER TABLE cart_items ADD INDEX IF NOT EXISTS `idx_cart_items_user` (`user_id`);

-- The catalogue filters and sorts on these.
ALTER TABLE paintings ADD INDEX IF NOT EXISTS `idx_paintings_available_created` (`is_available`, `created_at`);
ALTER TABLE paintings ADD INDEX IF NOT EXISTS `idx_paintings_price` (`price`);

-- ---------------------------------------------------------------------------
-- 5. One width for one id.
--
-- users.id is bigint, but orders.user_id and cart_items.user_id were int while
-- likes.user_id was bigint — three columns holding the same value in two
-- widths. Neither of the int ones has a foreign key, so widening them is a
-- plain column change.
-- ---------------------------------------------------------------------------

ALTER TABLE orders     MODIFY COLUMN `user_id` bigint DEFAULT NULL;
ALTER TABLE cart_items MODIFY COLUMN `user_id` bigint DEFAULT NULL;
ALTER TABLE refresh_sessions MODIFY COLUMN `user_id` bigint NOT NULL;
ALTER TABLE password_resets  MODIFY COLUMN `user_id` bigint NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. One guest, one support thread.
--
-- support_chats.user_id is unique; guest_token only had a plain index, so two
-- first messages arriving together could both insert. The service retries
-- through a re-read either way, but the index is what makes the race
-- impossible rather than merely handled.
-- ---------------------------------------------------------------------------

-- TiDB accepts IF NOT EXISTS on ADD INDEX but not on ADD UNIQUE INDEX, so this
-- one is guarded the same way the foreign key above is: look in the catalogue
-- first, then run the ALTER through a prepared statement.
SET @uniq_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'support_chats'
    AND INDEX_NAME = 'uniq_support_chats_guest'
);

SET @sql := IF(
  @uniq_exists = 0,
  'ALTER TABLE support_chats ADD UNIQUE INDEX `uniq_support_chats_guest` (`guest_token`)',
  'SELECT "uniq_support_chats_guest already present" AS note'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 7. Optional: the `addres` typo.
--
-- The column is spelled wrong and nothing reads it. The entity maps around it
-- (users.address -> addres), so this is cosmetic — uncomment if it is ever
-- worth the churn, and drop the `name: 'addres'` from the entity in the same
-- change.
-- ---------------------------------------------------------------------------

-- ALTER TABLE users RENAME COLUMN `addres` TO `address`;
