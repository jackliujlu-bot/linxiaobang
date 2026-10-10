CREATE TABLE orders(
 id uuid PRIMARY KEY, category text NOT NULL CHECK(category IN ('MEAL','TRASH')),
 pickup_area text NOT NULL CHECK(length(pickup_area) BETWEEN 1 AND 50),
 dropoff_area text NOT NULL CHECK(length(dropoff_area) BETWEEN 1 AND 50),
 deadline_at timestamptz NOT NULL, bounty_cents integer NOT NULL CHECK(bounty_cents IN (200,300)),
 status text NOT NULL CHECK(status IN ('OPEN','CLAIMED','DELIVERED','COMPLETED','CANCELLED','EXPIRED')),
 sim_status text NOT NULL CHECK(sim_status IN ('HELD','SETTLED','REFUNDED')),
 requester_id uuid NOT NULL REFERENCES users(id), assignee_id uuid REFERENCES users(id),
 dispute_open boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL, ended_at timestamptz,
 CHECK(requester_id IS DISTINCT FROM assignee_id),
 CHECK((status IN ('OPEN','CLAIMED','DELIVERED') AND sim_status='HELD' AND ended_at IS NULL) OR (status='COMPLETED' AND sim_status='SETTLED' AND ended_at IS NOT NULL) OR (status IN ('CANCELLED','EXPIRED') AND sim_status='REFUNDED' AND ended_at IS NOT NULL))
);
CREATE INDEX orders_hall ON orders(status,deadline_at);
CREATE INDEX orders_requester ON orders(requester_id,created_at DESC);
CREATE INDEX orders_assignee ON orders(assignee_id,created_at DESC);
CREATE TABLE order_private(order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE, details text NOT NULL CHECK(length(details) BETWEEN 1 AND 300));
