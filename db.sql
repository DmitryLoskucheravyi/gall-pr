-- Full schema of the gallery database, as it actually stands.
--
-- Generated from the live database rather than hand-written, and it replaces
-- the pile of incremental migrations this used to be reconstructed from. The
-- previous db.sql described two of sixteen tables, which meant nothing in the
-- repository could stand a database up from nothing.
--
-- Schema only, no rows. Regenerate after a schema change so this stays true.
--
-- It stopped being true once: the bilingual *_en columns were added to the
-- live database in September by scripts/add-bilingual-columns.ts and never
-- reached this file, so a database built from it was missing every column the
-- entities select — which is to say, unusable. Both those columns and the
-- September fix pass (backend/temp/2026-09-fixes.sql) are folded in below.
-- Anything applied to the live database from now on belongs in a file under
-- backend/temp/ *and* here.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `app_settings`;
CREATE TABLE `app_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `author_name` varchar(255) NOT NULL DEFAULT '',
  `author_name_en` varchar(255) DEFAULT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `card_transfer_iban` varchar(255) NOT NULL DEFAULT '',
  `nova_poshta_sender_city_ref` varchar(255) NOT NULL DEFAULT '',
  `nova_poshta_sender_city_name` varchar(255) NOT NULL DEFAULT '',
  `faq` text NOT NULL,
  `support_email` varchar(255) NOT NULL DEFAULT '',
  `support_phone` varchar(255) NOT NULL DEFAULT '',
  `support_telegram_url` varchar(255) NOT NULL DEFAULT '',
  `admin_telegram_chat_id` varchar(255) NOT NULL DEFAULT '',
  `admin_telegram_link_code` varchar(255) DEFAULT NULL,
  `admin_telegram_link_code_expires_at` datetime DEFAULT NULL,
  `hero_painting_id_1` int DEFAULT NULL,
  `hero_painting_id_2` int DEFAULT NULL,
  `hero_painting_id_3` int DEFAULT NULL,
  `instagram_url` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `cart_items`;
CREATE TABLE `cart_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `guest_token` varchar(64) DEFAULT NULL,
  `painting_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_cart_user_painting` (`user_id`,`painting_id`),
  UNIQUE KEY `uniq_cart_items_guest_painting` (`guest_token`,`painting_id`),
  KEY `idx_cart_items_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `giveaway_participants`;
CREATE TABLE `giveaway_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `giveaway_id` int NOT NULL,
  `user_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_giveaway_user` (`giveaway_id`,`user_id`),
  KEY `fk_giveaway_participants_user` (`user_id`),
  CONSTRAINT `fk_giveaway_participants_giveaway` FOREIGN KEY (`giveaway_id`) REFERENCES `giveaways` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_giveaway_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `giveaways`;
CREATE TABLE `giveaways` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `description_en` text DEFAULT NULL,
  `conditions` text DEFAULT NULL,
  `conditions_en` text DEFAULT NULL,
  `painting_id` int NOT NULL,
  `deadline` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_giveaways_painting` (`painting_id`),
  CONSTRAINT `fk_giveaways_painting` FOREIGN KEY (`painting_id`) REFERENCES `paintings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `likes`;
