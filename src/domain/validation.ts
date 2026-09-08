import { z } from "zod";
export const attachmentSchema = z.object({ filename: z.string().min(1).max(180).refine((n) => !/[\\/\0]/.test(n), "Invalid filename"), mimeType: z.string(), size: z.number().int().positive().max(10 * 1024 * 1024) });
export const serviceRequestSchema = z.object({ category: z.string().min(1), description: z.string().min(10).max(10000), preference: z.enum(["remote", "on_site", "either"]), urgency: z.enum(["low", "normal", "high", "critical"]), email: z.string().email(), name: z.string().min(1).max(200), phone: z.string().max(40).optional() });
export const supportedAttachmentTypes = ["application/pdf", "image/jpeg", "image/png", "text/plain"] as const;
export function validateAttachment(input: unknown): { filename: string; mimeType: string; size: number } { const item = attachmentSchema.parse(input); if (!(supportedAttachmentTypes as readonly string[]).includes(item.mimeType)) throw new Error("Attachment type is not permitted"); return item; }
