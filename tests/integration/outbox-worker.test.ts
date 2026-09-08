import { afterAll, describe, expect, it } from "vitest";
import { pool } from "@/infrastructure/database/client";
import { processDatabaseOutboxOnce } from "@/infrastructure/notifications/worker";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("database outbox worker", () => {
  const dedupeKey = `worker-integration-${Date.now()}`;

  afterAll(async () => {
    await pool.query("DELETE FROM outbox WHERE dedupe_key = $1", [dedupeKey]);
    await pool.end();
  });

  it("delivers through the local catcher and records the durable sent state", async () => {
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = "1025";
    process.env.SMTP_FROM = "Saj Service Desk <no-reply@localhost>";
    process.env.LIVE_EMAIL_ENABLED = "false";
    await pool.query("DELETE FROM outbox WHERE payload->>'email' LIKE '%@example.test'");
    await pool.query(
      "INSERT INTO outbox (dedupe_key, type, payload) VALUES ($1, 'request_acknowledgement', $2::jsonb)",
      [dedupeKey, JSON.stringify({ reference: "SR-INTEGRATION", email: "mailpit@example.test" })],
    );

    await expect(processDatabaseOutboxOnce()).resolves.toBe(1);
    const row = await pool.query<{ status: string; attempts: number; sent_at: Date | null }>(
      "SELECT status, attempts, sent_at FROM outbox WHERE dedupe_key = $1",
      [dedupeKey],
    );
    expect(row.rows[0]?.status).toBe("sent");
    expect(row.rows[0]?.attempts).toBe(0);
    expect(row.rows[0]?.sent_at).toBeInstanceOf(Date);
    await pool.query("DELETE FROM outbox WHERE dedupe_key = $1", [dedupeKey]);
    await expect(processDatabaseOutboxOnce()).resolves.toBe(0);
  });

  it("records delivery failures for unsupported messages", async () => {
    const failureKey = `${dedupeKey}-failure`;
    await pool.query(
      "INSERT INTO outbox (dedupe_key, type, payload) VALUES ($1, 'unsupported', '{}'::jsonb)",
      [failureKey],
    );
    await expect(processDatabaseOutboxOnce()).resolves.toBe(0);
    const row = await pool.query<{ status: string; attempts: number; last_error: string }>(
      "SELECT status, attempts, last_error FROM outbox WHERE dedupe_key = $1",
      [failureKey],
    );
    expect(row.rows[0]).toMatchObject({ status: "pending", attempts: 1 });
    expect(row.rows[0]?.last_error).toContain("Unsupported notification type");
    await pool.query("DELETE FROM outbox WHERE dedupe_key = $1", [failureKey]);
  });
});
