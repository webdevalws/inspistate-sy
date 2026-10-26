-- Showcase (docs/functions/admin/desc.md): the admin picks what two home page sections show, in order. Additive only:
-- one new table. With nothing picked for a section (or a city), the home page keeps its automatic choice.
-- section 'hot_projects': "Hot Selling Projects Across India" — item = project id, city_slug = ''.
-- section 'top_localities': "Top Localities in India" — item = locality slug, city_slug = the city tab.
CREATE TABLE showcase (
  section TEXT NOT NULL CHECK (section IN ('hot_projects', 'top_localities')),
  city_slug TEXT NOT NULL DEFAULT '',
  item TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (section, city_slug, item)
);
