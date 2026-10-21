-- Orders/requests for paid and document services (title search, e-stamped rent agreement,
-- rent receipts, valuation reports). Payment integration updates status later.
CREATE TABLE service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('title-search', 'rent-agreement', 'rent-receipt', 'valuation-report')),
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  details TEXT NOT NULL DEFAULT '{}',   -- JSON, shape depends on kind
  amount INTEGER NOT NULL DEFAULT 0,    -- rupees, after discount
  coupon TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'awaiting_payment', 'paid', 'in_progress', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_orders_kind ON service_orders (kind, created_at DESC);
CREATE INDEX idx_orders_user ON service_orders (user_id);
