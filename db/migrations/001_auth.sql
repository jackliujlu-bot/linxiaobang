CREATE TABLE communities(id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE users(
 id uuid PRIMARY KEY, username text UNIQUE NOT NULL CHECK(length(username) BETWEEN 3 AND 32),
 password_hash text NOT NULL, role text NOT NULL DEFAULT 'USER' CHECK(role IN ('USER','ADMIN')),
 adult_confirmed_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions(token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE login_attempts(username text PRIMARY KEY, failures integer NOT NULL, window_start timestamptz NOT NULL);
