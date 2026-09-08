import type { Job } from './types';

/** Typed seam for the durable API. The parent application wires this to server routes. */
export interface ServiceDeskClient {
  listJobs(input?: { status?: string; query?: string; cursor?: string }): Promise<{ items: Job[]; nextCursor?: string }>;
  createRequest(input: { category: string; description: string; preference: string; urgency: string; name: string; email: string }): Promise<{ reference: string }>;
  transitionJob(id: string, status: Job['status'], reason?: string): Promise<Job>;
}

export type ApiState = { state: 'idle' | 'loading' | 'error' | 'success' | 'expired'; message?: string };
