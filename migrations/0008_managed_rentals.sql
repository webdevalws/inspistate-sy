-- Managed rentals (owner-managed homes with low deposit and no brokerage). See docs/functions/managed-rentals/desc.md.
ALTER TABLE listings ADD COLUMN managed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN deposit_months REAL NOT NULL DEFAULT 2;
ALTER TABLE listings ADD COLUMN available_from TEXT;
-- Mark existing seeded rentals (also re-applied by db/seed.sql after a reset).
UPDATE listings SET managed = 1, deposit_months = 1, available_from = date(posted_at, '+7 days') WHERE purpose = 'rent' AND segment = 'residential' AND id % 3 = 0;
CREATE INDEX idx_listings_managed ON listings (managed, city_slug, purpose);
