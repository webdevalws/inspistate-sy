-- Account roles chosen at registration (user / seller / agent) and agent subscription plans.
ALTER TABLE users ADD COLUMN role TEXT CHECK (role IN ('user', 'seller', 'agent'));  -- NULL until registration is completed
ALTER TABLE users ADD COLUMN city_slug TEXT;
ALTER TABLE users ADD COLUMN company TEXT;                                           -- agents: agency / firm name

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('yearly', 'half-yearly')),
  amount INTEGER NOT NULL,                                                           -- rupees
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'active', 'cancelled')),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_subscriptions_user ON subscriptions (user_id, status);
