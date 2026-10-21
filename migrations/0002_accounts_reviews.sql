-- Accounts (phone + OTP), sessions, saved items, reviews, service requests
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE otp_codes (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,          -- unix ms
  last_sent_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE shortlists (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('listing', 'project')),
  item_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (user_id, kind, item_id)
);

CREATE TABLE saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (user_id, url)
);

ALTER TABLE listings ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE leads ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE leads ADD COLUMN kind TEXT NOT NULL DEFAULT 'enquiry';  -- enquiry | callback | view-number | brochure | service | chat

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  connectivity INTEGER CHECK (connectivity BETWEEN 1 AND 5),
  amenities INTEGER CHECK (amenities BETWEEN 1 AND 5),
  construction INTEGER CHECK (construction BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  resident_type TEXT,                    -- Owner | Tenant | Visitor
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('published', 'pending', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_reviews_project ON reviews (project_id, status);

-- Registered sale transactions shown on project pages (demo data is synthetic).
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  registered_on TEXT NOT NULL,
  tower TEXT NOT NULL,
  floor INTEGER NOT NULL,
  unit TEXT NOT NULL,
  area_sqft INTEGER NOT NULL,
  price INTEGER NOT NULL
);
CREATE INDEX idx_tx_project ON transactions (project_id, registered_on DESC);
