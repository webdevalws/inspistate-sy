-- Content version (docs/functions/admin/desc.md, item 125). Additive only: one new table with one row.
-- Every admin save of a project or locality bumps v; each Worker instance reads it once per request (primary-key
-- lookup) and drops its 5-minute caches when it has changed, so admin edits show at once on every instance.
CREATE TABLE content_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  v INTEGER NOT NULL
);
INSERT INTO content_version (id, v) VALUES (1, 0);
