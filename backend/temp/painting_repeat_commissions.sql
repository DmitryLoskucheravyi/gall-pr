-- "Available as a repeat" vs "one of a kind".
--
-- Default 0: a work is unique unless the artist says she'll paint it again.
-- That's the safer default for a gallery — promising a repeat that isn't on
-- offer is worse than staying quiet about one that is.
ALTER TABLE paintings ADD COLUMN is_repeatable BOOLEAN NOT NULL DEFAULT 0;

-- Orders placed against a sold-out repeatable work. These never touched the
-- cart and took nothing out of stock: the painting doesn't exist yet.
ALTER TABLE orders ADD COLUMN is_commission BOOLEAN NOT NULL DEFAULT 0;

-- A commission has no payment method at the moment it's placed — price and
-- timing are agreed with the customer first, so there is nothing to charge
-- yet. Recording it as a card transfer would be a promise nobody made.
ALTER TABLE orders
  MODIFY COLUMN payment_provider
  ENUM('LIQPAY','WAYFORPAY','CASH_ON_DELIVERY','CARD_TRANSFER','ON_AGREEMENT')
  NOT NULL;

-- Instagram, for the "write to us instead" option in the commission dialog.
-- Empty means the row is simply not shown, like the other support contacts.
ALTER TABLE app_settings ADD COLUMN instagram_url VARCHAR(255) NOT NULL DEFAULT '';

-- Telegram or Instagram, whichever the customer would rather be reached on.
-- One column for both: which it is is obvious from what they typed, and being
-- asked for both is a small insult. Its own field rather than folded into the
-- comment, because it's a way to reach someone and the admin acts on it.
ALTER TABLE orders ADD COLUMN contact_handle VARCHAR(120) NULL;
