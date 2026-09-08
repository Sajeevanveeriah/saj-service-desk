import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/infrastructure/database/client";
import { POST } from "@/app/api/requests/route";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("public request route", () => {
  const email = "zoe.unicode+integration@example.test";

  beforeAll(async () => {
    await pool.query("DELETE FROM service_requests WHERE requestor_email = $1", [email]);
    await pool.query("DELETE FROM outbox WHERE payload->>'email' = $1", [email]);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM outbox WHERE payload->>'email' = $1", [email]);
    await pool.query("DELETE FROM service_requests WHERE requestor_email = $1", [email]);
    await pool.end();
  });

  it("persists a valid Unicode request and queues one acknowledgement", async () => {
    const response = await POST(new Request("http://localhost:3000/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.44" },
      body: JSON.stringify({
        category: "Robotics, electronics and prototyping",
        description: "Diagnose the café robot sensor fault and preserve the existing controller profile.",
        preference: "on_site",
        urgency: "normal",
        name: "Zoë Nguyễn",
        email,
      }),
    }));

    expect(response.status).toBe(201);
    const result = await response.json() as { reference: string };
    expect(result.reference).toMatch(/^SR-\d{4}-[A-F0-9]{10}$/);

    const persisted = await pool.query<{ requestor_name: string }>(
      "SELECT requestor_name FROM service_requests WHERE reference = $1",
      [result.reference],
    );
    expect(persisted.rows[0]?.requestor_name).toBe("Zoë Nguyễn");

    const queued = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM outbox WHERE dedupe_key = $1",
      [`request-ack:${result.reference}`],
    );
    expect(queued.rows[0]?.count).toBe("1");
  });

  it("returns a useful validation error without writing a record", async () => {
    const response = await POST(new Request("http://localhost:3000/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.45" },
      body: JSON.stringify({ category: "", description: "short" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Check the highlighted request details and try again.",
    });
  });

  it("rejects executable content disguised as a PDF", async () => {
    const form = new FormData();
    form.set("category", "Computers and networks");
    form.set("description", "Inspect an attachment without trusting the browser MIME declaration.");
    form.set("preference", "remote");
    form.set("urgency", "normal");
    form.set("name", "Upload Test");
    form.set("email", email);
    form.set("attachment", new File([new TextEncoder().encode("MZ executable")], "evidence.pdf", { type: "application/pdf" }));

    const response = await POST(new Request("http://localhost:3000/api/requests", {
      method: "POST",
      headers: { "x-forwarded-for": "192.0.2.46" },
      body: form,
    }));

    expect(response.status).toBe(400);
  });

  it("rate-limits repeated public submissions without account enumeration", async () => {
    const body = JSON.stringify({
      category: "Computers and networks",
      description: "Repeated integration request used to verify the public endpoint limit.",
      preference: "remote",
      urgency: "normal",
      name: "Rate Limit Test",
      email,
    });
    const responses = [];
    for (let index = 0; index < 6; index += 1) {
      responses.push(await POST(new Request("http://localhost:3000/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.100" },
        body,
      })));
    }
    expect(responses.slice(0, 5).every((response) => response.status === 201)).toBe(true);
    expect(responses[5]?.status).toBe(429);
    expect(responses[5]?.headers.get("retry-after")).toBe("900");
  });
});
