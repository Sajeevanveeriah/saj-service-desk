export interface OutboxMessage { dedupeKey: string; type: string; payload: Record<string, unknown>; attempts: number; status: "pending" | "sent" | "failed"; }
export class InMemoryOutbox { private readonly messages = new Map<string, OutboxMessage>(); enqueue(dedupeKey: string, type: string, payload: Record<string, unknown>): OutboxMessage { const old = this.messages.get(dedupeKey); if (old) return old; const value = { dedupeKey, type, payload, attempts: 0, status: "pending" as const }; this.messages.set(dedupeKey, value); return value; } listPending(): OutboxMessage[] { return [...this.messages.values()].filter((message) => message.status === "pending"); } markSent(key: string): void { const item = this.messages.get(key); if (item) item.status = "sent"; } markFailed(key: string): void { const item = this.messages.get(key); if (item) { item.attempts += 1; item.status = item.attempts >= 5 ? "failed" : "pending"; } } }

export interface LeasedMessage extends OutboxMessage { leasedUntil?: Date; }
export class LeasedOutbox extends InMemoryOutbox {
  private readonly leases = new Map<string, Date>();
  claim(key: string, now = new Date(), leaseMs = 60_000): boolean { const lease = this.leases.get(key); if (lease && lease > now) return false; this.leases.set(key, new Date(now.getTime() + leaseMs)); return true; }
  release(key: string): void { this.leases.delete(key); }
}
