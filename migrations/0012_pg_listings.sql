-- PG / co-living details for listings of type 'PG' (rent only); NULL for every other listing type.
-- Added as nullable columns (not a table rebuild), so existing rows and foreign keys are untouched.
-- See docs/functions/post-property/desc.md.
ALTER TABLE listings ADD COLUMN pg_sharing TEXT CHECK (pg_sharing IN ('single', 'double', 'triple'));
ALTER TABLE listings ADD COLUMN pg_for TEXT CHECK (pg_for IN ('men', 'women', 'any'));
ALTER TABLE listings ADD COLUMN pg_food INTEGER CHECK (pg_food IN (0, 1));
