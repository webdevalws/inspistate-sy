-- Daily per-client counters for AI features (cost control).
CREATE TABLE ai_usage (
  client TEXT NOT NULL,        -- SHA-256 of the client IP
  feature TEXT NOT NULL,
  day TEXT NOT NULL,           -- YYYY-MM-DD (UTC)
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client, feature, day)
);
