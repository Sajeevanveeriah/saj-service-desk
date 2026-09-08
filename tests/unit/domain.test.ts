import { describe, expect, it } from "vitest";
import { cents, grossFromNet, lineTotal } from "@/domain/money";
import { calculateTotals } from "@/domain/documents";
import { transitionJob } from "@/domain/state-machines";
import { validateAttachment } from "@/domain/validation";
describe("financial domain", () => {
  it("rounds GST half up and calculates line discounts", () => { expect(grossFromNet(cents(105))).toBe(116); expect(lineTotal(1.5, cents(1000), cents(100))).toBe(1400); });
  it("calculates itemised totals", () => { expect(calculateTotals([{ description: "Work", quantity: 1, unitCents: cents(10000) }])).toEqual({ net: 10000, gst: 1000, gross: 11000 }); });
});
describe("state and input guards", () => {
  it("rejects invalid job transitions", () => { expect(() => transitionJob("new", "completed")).toThrow(); expect(transitionJob("new", "triage")).toBe("triage"); });
  it("rejects executable uploads", () => { expect(() => validateAttachment({ filename: "virus.exe", mimeType: "application/x-msdownload", size: 10 })).toThrow(); expect(() => validateAttachment({ filename: "../x.pdf", mimeType: "application/pdf", size: 10 })).toThrow(); });
});
