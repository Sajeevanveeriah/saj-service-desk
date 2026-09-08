import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/infrastructure/auth/auth";
import { pool } from "@/infrastructure/database/client";

const bootstrapSchema = z.object({
  token: z.string().min(24),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

const tokenMatches = (provided: string, expected: string): boolean => {
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
};

export async function POST(request: Request): Promise<NextResponse> {
  const expectedToken = process.env.OWNER_BOOTSTRAP_TOKEN;
  const parsed = bootstrapSchema.safeParse(await request.json());
  if (!expectedToken || !parsed.success || !tokenMatches(parsed.data.token, expectedToken)) {
    return NextResponse.json({ error: "Bootstrap details were not accepted." }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const state = await client.query<{ used_at: Date | null }>(
      "SELECT used_at FROM bootstrap_state WHERE id = 1 FOR UPDATE",
    );
    if (state.rows[0]?.used_at) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Owner setup is already complete." }, { status: 409 });
    }

    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        password: parsed.data.password,
      },
    });

    await client.query('UPDATE "user" SET role = $1 WHERE id = $2', ["owner", result.user.id]);
    await client.query(
      "UPDATE bootstrap_state SET used_at = now(), owner_user_id = $1 WHERE id = 1 AND used_at IS NULL",
      [result.user.id],
    );
    await client.query("COMMIT");
    return NextResponse.json({ status: "owner-created", twoFactorRequired: true }, { status: 201 });
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    return NextResponse.json({ error: "Owner setup could not be completed." }, { status: 409 });
  } finally {
    client.release();
  }
}
