-- Photographs of a work hanging in a room, shown as an auto-advancing carousel
-- on the painting page. Chosen by the admin per painting, so the column is a
-- JSON array of Cloudinary URLs in the order they should play.
--
-- Nullable: most paintings won't have these, and NULL is "no interior section"
-- rather than an empty sequence. The 2..6 range is enforced in the service —
-- one photo isn't a carousel, and more than six is a slideshow nobody waits
-- through.

ALTER TABLE paintings ADD COLUMN interior_images JSON NULL;
