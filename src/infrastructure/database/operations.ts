import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { cents } from "@/domain/money";
import { allocatePayment, paymentNet } from "@/domain/payments";

const withTransaction = async <T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export interface QuoteAcceptance {
  quoteId: number;
  customerId: number;
  acceptedBy: string;
  terms: string;
  acceptedAt?: Date;
}

export const acceptQuoteToJob = async (pool: Pool, input: QuoteAcceptance): Promise<number> =>
  withTransaction(pool, async (client) => {
    const acceptedAt = input.acceptedAt ?? new Date();
    const quote = await client.query<{
      status: string;
      valid_until: string | null;
      customer_id: number | null;
      job_id: number | null;
    }>("SELECT status, valid_until, customer_id, job_id FROM quotes WHERE id = $1 FOR UPDATE", [input.quoteId]);
    const record = quote.rows[0];
    if (!record) throw new Error("Quote not found");
    if (record.customer_id !== input.customerId) throw new Error("Customer does not own quote");
    if (record.status === "accepted" && record.job_id) return record.job_id;
    if (record.status !== "issued") throw new Error("Only an issued quote can be accepted");
    if (!record.valid_until || new Date(`${record.valid_until}T23:59:59.999Z`) < acceptedAt) throw new Error("Quote has expired");

    const job = await client.query<{ id: number }>(
      `INSERT INTO jobs (customer_id, status, priority, source_quote_id)
       VALUES ($1, 'approved', 'normal', $2)
       ON CONFLICT (source_quote_id) WHERE source_quote_id IS NOT NULL
       DO UPDATE SET source_quote_id = EXCLUDED.source_quote_id
       RETURNING id`,
      [input.customerId, input.quoteId],
    );
    const jobId = job.rows[0]?.id;
    if (!jobId) throw new Error("Job was not created");
    const termsHash = createHash("sha256").update(input.terms).digest("hex");
    await client.query(
      `UPDATE quotes SET status = 'accepted', accepted_at = $1, accepted_by = NULL,
       accepted_terms_hash = $2, job_id = $3 WHERE id = $4`,
      [acceptedAt, termsHash, jobId, input.quoteId],
    );
    await client.query(
      `INSERT INTO audit_events (action, entity_type, entity_id, metadata)
       VALUES ('quote.accepted', 'quote', $1, $2::jsonb)`,
      [input.quoteId, JSON.stringify({ acceptedBy: input.acceptedBy, customerId: input.customerId, termsHash, jobId })],
    );
    return jobId;
  });

export const allocateDocumentNumber = async (pool: Pool, type: string, prefix: string): Promise<string> =>
  withTransaction(pool, async (client) => {
    const result = await client.query<{ allocated: number }>(
      `INSERT INTO document_sequences (document_type, next_value)
       VALUES ($1, 2)
       ON CONFLICT (document_type) DO UPDATE SET next_value = document_sequences.next_value + 1
       RETURNING next_value - 1 AS allocated`,
      [type],
    );
    const allocated = result.rows[0]?.allocated;
    if (!allocated) throw new Error("Document number was not allocated");
    return `${prefix}-${String(allocated).padStart(5, "0")}`;
  });

export interface ConfirmedPayment {
  invoiceId: number;
  provider: string;
  externalReference: string;
  grossCents: number;
  feeCents: number;
  currency: "AUD";
  paidAt: Date;
}

export interface PaymentResult {
  paymentId: number;
  allocationCents: number;
  overpaymentCents: number;
  duplicate: boolean;
}

export const recordConfirmedPayment = async (pool: Pool, input: ConfirmedPayment): Promise<PaymentResult> =>
  withTransaction(pool, async (client) => {
    if (input.currency !== "AUD") throw new Error("Payment currency must be AUD");
    const invoice = await client.query<{ gross_cents: number; allocated_cents: number; status: string }>(
      "SELECT gross_cents, allocated_cents, status FROM invoices WHERE id = $1 FOR UPDATE",
      [input.invoiceId],
    );
    const invoiceRecord = invoice.rows[0];
    if (!invoiceRecord || ["void", "draft"].includes(invoiceRecord.status)) throw new Error("Invoice cannot receive payment");

    const prior = await client.query<{ id: number; allocated_cents: number; unapplied_cents: number }>(
      "SELECT id, allocated_cents, unapplied_cents FROM payments WHERE provider = $1 AND external_reference = $2",
      [input.provider, input.externalReference],
    );
    if (prior.rows[0]) {
      return {
        paymentId: prior.rows[0].id,
        allocationCents: prior.rows[0].allocated_cents,
        overpaymentCents: prior.rows[0].unapplied_cents,
        duplicate: true,
      };
    }

    const balance = cents(Math.max(0, invoiceRecord.gross_cents - invoiceRecord.allocated_cents));
    const allocation = allocatePayment(cents(input.grossCents), cents(0), balance);
    const netCents = paymentNet(cents(input.grossCents), cents(input.feeCents));
    const payment = await client.query<{ id: number }>(
      `INSERT INTO payments
        (invoice_id, provider, external_reference, gross_cents, fee_cents, net_cents, status,
         paid_at, currency, allocated_cents, unapplied_cents)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9, $10)
       RETURNING id`,
      [input.invoiceId, input.provider, input.externalReference, input.grossCents, input.feeCents,
        netCents, input.paidAt, input.currency, allocation.allocation, allocation.overpayment],
    );
    const paymentId = payment.rows[0]?.id;
    if (!paymentId) throw new Error("Payment was not recorded");
    if (allocation.allocation > 0) {
      await client.query(
        "INSERT INTO payment_allocations (payment_id, invoice_id, amount_cents) VALUES ($1, $2, $3)",
        [paymentId, input.invoiceId, allocation.allocation],
      );
    }
    const newAllocated = invoiceRecord.allocated_cents + allocation.allocation;
    const newStatus = newAllocated >= invoiceRecord.gross_cents ? "paid" : "part_paid";
    await client.query("UPDATE invoices SET allocated_cents = $1, status = $2 WHERE id = $3", [newAllocated, newStatus, input.invoiceId]);
    await client.query(
      `INSERT INTO audit_events (action, entity_type, entity_id, metadata)
       VALUES ('payment.confirmed', 'payment', $1, $2::jsonb)`,
      [paymentId, JSON.stringify({ invoiceId: input.invoiceId, externalReference: input.externalReference })],
    );
    return { paymentId, allocationCents: allocation.allocation, overpaymentCents: allocation.overpayment, duplicate: false };
  });

export interface ClaimedOutboxMessage {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  leaseToken: string;
}

export const claimOutbox = async (pool: Pool): Promise<ClaimedOutboxMessage | null> =>
  withTransaction(pool, async (client) => {
    const leaseToken = randomUUID();
    const result = await client.query<{ id: number; type: string; payload: Record<string, unknown> }>(
      `WITH candidate AS (
         SELECT id FROM outbox
         WHERE status = 'pending' AND available_at <= now()
           AND (locked_until IS NULL OR locked_until < now())
         ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
       )
       UPDATE outbox SET locked_until = now() + interval '1 minute', lease_token = $1
       WHERE id = (SELECT id FROM candidate)
       RETURNING id, type, payload`,
      [leaseToken],
    );
    const row = result.rows[0];
    return row ? { id: row.id, type: row.type, payload: row.payload, leaseToken } : null;
  });
