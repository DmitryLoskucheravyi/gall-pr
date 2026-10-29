-- Online card payment taken out until there is a merchant account for it.
--
-- LiqPay and WayForPay were fully built (signed forms, verified callbacks,
-- amount reconciliation) and are in git history before this change. With no
-- contract to run them under, a half-configured gateway was a way to take an
-- order that could not be paid, so they go entirely rather than sit switched
-- off: the enum values, and payment_transaction_id, which only they wrote.
--
-- Checked before writing this: no order uses either provider and no
-- payment_transaction_id is set, so nothing is lost.
--
--   docker exec -i -e MYSQL_PWD=gallery gall_pr-mysql-1 \
--     mysql -ugallery gallery < backend/temp/2026-10-remove-online-payments.sql

ALTER TABLE `orders`
  MODIFY `payment_provider` enum('CASH_ON_DELIVERY','CARD_TRANSFER','ON_AGREEMENT') NOT NULL,
  DROP COLUMN `payment_transaction_id`;
