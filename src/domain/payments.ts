import { Cents, balanceDue, cents } from "./money";

export interface Allocation { invoiceId: number; paymentId: number; amountCents: Cents; }
export function allocatePayment(gross: Cents, alreadyAllocated: Cents, invoiceBalance: Cents): { allocation: Cents; overpayment: Cents } {
  const available = cents(Math.max(0, gross - alreadyAllocated));
  const allocation = cents(Math.min(available, invoiceBalance));
  return { allocation, overpayment: cents(available - allocation) };
}
export function invoiceBalance(gross: Cents, allocations: readonly Cents[]): Cents { return balanceDue(gross, cents(allocations.reduce((sum, value) => sum + value, 0))); }
export function paymentNet(gross: Cents, fee: Cents): Cents { return cents(Math.max(0, gross - fee)); }
