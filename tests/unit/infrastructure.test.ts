import { describe, expect, it } from "vitest";
import { requireCustomerAccess } from "@/infrastructure/auth/authorisation";
import { isSessionValid } from "@/infrastructure/auth/sessions";
import { paypalMeLink, PayPalTestDouble } from "@/infrastructure/payments/paypal";
import { allocatePayment } from "@/domain/payments";
import { validateUpload } from "@/infrastructure/storage/validation";
describe("security and integrations", () => {
  it("denies cross-customer access and expired sessions", () => { expect(() => requireCustomerAccess({ userId: 1, role: "customer", customerId: 2 }, 3)).toThrow("Forbidden"); expect(isSessionValid({ userId: 1, role: "customer", expiresAt: new Date(Date.now() - 1) })).toBe(false); });
  it("creates and captures test checkout orders", () => { const paypal = new PayPalTestDouble(); const order = paypal.createOrder("INV-1", 1234); expect(paypal.capture(order.id).status).toBe("COMPLETED"); expect(paypalMeLink("https://paypal.me/saj", "INV-1", 1234)).toContain("12.34AUD"); });
  it("rejects unsafe PayPal links, invalid amounts and duplicate captures", () => {
    expect(() => paypalMeLink("http://paypal.me/saj", "INV-1", 100)).toThrow();
    expect(() => paypalMeLink("https://example.com/saj", "INV-1", 100)).toThrow();
    expect(() => paypalMeLink("https://paypal.me/saj", "INV-1", 0)).toThrow();
    expect(paypalMeLink("https://www.paypal.com/paypalme/saj", "INV-1", 100)).toBe("https://www.paypal.com/paypalme/saj");
    const paypal = new PayPalTestDouble();
    expect(() => paypal.capture("missing")).toThrow();
    const order = paypal.createOrder("INV-2", 100);
    paypal.capture(order.id);
    expect(() => paypal.capture(order.id)).toThrow();
  });
  it("allocates partial payments and records overpayments", () => { expect(allocatePayment(1500 as never, 0 as never, 1000 as never)).toEqual({ allocation: 1000, overpayment: 500 }); });
});

describe("private attachment inspection", () => {
  it("checks file signatures instead of trusting the declared MIME type", () => {
    expect(() => validateUpload(
      { filename: "payload.pdf", mimeType: "application/pdf", size: 8 },
      new TextEncoder().encode("MZscript"),
    )).toThrow("does not match");

    const pdf = new TextEncoder().encode("%PDF-1.7");
    expect(validateUpload(
      { filename: "job-note.pdf", mimeType: "application/pdf", size: pdf.byteLength },
      pdf,
    ).sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
