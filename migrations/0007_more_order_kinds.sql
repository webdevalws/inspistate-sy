-- Adds litigation-search and escrow order kinds (SQLite cannot alter a CHECK constraint, so the table is rebuilt).
CREATE TABLE service_orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('title-search', 'rent-agreement', 'rent-receipt', 'valuation-report', 'litigation-search', 'escrow')),
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  amount INTEGER NOT NULL DEFAULT 0,
  coupon TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'awaiting_payment', 'paid', 'in_progress', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT INTO service_orders_new SELECT * FROM service_orders;
DROP TABLE service_orders;
ALTER TABLE service_orders_new RENAME TO service_orders;
CREATE INDEX idx_orders_kind ON service_orders (kind, created_at DESC);
CREATE INDEX idx_orders_user ON service_orders (user_id);
