-- Reviews: what a customer says once their order has reached them.
--
-- One per order (UNIQUE order_id): the review is of a purchase, so a person
-- who bought twice may speak twice, but nobody can stack ten on one parcel.
-- Only an order with status COMPLETED can be reviewed; the API enforces that,
-- because "completed" is a business rule, not a shape of data.
--
-- user_id is copied from the order for convenience and may be NULL — guests
-- review through the same guest token they ordered with. author_name is fixed
-- at the moment of writing (first name and an initial), so a later change of
-- account name does not rewrite what was published under the old one.
--
-- The customer cannot edit it after posting; the admin can (text, rating).
-- Nothing reaches the site until the admin publishes it: is_published starts
-- at 0, and the admin chooses which to show.
--
-- Deleting an order deletes its review with it.
--
--   docker exec -i -e MYSQL_PWD=gallery gall_pr-mysql-1 \
--     mysql -ugallery gallery < backend/temp/2026-10-reviews.sql

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `author_name` varchar(100) NOT NULL,
  `rating` tinyint NOT NULL,
  `text` text NOT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_order` (`order_id`),
  KEY `idx_reviews_published` (`is_published`, `created_at`),
  CONSTRAINT `fk_reviews_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
