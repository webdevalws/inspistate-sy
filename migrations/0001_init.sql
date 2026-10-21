-- InspiState core schema
CREATE TABLE cities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  stamp_duty_pct REAL NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE localities (
  city_slug TEXT NOT NULL REFERENCES cities(slug),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  rate_per_sqft INTEGER NOT NULL,
  rent_per_sqft REAL NOT NULL,
  yoy_growth_pct REAL NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  PRIMARY KEY (city_slug, slug)
);

CREATE TABLE builders (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  founded INTEGER NOT NULL,
  hq TEXT NOT NULL,
  delivered INTEGER NOT NULL,
  ongoing INTEGER NOT NULL,
  about TEXT NOT NULL,
  hue INTEGER NOT NULL
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  city_slug TEXT NOT NULL REFERENCES cities(slug),
  locality_slug TEXT NOT NULL,
  builder_slug TEXT NOT NULL REFERENCES builders(slug),
  status TEXT NOT NULL CHECK (status IN ('New Launch', 'Under Construction', 'Ready to Move')),
  possession TEXT NOT NULL,
  rera TEXT NOT NULL,
  land_acres REAL NOT NULL,
  total_units INTEGER NOT NULL,
  towers INTEGER NOT NULL,
  floors INTEGER NOT NULL,
  rate_per_sqft INTEGER NOT NULL,
  price_min INTEGER NOT NULL,
  price_max INTEGER NOT NULL,
  bhk_label TEXT NOT NULL,
  amenities TEXT NOT NULL DEFAULT '[]',   -- JSON array
  highlights TEXT NOT NULL DEFAULT '[]',  -- JSON array
  price_trend TEXT NOT NULL DEFAULT '[]', -- JSON array of {label, rate}
  nearby TEXT NOT NULL DEFAULT '[]',      -- JSON array of {name, kind, km}
  hue INTEGER NOT NULL,
  launched_year INTEGER NOT NULL,
  UNIQUE (city_slug, slug)
);
CREATE INDEX idx_projects_city ON projects (city_slug, status);
CREATE INDEX idx_projects_builder ON projects (builder_slug);

CREATE TABLE project_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bhk INTEGER NOT NULL,
  label TEXT NOT NULL,
  carpet_sqft INTEGER NOT NULL,
  price INTEGER NOT NULL
);
CREATE INDEX idx_units_project ON project_units (project_id);

CREATE TABLE listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purpose TEXT NOT NULL CHECK (purpose IN ('buy', 'rent')),
  segment TEXT NOT NULL CHECK (segment IN ('residential', 'commercial')),
  type TEXT NOT NULL,
  bhk INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  area_sqft INTEGER NOT NULL,
  price INTEGER NOT NULL,
  city_slug TEXT NOT NULL REFERENCES cities(slug),
  locality_slug TEXT NOT NULL,
  project_id INTEGER REFERENCES projects(id),
  furnishing TEXT NOT NULL,
  posted_by TEXT NOT NULL,
  possession TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 0,
  total_floors INTEGER NOT NULL DEFAULT 0,
  facing TEXT NOT NULL DEFAULT 'East',
  age_years INTEGER NOT NULL DEFAULT 0,
  amenities TEXT NOT NULL DEFAULT '[]',
  description TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected')),
  edit_token TEXT,
  hue INTEGER NOT NULL DEFAULT 200,
  posted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_listings_search ON listings (status, city_slug, segment, purpose, price);
CREATE INDEX idx_listings_project ON listings (project_id);

CREATE TABLE listing_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_photos_listing ON listing_photos (listing_id, position);

CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  subject TEXT NOT NULL,
  page TEXT,
  listing_id INTEGER REFERENCES listings(id),
  project_id INTEGER REFERENCES projects(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_leads_created ON leads (created_at DESC);
