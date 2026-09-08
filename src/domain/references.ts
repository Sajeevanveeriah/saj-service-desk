export function requestReference(sequence: number): string { return `REQ-${sequence.toString(36).toUpperCase().padStart(6, "0")}`; }
export function assertDemoDatabase(databaseUrl: string): void { if (!/(demo|test|localhost|127\.0\.0\.1)/i.test(databaseUrl)) throw new Error("Demo operation requires a local test or demo database"); }
