import { createHash } from "node:crypto";
import { validateAttachment } from "@/domain/validation";

const hasPrefix = (content: Uint8Array, expected: readonly number[]): boolean =>
  expected.every((value, index) => content[index] === value);

const isPlainText = (content: Uint8Array): boolean => {
  if (content.some((value) => value === 0)) return false;
  const start = new TextDecoder().decode(content.slice(0, 128)).trimStart().toLowerCase();
  return !start.startsWith("mz") && !start.startsWith("#!") && !start.includes("<script");
};

const contentMatchesType = (mimeType: string, content: Uint8Array): boolean => {
  if (mimeType === "application/pdf") return hasPrefix(content, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (mimeType === "image/png") return hasPrefix(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/jpeg") return hasPrefix(content, [0xff, 0xd8, 0xff]);
  if (mimeType === "text/plain") return isPlainText(content);
  return false;
};

export function validateUpload(
  metadata: unknown,
  content: Uint8Array,
): { filename: string; mimeType: string; size: number; sha256: string } {
  const item = validateAttachment(metadata);
  if (item.size !== content.byteLength) throw new Error("Attachment size does not match content");
  if (!contentMatchesType(item.mimeType, content)) throw new Error("Attachment content does not match its permitted type");
  return { ...item, sha256: createHash("sha256").update(content).digest("hex") };
}
