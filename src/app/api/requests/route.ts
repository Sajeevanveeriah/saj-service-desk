import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceRequestSchema } from "@/domain/validation";
import { pool } from "@/infrastructure/database/client";
import { LocalPrivateStorage } from "@/infrastructure/storage/local";
import { validateUpload } from "@/infrastructure/storage/validation";

const RATE_WINDOW_MINUTES = 15;
const RATE_LIMIT = 5;
// Shared ceiling used when the host has not named a trusted client-IP header.
const GLOBAL_RATE_LIMIT = 30;

// Only the header the hosting platform's own proxy sets can identify a client:
// for example cf-connecting-ip (Cloudflare), x-vercel-forwarded-for (Vercel) or
// x-real-ip set by a reverse proxy you run. The raw first X-Forwarded-For value
// is chosen by the caller, so it is never used on its own.
const trustedClientAddress = (request: Request): string | null => {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (!header) return null;
  const value = request.headers.get(header);
  if (!value) return null;
  // A proxy appends to X-Forwarded-For, so only its last entry is trustworthy.
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  const address = header === "x-forwarded-for" ? entries.at(-1) : entries[0];
  return address && /^[0-9A-Fa-f:.]{2,64}$/.test(address) ? address : null;
};

const clientLimit = (request: Request): { key: string; limit: number } => {
  const address = trustedClientAddress(request);
  const source = address ? `client:${address}` : "global";
  const salt = process.env.BETTER_AUTH_SECRET ?? "development-rate-limit-salt";
  return {
    key: createHash("sha256").update(`${salt}:${source}`).digest("hex"),
    limit: address ? RATE_LIMIT : GLOBAL_RATE_LIMIT,
  };
};

const requestReference = (): string => {
  const year = new Date().getFullYear();
  return `SR-${year}-${randomBytes(5).toString("hex").toUpperCase()}`;
};

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";
  const formData = contentType.includes("application/json") ? null : await request.formData();
  const raw = formData ? Object.fromEntries(formData) : await request.json();
  const attachment = formData?.get("attachment");
  const parsed = serviceRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the highlighted request details and try again." },
      { status: 400 },
    );
  }

  const database = await pool.connect();
  let storedKey: string | null = null;
  try {
    await database.query("BEGIN");
    const { key, limit } = clientLimit(request);
    await database.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
    await database.query(
      "DELETE FROM request_rate_limits WHERE occurred_at < now() - ($1 * interval '1 minute')",
      [RATE_WINDOW_MINUTES],
    );
    const count = await database.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM request_rate_limits WHERE client_key = $1",
      [key],
    );

    if (Number(count.rows[0]?.count ?? "0") >= limit) {
      await database.query("ROLLBACK");
      return NextResponse.json(
        { error: "Too many requests. Wait 15 minutes before trying again." },
        { status: 429, headers: { "Retry-After": String(RATE_WINDOW_MINUTES * 60) } },
      );
    }

    await database.query("INSERT INTO request_rate_limits (client_key) VALUES ($1)", [key]);
    let reference = requestReference();
    let requestId: number | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const inserted = await database.query<{ id: number; reference: string }>(
        `INSERT INTO service_requests
          (reference, category, description, preference, urgency, requestor_name, requestor_email, requestor_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (reference) DO NOTHING
         RETURNING id, reference`,
        [
          reference,
          parsed.data.category,
          parsed.data.description,
          parsed.data.preference,
          parsed.data.urgency,
          parsed.data.name,
          parsed.data.email.toLowerCase(),
          parsed.data.phone || null,
        ],
      );
      if (inserted.rowCount === 1) {
        requestId = inserted.rows[0]?.id ?? null;
        break;
      }
      reference = requestReference();
      if (attempt === 2) throw new Error("Could not allocate a request reference");
    }

    if (!requestId) throw new Error("Request was not created");

    if (attachment instanceof File && attachment.size > 0) {
      const bytes = new Uint8Array(await attachment.arrayBuffer());
      const validated = validateUpload(
        { filename: attachment.name, mimeType: attachment.type, size: attachment.size },
        bytes,
      );
      storedKey = `requests/${new Date().getFullYear()}/${randomBytes(16).toString("hex")}`;
      await new LocalPrivateStorage().put(storedKey, bytes);
      await database.query(
        `INSERT INTO attachments (request_id, storage_key, filename, mime_type, size, sha256)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [requestId, storedKey, validated.filename, validated.mimeType, validated.size, validated.sha256],
      );
    }

    await database.query(
      `INSERT INTO outbox (dedupe_key, type, payload)
       VALUES ($1, 'request_acknowledgement', $2::jsonb)
       ON CONFLICT (dedupe_key) DO NOTHING`,
      [`request-ack:${reference}`, JSON.stringify({ reference, email: parsed.data.email.toLowerCase() })],
    );
    await database.query("COMMIT");
    return NextResponse.json({ reference }, { status: 201 });
  } catch (error) {
    await database.query("ROLLBACK");
    if (storedKey) await new LocalPrivateStorage().remove(storedKey).catch(() => undefined);
    const attachmentRejected = error instanceof Error && error.message.startsWith("Attachment");
    return NextResponse.json(
      { error: attachmentRejected
        ? "The attachment is not a permitted PDF, PNG, JPG or plain-text file."
        : "The request could not be saved. Your details were not sent. Try again." },
      { status: attachmentRejected ? 400 : 500 },
    );
  } finally {
    database.release();
  }
}
