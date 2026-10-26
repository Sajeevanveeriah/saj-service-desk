import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/infrastructure/database/client";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("owner bootstrap", () => {
  const email = `owner-bootstrap-${Date.now()}@example.test`;
  const token = "integration-bootstrap-token-123456789";

  beforeAll(async () => {
    process.env.OWNER_BOOTSTRAP_TOKEN = token;
    await pool.query("UPDATE bootstrap_state SET used_at = NULL, owner_user_id = NULL WHERE id = 1");
  });

  afterAll(async () => {
    await pool.query('DELETE FROM "user" WHERE email = ANY($1)', [[email, `public-${email}`]]);
    await pool.query("UPDATE bootstrap_state SET used_at = NULL, owner_user_id = NULL WHERE id = 1");
    await pool.end();
  });

  it("creates one owner through Better Auth and consumes the bootstrap state", async () => {
    const { POST } = await import("@/app/api/setup/bootstrap/route");
    const body = { token, name: "Saj Integration Owner", email, password: "Correct-Horse-42-Battery" };
    const first = await POST(new Request("http://localhost:3000/api/setup/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }));
    expect(first.status).toBe(201);
    const owner = await pool.query<{ role: string }>('SELECT role FROM "user" WHERE email = $1', [email]);
    expect(owner.rows[0]?.role).toBe("owner");

    const second = await POST(new Request("http://localhost:3000/api/setup/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }));
    expect(second.status).toBe(409);
  });

  it("refuses public self-registration but still lets the owner sign in", async () => {
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const authBase = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const origin = new URL(authBase).origin;
    const signUp = await POST(new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ name: "Uninvited", email: `public-${email}`, password: "Correct-Horse-42-Battery" }),
    }));
    expect(signUp.status).toBe(404);
    const created = await pool.query('SELECT 1 FROM "user" WHERE email = $1', [`public-${email}`]);
    expect(created.rowCount).toBe(0);

    const signIn = await POST(new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email, password: "Correct-Horse-42-Battery" }),
    }));
    expect(signIn.status).toBe(200);
  });
});
