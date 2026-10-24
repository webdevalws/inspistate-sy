-- Audit trail of admin actions (approve/reject listings, reviews, plans, order status, forum moderation).
-- Additive only: a new table, nothing else changes. `ip` is the admin's IP as received (not hashed), so actions
-- can be traced. See docs/functions/admin/desc.md.
CREATE TABLE admin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  action TEXT NOT NULL,   -- e.g. listing.approve, review.hide, order.status
  target TEXT NOT NULL,   -- e.g. listing #50801, order #12 → completed
  ip TEXT
);
CREATE INDEX idx_admin_audit_at ON admin_audit (at DESC);
