ALTER TABLE cart_items MODIFY COLUMN user_id INT NULL;
ALTER TABLE cart_items ADD COLUMN guest_token VARCHAR(64) NULL AFTER user_id;
ALTER TABLE cart_items ADD CONSTRAINT uniq_cart_items_guest_painting UNIQUE (guest_token, painting_id);

ALTER TABLE orders MODIFY COLUMN user_id INT NULL;
ALTER TABLE orders ADD COLUMN guest_token VARCHAR(64) NULL AFTER user_id;
ALTER TABLE orders ADD COLUMN guest_name VARCHAR(255) NULL AFTER guest_token;
ALTER TABLE orders ADD COLUMN guest_email VARCHAR(255) NULL AFTER guest_name;
ALTER TABLE orders ADD COLUMN guest_phone VARCHAR(50) NULL AFTER guest_email;
ALTER TABLE orders ADD COLUMN guest_address VARCHAR(500) NULL AFTER guest_phone;
