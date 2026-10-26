-- Admin-managed projects and localities (docs/functions/admin/desc.md). Additive only: new columns with defaults that
-- keep every existing row as it is, and one new table.
-- projects.hidden: 1 = left out of every public page (project page 404, lists, search, sitemap, compare, showcase,
-- counts). Nothing is ever deleted. description: optional "About the project" text. updated_at: last admin save.
ALTER TABLE projects ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN description TEXT;
ALTER TABLE projects ADD COLUMN updated_at TEXT;

-- Project photos in R2 (projects/<id>/<uuid>.<ext>), like listing_photos. position 1 is the cover.
CREATE TABLE project_photos (
  project_id INTEGER NOT NULL REFERENCES projects(id),
  r2_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (project_id, r2_key)
);
CREATE INDEX idx_project_photos_project ON project_photos (project_id, position);

-- localities.hidden: left out of the home page tabs, city and locality pages and the sitemap (refused while it still has
-- live listings or projects). description: shown on the locality page. photo_key: R2 key of its photo
-- (localities/<city>/<slug>/<uuid>.<ext>), used on the home page "Top Localities" card instead of the stock image.
ALTER TABLE localities ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE localities ADD COLUMN description TEXT;
ALTER TABLE localities ADD COLUMN photo_key TEXT;
