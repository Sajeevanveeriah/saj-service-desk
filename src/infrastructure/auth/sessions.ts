import { createHash, randomBytes } from "node:crypto";
export interface Session { userId: number; role: "owner" | "admin" | "customer"; customerId?: number; expiresAt: Date; revokedAt?: Date; }
export function createSessionToken(): { token: string; hash: string } { const token = randomBytes(32).toString("base64url"); return { token, hash: hashToken(token) }; }
export function hashToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function isSessionValid(session: Session, now = new Date()): boolean { return !session.revokedAt && session.expiresAt.getTime() > now.getTime(); }
