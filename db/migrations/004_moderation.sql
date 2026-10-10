CREATE TABLE cancel_requests(
 id uuid PRIMARY KEY,order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 requester_id uuid NOT NULL REFERENCES users(id),reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 300),
 status text NOT NULL CHECK(status IN ('OPEN','ACCEPTED','REJECTED','CLOSED')),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_open_cancel ON cancel_requests(order_id) WHERE status='OPEN';
CREATE TABLE reports(
 id uuid PRIMARY KEY,order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 reporter_id uuid NOT NULL REFERENCES users(id),reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 300),
 participant boolean NOT NULL,status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED')),
 result text CHECK(result IN ('DISMISS','CANCEL','COMPLETE')),resolution_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz
);
CREATE UNIQUE INDEX one_open_report_per_user ON reports(order_id,reporter_id) WHERE status='OPEN';
CREATE INDEX reports_queue ON reports(status,created_at);
CREATE TABLE audit_events(id uuid PRIMARY KEY,admin_id uuid NOT NULL REFERENCES users(id),report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,action text NOT NULL,reason text,created_at timestamptz NOT NULL DEFAULT now());
