export type JobStatus = 'New' | 'Triage' | 'Awaiting customer' | 'Quoted' | 'Approved' | 'Scheduled' | 'In progress' | 'Blocked' | 'Completed' | 'Cancelled';
export type Job = { id: string; customer: string; summary: string; status: JobStatus; priority: string; due: string; amount: string };
export type ServiceDeskState = 'loading' | 'empty' | 'error' | 'success' | 'expired';