CREATE TABLE `likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `painting_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_user_painting` (`user_id`,`painting_id`),
  KEY `fk_likes_painting` (`painting_id`),
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_likes_painting` FOREIGN KEY (`painting_id`) REFERENCES `paintings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `mail_outbox`;
CREATE TABLE `mail_outbox` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kind` varchar(64) NOT NULL,
  `to_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `text_body` text NOT NULL,
  `html_body` mediumtext NOT NULL,
  `order_id` int DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT '0',
  `last_error` text DEFAULT NULL,
  `next_attempt_at` datetime NOT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_due` (`status`,`next_attempt_at`),
  KEY `idx_order_kind` (`order_id`,`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `materials`;
CREATE TABLE `materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `news`;
CREATE TABLE `news` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `text` text NOT NULL,
  `text_en` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `painting_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_order_items_order` (`order_id`),
  KEY `fk_order_items_painting` (`painting_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_painting` FOREIGN KEY (`painting_id`) REFERENCES `paintings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `guest_token` varchar(64) DEFAULT NULL,
  `guest_name` varchar(255) DEFAULT NULL,
  `guest_email` varchar(255) DEFAULT NULL,
  `guest_phone` varchar(50) DEFAULT NULL,
  `guest_address` varchar(500) DEFAULT NULL,
  `status` enum('PENDING','CONFIRMED','SHIPPED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
  `total` decimal(10,2) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `comment` text DEFAULT NULL,
  `payment_provider` enum('LIQPAY','WAYFORPAY','CASH_ON_DELIVERY','CARD_TRANSFER','ON_AGREEMENT') NOT NULL,
  `payment_status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  `payment_transaction_id` varchar(255) DEFAULT NULL,
  `delivery_method` enum('NOVA_POSHTA') NOT NULL,
  `call_me_requested` tinyint(1) NOT NULL DEFAULT '0',
  `nova_poshta_city` varchar(255) DEFAULT NULL,
  `nova_poshta_warehouse` varchar(255) DEFAULT NULL,
  `delivery_cost` decimal(10,2) NOT NULL DEFAULT '0',
  `cod_fee` decimal(10,2) NOT NULL DEFAULT '0',
  `payment_proof_url` varchar(500) DEFAULT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `tracking_number` varchar(64) DEFAULT NULL,
  `is_commission` tinyint(1) NOT NULL DEFAULT '0',
  `contact_handle` varchar(120) DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_orders_user` (`user_id`),
  KEY `idx_orders_guest_token` (`guest_token`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_archived_created` (`is_archived`,`created_at`),
  KEY `idx_orders_status_created` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `paintings`;
CREATE TABLE `paintings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `title_en` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `subtitle_en` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `card_image` varchar(500) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `images` json NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `amount` int NOT NULL DEFAULT '1',
  `is_available` tinyint(1) DEFAULT '1',
  `is_featured` tinyint(1) DEFAULT '0',
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `year` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description_en` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `material_id` int DEFAULT NULL,
  `technique_id` int DEFAULT NULL,
  `series_id` int DEFAULT NULL,
  `likes_count` int NOT NULL DEFAULT '0',
  `animation_3d_image` varchar(500) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `weight` decimal(6,2) DEFAULT NULL,
  `interior_images` json DEFAULT NULL,
  `is_repeatable` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `title` (`title`),
  KEY `fk_paintings_material` (`material_id`),
  KEY `fk_paintings_technique` (`technique_id`),
  KEY `idx_paintings_available_created` (`is_available`,`created_at`),
  KEY `idx_paintings_price` (`price`),
  KEY `idx_paintings_series` (`series_id`),
  CONSTRAINT `fk_paintings_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `fk_paintings_technique` FOREIGN KEY (`technique_id`) REFERENCES `techniques` (`id`),
  CONSTRAINT `fk_paintings_series` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `support_chats`;
CREATE TABLE `support_chats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `last_message_at` datetime DEFAULT NULL,
  `unread_by_admin` int NOT NULL DEFAULT '0',
  `unread_by_user` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `guest_token` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_support_chats_user` (`user_id`),
  UNIQUE KEY `uniq_support_chats_guest` (`guest_token`),
  CONSTRAINT `fk_support_chats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `support_messages`;
CREATE TABLE `support_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chat_id` int NOT NULL,
  `sender_id` bigint DEFAULT NULL,
  `sender_role` varchar(10) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_support_messages_chat` (`chat_id`),
  KEY `fk_support_messages_sender` (`sender_id`),
  CONSTRAINT `fk_support_messages_chat` FOREIGN KEY (`chat_id`) REFERENCES `support_chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_support_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `techniques`;
CREATE TABLE `techniques` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `telegram_pending_links`;
CREATE TABLE `telegram_pending_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `chat_id` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `role` enum('USER','ADMIN') COLLATE utf8mb4_0900_ai_ci DEFAULT 'USER',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `phone` varchar(20) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `addres` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `telegram_chat_id` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `telegram_link_code` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `telegram_link_code_expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `refresh_sessions`;
CREATE TABLE `refresh_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` char(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_refresh_sessions_token` (`token_hash`),
  KEY `idx_refresh_sessions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;


DROP TABLE IF EXISTS `series`;
CREATE TABLE `series` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name_en` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `description_en` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `cover_image` varchar(500) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_published` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_series_name` (`name`),
  KEY `idx_series_published_order` (`is_published`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;