export type JobStatus = "new" | "triage" | "awaiting_customer" | "quoted" | "approved" | "scheduled" | "in_progress" | "blocked" | "completed" | "cancelled";
export type QuoteStatus = "draft" | "issued" | "accepted" | "declined" | "expired" | "superseded";
export type InvoiceStatus = "draft" | "issued" | "part_paid" | "paid" | "overdue" | "void";

const transitions: Record<JobStatus, readonly JobStatus[]> = {
  new: ["triage", "cancelled"], triage: ["awaiting_customer", "quoted", "cancelled"], awaiting_customer: ["triage", "quoted", "cancelled"],
  quoted: ["approved", "awaiting_customer", "cancelled"], approved: ["scheduled", "in_progress", "cancelled"], scheduled: ["in_progress", "blocked", "cancelled"],
  in_progress: ["blocked", "completed", "cancelled"], blocked: ["in_progress", "cancelled"], completed: ["cancelled"], cancelled: ["new"],
};
export function canTransitionJob(from: JobStatus, to: JobStatus): boolean { return transitions[from].includes(to); }
export function transitionJob(from: JobStatus, to: JobStatus): JobStatus { if (!canTransitionJob(from, to)) throw new Error(`Invalid job transition: ${from} -> ${to}`); return to; }

const quoteTransitions: Record<QuoteStatus, readonly QuoteStatus[]> = { draft: ["issued", "superseded"], issued: ["accepted", "declined", "expired", "superseded"], accepted: ["superseded"], declined: [], expired: [], superseded: [] };
export function transitionQuote(from: QuoteStatus, to: QuoteStatus): QuoteStatus { if (!quoteTransitions[from].includes(to)) throw new Error(`Invalid quote transition: ${from} -> ${to}`); return to; }
export function transitionInvoice(from: InvoiceStatus, to: InvoiceStatus): InvoiceStatus {
  const allowed: Record<InvoiceStatus, readonly InvoiceStatus[]> = { draft: ["issued", "void"], issued: ["part_paid", "paid", "overdue", "void"], part_paid: ["paid", "overdue", "void"], overdue: ["part_paid", "paid", "void"], paid: [], void: [] };
  if (!allowed[from].includes(to)) throw new Error(`Invalid invoice transition: ${from} -> ${to}`); return to;
}
