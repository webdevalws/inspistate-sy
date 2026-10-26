-- "Find sellers": sellers can say they are open to working with an agent, and agents can offer to help
-- (docs/functions/agent-offers/desc.md). Additive only: one new column and one new table.
-- listings.open_to_agents: 1 when the seller opted in (off by default); only such live listings of Seller accounts are
-- shown to agents on /account/agent/find-sellers.
ALTER TABLE listings ADD COLUMN open_to_agents INTEGER NOT NULL DEFAULT 0;

-- One offer per agent per listing, ever (UNIQUE): a declined agent can't resend and an accepted one needn't.
-- Phone numbers are only shown to the other side once the seller accepts.
CREATE TABLE agent_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  agent_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  responded_at TEXT,
  UNIQUE (listing_id, agent_id)
);
CREATE INDEX idx_agent_offers_seller ON agent_offers (seller_id, status);
CREATE INDEX idx_agent_offers_agent ON agent_offers (agent_id, status);
