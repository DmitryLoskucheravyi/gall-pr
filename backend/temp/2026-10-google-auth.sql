-- Sign in with Google.
--
-- google_id is the `sub` claim of Google's ID token: the one identifier Google
-- promises never to reuse or change for an account. The address is not that —
-- a person can rename their Google mailbox — so the link is kept by `sub`, and
-- the email is only used to find an existing account the first time.
--
-- password_hash becomes nullable: an account opened through Google has no
-- password until its owner sets one (forgot-password, or the profile's
-- security section). Login with a password refuses such an account cleanly
-- rather than comparing against an empty string.
--
--   docker exec -i -e MYSQL_PWD=gallery gall_pr-mysql-1 \
--     mysql -ugallery gallery < backend/temp/2026-10-google-auth.sql

ALTER TABLE `users`
  MODIFY `password_hash` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  ADD COLUMN `google_id` varchar(64) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL AFTER `password_hash`,
  ADD UNIQUE KEY `uq_users_google_id` (`google_id`);
