ALTER TABLE quotes ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_id integer;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_terms_hash text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_quote_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_quote_unique_idx ON jobs (source_quote_id) WHERE source_quote_id IS NOT NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS allocated_cents integer NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS unapplied_cents integer NOT NULL DEFAULT 0;
ALTER TABLE document_sequences ALTER COLUMN document_type TYPE text;

CREATE TABLE IF NOT EXISTS payment_allocations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id integer NOT NULL,
  invoice_id integer NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, invoice_id)
);
CREATE INDEX IF NOT EXISTS payment_allocations_invoice_idx ON payment_allocations (invoice_id);

ALTER TABLE outbox ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS lease_token text;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS sent_at timestamptz;

CREATE INDEX IF NOT EXISTS jobs_customer_idx ON jobs (customer_id);
CREATE INDEX IF NOT EXISTS quotes_customer_idx ON quotes (customer_id);
CREATE INDEX IF NOT EXISTS quote_lines_quote_idx ON quote_lines (quote_id);
CREATE INDEX IF NOT EXISTS invoices_job_idx ON invoices (job_id);
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS attachments_customer_idx ON attachments (customer_id);
CREATE INDEX IF NOT EXISTS attachments_request_idx ON attachments (request_id);
CREATE INDEX IF NOT EXISTS tickets_customer_idx ON tickets (customer_id);
CREATE INDEX IF NOT EXISTS messages_ticket_idx ON messages (ticket_id);
