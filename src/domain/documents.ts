import { cents, Cents, grossFromNet, lineTotal } from "./money";
export interface QuoteLine { description: string; quantity: number; unitCents: Cents; discountCents?: Cents; }
export interface Totals { net: Cents; gst: Cents; gross: Cents; }
export function calculateTotals(lines: readonly QuoteLine[], gstRate = 10): Totals { const net = lines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unitCents, line.discountCents ?? cents(0)), 0); const gross = grossFromNet(cents(net), gstRate); return { net: cents(net), gst: cents(gross - net), gross }; }
export function nextDocumentNumber(prefix: string, sequence: number): string { if (!/^[-A-Z0-9]+$/.test(prefix) || !Number.isInteger(sequence) || sequence < 1) throw new Error("Invalid document sequence"); return `${prefix}-${String(sequence).padStart(5, "0")}`; }
