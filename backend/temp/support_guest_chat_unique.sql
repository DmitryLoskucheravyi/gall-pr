-- support_chats.guest_token had a plain INDEX while user_id had a UNIQUE one,
-- so the guest half of the same "one chat per identity" rule was never actually
-- enforced. getOrCreateChat is a check-then-insert: a guest's first two
-- messages arriving together both found nothing and both inserted, leaving the
-- visitor with two threads and the admin with two entries for one person.
--
-- Run this once. If it fails on duplicates, the SELECT below finds them —
-- merge or delete the extra rows first (keep the lowest id, move its messages),
-- then re-run.
--
--   SELECT guest_token, COUNT(*) AS chats
--   FROM support_chats
--   WHERE guest_token IS NOT NULL
--   GROUP BY guest_token
--   HAVING chats > 1;
--
-- NULL is not equal to itself in a UNIQUE index, so every account-owned chat
-- (guest_token IS NULL) is unaffected.

ALTER TABLE support_chats DROP INDEX idx_guest_token;
ALTER TABLE support_chats ADD UNIQUE INDEX uniq_support_chats_guest_token (guest_token);
