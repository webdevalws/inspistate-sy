-- Admin can block an account (docs/functions/admin/desc.md). Additive only: two new columns, no existing column
-- or row changes.
-- users.blocked_at: when the admin blocked the account (NULL = active). Blocked accounts can't log in or post.
-- listings.owner_blocked: 1 while the listing's owner is blocked, so the listing is left out of every public
-- page (search, map, city and project pages, compare, sitemap, stats). Kept on the listing, rather than joining
-- users in every query, so the public "live listing" condition stays one indexed table.
ALTER TABLE users ADD COLUMN blocked_at TEXT;
ALTER TABLE listings ADD COLUMN owner_blocked INTEGER NOT NULL DEFAULT 0;
