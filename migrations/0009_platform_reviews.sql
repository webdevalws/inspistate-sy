-- Reviews of InspiState itself (not of a project), by service line and city. Published after moderation.
-- See docs/functions/reviews/desc.md.
CREATE TABLE platform_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  service TEXT NOT NULL CHECK (service IN ('buying', 'renting', 'selling', 'home-loans', 'interiors', 'home-services', 'legal')),
  city_slug TEXT,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('published', 'pending', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_platform_reviews ON platform_reviews (status, service, city_slug, created_at DESC);
