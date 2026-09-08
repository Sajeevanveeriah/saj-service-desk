ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requestor_name text;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requestor_email text;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS requestor_phone text;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS request_id integer;

CREATE TABLE IF NOT EXISTS request_rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_key text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS request_rate_limits_client_time_idx
  ON request_rate_limits (client_key, occurred_at);

CREATE TABLE IF NOT EXISTS bootstrap_state (
  id integer PRIMARY KEY CHECK (id = 1),
  used_at timestamptz,
  owner_user_id text
);
INSERT INTO bootstrap_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
