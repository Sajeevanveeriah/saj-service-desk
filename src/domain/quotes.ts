import { QuoteStatus, transitionQuote } from "./state-machines";

export interface QuoteVersion { id: number; jobId: number; version: number; status: QuoteStatus; customerId: number; validUntil: Date; acceptedAt?: Date; acceptedBy?: number; }

export function acceptQuote(quote: QuoteVersion, customerId: number, acceptedBy: number, now = new Date()): QuoteVersion {
  if (quote.customerId !== customerId) throw new Error("Customer does not own quote");
  if (quote.validUntil.getTime() < now.getTime()) throw new Error("Quote has expired");
  if (quote.status !== "issued") throw new Error("Only an issued quote can be accepted");
  return { ...quote, status: transitionQuote(quote.status, "accepted"), acceptedAt: now, acceptedBy };
}

export function assertQuoteImmutable(quote: QuoteVersion): void { if (quote.status === "accepted") throw new Error("Accepted quote versions are immutable"); }
