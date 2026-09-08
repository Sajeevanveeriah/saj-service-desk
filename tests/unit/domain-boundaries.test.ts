import { describe, expect, it } from "vitest";
import { calculateTotals, nextDocumentNumber } from "@/domain/documents";
import { cents, balanceDue, percentageOf, roundHalfUp } from "@/domain/money";
import { invoiceBalance, paymentNet } from "@/domain/payments";
import { assertQuoteImmutable, acceptQuote, type QuoteVersion } from "@/domain/quotes";
import { transitionInvoice, transitionJob, transitionQuote } from "@/domain/state-machines";
import { createSessionToken, hashToken, isSessionValid } from "@/infrastructure/auth/sessions";
import { ownsCustomer, requireRole } from "@/infrastructure/auth/authorisation";

describe("domain boundaries", () => {
  it("rejects invalid cents, percentages and document sequences", () => {
    expect(() => cents(1.5)).toThrow();
    expect(() => cents(Number.NaN)).toThrow();
    expect(roundHalfUp(-1.5)).toBe(-2);
    expect(percentageOf(cents(101), 10)).toBe(10);
    expect(balanceDue(cents(100), cents(150))).toBe(0);
    expect(() => nextDocumentNumber("bad prefix", 1)).toThrow();
    expect(() => nextDocumentNumber("INV", 0)).toThrow();
    expect(nextDocumentNumber("INV-2026", 12)).toBe("INV-2026-00012");
  });

  it("covers totals, balances and payment fee boundaries", () => {
    expect(calculateTotals([], 0)).toEqual({ net: 0, gst: 0, gross: 0 });
    expect(invoiceBalance(cents(1000), [cents(200), cents(300)])).toBe(500);
    expect(paymentNet(cents(500), cents(50))).toBe(450);
    expect(paymentNet(cents(50), cents(80))).toBe(0);
  });

  it("guards every document lifecycle", () => {
    expect(transitionJob("in_progress", "blocked")).toBe("blocked");
    expect(transitionJob("blocked", "in_progress")).toBe("in_progress");
    expect(() => transitionJob("cancelled", "completed")).toThrow();
    expect(transitionQuote("issued", "declined")).toBe("declined");
    expect(() => transitionQuote("accepted", "draft")).toThrow();
    expect(transitionInvoice("issued", "part_paid")).toBe("part_paid");
    expect(transitionInvoice("part_paid", "paid")).toBe("paid");
    expect(() => transitionInvoice("void", "issued")).toThrow();
  });

  it("records quote acceptance identity and rejects stale ownership", () => {
    const quote: QuoteVersion = { id: 1, jobId: 2, version: 3, status: "issued", customerId: 4, validUntil: new Date("2030-01-01") };
    const accepted = acceptQuote(quote, 4, 9, new Date("2029-01-01"));
    expect(accepted).toMatchObject({ status: "accepted", acceptedBy: 9 });
    expect(() => assertQuoteImmutable(accepted)).toThrow();
    expect(() => acceptQuote(quote, 5, 9)).toThrow("own");
    expect(() => acceptQuote({ ...quote, validUntil: new Date("2020-01-01") }, 4, 9)).toThrow("expired");
    expect(() => acceptQuote({ ...quote, status: "draft" }, 4, 9)).toThrow("issued");
  });

  it("creates hashed session tokens and enforces roles and ownership", () => {
    const token = createSessionToken();
    expect(token.hash).toBe(hashToken(token.token));
    expect(token.token).not.toBe(token.hash);
    expect(isSessionValid({ userId: 1, role: "owner", expiresAt: new Date(Date.now() + 60_000) })).toBe(true);
    expect(isSessionValid({ userId: 1, role: "owner", expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date() })).toBe(false);
    expect(requireRole({ userId: 1, role: "owner" }, ["owner"]).userId).toBe(1);
    expect(() => requireRole(null, ["owner"])).toThrow("Forbidden");
    expect(ownsCustomer({ userId: 1, role: "owner" }, 99)).toBe(true);
  });
});
