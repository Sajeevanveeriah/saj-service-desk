import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/infrastructure/database/client";
import { acceptQuoteToJob, allocateDocumentNumber, recordConfirmedPayment } from "@/infrastructure/database/operations";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("transactional quote and payment workflow", () => {
  let customerId = 0;
  let quoteId = 0;
  let invoiceId = 0;

  beforeAll(async () => {
    const customer = await pool.query<{ id: number }>(
      "INSERT INTO customers (kind, name, email) VALUES ('individual', 'Integration Customer', 'workflow@example.test') RETURNING id",
    );
    customerId = customer.rows[0]?.id ?? 0;
    const validUntil = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const quote = await pool.query<{ id: number }>(
      `INSERT INTO quotes (job_id, customer_id, version, reference, status, valid_until, terms_snapshot, totals)
       VALUES (NULL, $1, 2, $2, 'issued', $3, $4::jsonb, $5::jsonb) RETURNING id`,
      [customerId, `IT-Q-${Date.now()}`, validUntil, JSON.stringify({ paymentTerms: "Due 14 days" }), JSON.stringify({ grossCents: 1000 })],
    );
    quoteId = quote.rows[0]?.id ?? 0;
  });

  afterAll(async () => {
    if (invoiceId) {
      await pool.query("DELETE FROM payment_allocations WHERE invoice_id = $1", [invoiceId]);
      await pool.query("DELETE FROM payments WHERE invoice_id = $1", [invoiceId]);
      await pool.query("DELETE FROM invoices WHERE id = $1", [invoiceId]);
    }
    await pool.query("DELETE FROM jobs WHERE source_quote_id = $1", [quoteId]);
    await pool.query("DELETE FROM quotes WHERE id = $1", [quoteId]);
    await pool.query("DELETE FROM customers WHERE id = $1", [customerId]);
    await pool.query("DELETE FROM document_sequences WHERE document_type LIKE 'integration-%'");
    await pool.end();
  });

  it("accepts the exact quote version once under concurrent retries", async () => {
    const input = { quoteId, customerId, acceptedBy: "customer-session-1", terms: "Due 14 days" };
    const jobs = await Promise.all([acceptQuoteToJob(pool, input), acceptQuoteToJob(pool, input)]);
    expect(new Set(jobs).size).toBe(1);
    const count = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM jobs WHERE source_quote_id = $1", [quoteId]);
    expect(count.rows[0]?.count).toBe("1");
  });

  it("allocates unique document numbers concurrently", async () => {
    const type = `integration-${Date.now()}`;
    const numbers = await Promise.all(Array.from({ length: 8 }, () => allocateDocumentNumber(pool, type, "INV-TEST")));
    expect(new Set(numbers).size).toBe(8);
    expect(numbers.sort()).toEqual(Array.from({ length: 8 }, (_, index) => `INV-TEST-${String(index + 1).padStart(5, "0")}`));
  });

  it("records partial payment, overpayment, fees and duplicate provider references once", async () => {
    const job = await pool.query<{ id: number }>("SELECT id FROM jobs WHERE source_quote_id = $1", [quoteId]);
    const invoice = await pool.query<{ id: number }>(
      `INSERT INTO invoices
        (job_id, quote_id, number, status, net_cents, gst_cents, gross_cents, customer_snapshot, business_snapshot, terms_snapshot, issued_at)
       VALUES ($1, $2, $3, 'issued', 909, 91, 1000, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, now()) RETURNING id`,
      [job.rows[0]?.id, quoteId, `IT-INV-${Date.now()}`],
    );
    invoiceId = invoice.rows[0]?.id ?? 0;
    const first = await recordConfirmedPayment(pool, {
      invoiceId, provider: "manual", externalReference: `PAY-A-${Date.now()}`,
      grossCents: 400, feeCents: 12, currency: "AUD", paidAt: new Date(),
    });
    expect(first).toMatchObject({ allocationCents: 400, overpaymentCents: 0, duplicate: false });
    const reference = `PAY-B-${Date.now()}`;
    const second = await recordConfirmedPayment(pool, {
      invoiceId, provider: "manual", externalReference: reference,
      grossCents: 700, feeCents: 21, currency: "AUD", paidAt: new Date(),
    });
    expect(second).toMatchObject({ allocationCents: 600, overpaymentCents: 100, duplicate: false });
    const duplicate = await recordConfirmedPayment(pool, {
      invoiceId, provider: "manual", externalReference: reference,
      grossCents: 700, feeCents: 21, currency: "AUD", paidAt: new Date(),
    });
    expect(duplicate).toMatchObject({ paymentId: second.paymentId, duplicate: true });
    const state = await pool.query<{ status: string; allocated_cents: number }>("SELECT status, allocated_cents FROM invoices WHERE id = $1", [invoiceId]);
    expect(state.rows[0]).toEqual({ status: "paid", allocated_cents: 1000 });
  });
});
