-- Owner lifecycle for listings, kept separate from moderation `status` (active / pending / rejected).
-- A listing is public only when status = 'active' AND closed IS NULL. Deleting is soft, so leads and
-- photos keep pointing at the listing. Added as columns (not a table rebuild) so no foreign-key cascade
-- can touch listing_photos. See docs/functions/post-property/desc.md.
ALTER TABLE listings ADD COLUMN closed TEXT CHECK (closed IN ('sold', 'rented', 'deleted'));
ALTER TABLE listings ADD COLUMN closed_at TEXT;
