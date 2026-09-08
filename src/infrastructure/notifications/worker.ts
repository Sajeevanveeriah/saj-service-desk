import nodemailer from "nodemailer";
import { z } from "zod";
import { pool } from "@/infrastructure/database/client";
import { claimOutbox, type ClaimedOutboxMessage } from "@/infrastructure/database/operations";

const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const acknowledgementSchema = z.object({ reference: z.string(), email: z.string().email() });

const deliveryFor = (message: ClaimedOutboxMessage): { to: string; subject: string; text: string } => {
  if (message.type === "request_acknowledgement") {
    const payload = acknowledgementSchema.parse(message.payload);
    return {
      to: payload.email,
      subject: `Saj Service Desk request ${payload.reference}`,
      text: `Your request was received. Reference: ${payload.reference}. Keep this reference for follow-up.`,
    };
  }
  throw new Error(`Unsupported notification type: ${message.type}`);
};

const smtpConfiguration = () => {
  const host = process.env.SMTP_HOST ?? "127.0.0.1";
  const port = Number(process.env.SMTP_PORT ?? "1025");
  const liveEnabled = process.env.LIVE_EMAIL_ENABLED === "true";
  if (!localHosts.has(host) && !liveEnabled) {
    throw new Error("Remote SMTP delivery is disabled. Set LIVE_EMAIL_ENABLED=true only after deliberate provider testing.");
  }
  return { host, port, secure: false };
};

export async function processDatabaseOutboxOnce(): Promise<number> {
  const message = await claimOutbox(pool);
  if (!message) return 0;
  try {
    const delivery = deliveryFor(message);
    const transport = nodemailer.createTransport(smtpConfiguration());
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "Saj Service Desk <no-reply@localhost>",
      ...delivery,
    });
    await pool.query(
      `UPDATE outbox SET status = 'sent', sent_at = now(), locked_until = NULL, lease_token = NULL
       WHERE id = $1 AND lease_token = $2`,
      [message.id, message.leaseToken],
    );
    return 1;
  } catch (error) {
    const details = error instanceof Error ? error.message.slice(0, 500) : "Notification failed";
    await pool.query(
      `UPDATE outbox SET attempts = attempts + 1,
         status = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE 'pending' END,
         available_at = now() + (LEAST(60, power(2, attempts + 1)) * interval '1 minute'),
         last_error = $3, locked_until = NULL, lease_token = NULL
       WHERE id = $1 AND lease_token = $2`,
      [message.id, message.leaseToken, details],
    );
    return 0;
  }
}

const runWorker = async (): Promise<void> => {
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  while (!stopping) {
    const delivered = await processDatabaseOutboxOnce();
    if (delivered === 0) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  await pool.end();
};

if (process.argv[1]?.endsWith("worker.ts")) {
  await runWorker();
}
