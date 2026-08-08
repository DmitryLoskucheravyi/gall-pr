-- Support chat opens up to guests: a chat is now keyed either by account or by
-- the same guest token that already carries the cart and guest orders.
-- BIGINT, not INT: these columns carry a foreign key to users.id, and changing
-- the width would break it.
ALTER TABLE support_chats MODIFY COLUMN user_id BIGINT NULL;
ALTER TABLE support_chats ADD COLUMN guest_token VARCHAR(64) NULL;
ALTER TABLE support_chats ADD INDEX idx_guest_token (guest_token);

-- A guest's message has no account behind it.
ALTER TABLE support_messages MODIFY COLUMN sender_id BIGINT NULL;
