import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LocalPrivateStorage } from "@/infrastructure/storage/local";
import { validateUpload } from "@/infrastructure/storage/validation";

describe("private local storage", () => {
  it("writes, reads and removes a private file while rejecting traversal", async () => {
    const storage = new LocalPrivateStorage(`test-results/storage-${randomUUID()}`);
    const content = new TextEncoder().encode("private evidence");
    await storage.put("requests/evidence.txt", content);
    await expect(storage.get("requests/evidence.txt")).resolves.toEqual(content);
    await expect(storage.put("requests/evidence.txt", content)).rejects.toThrow();
    await storage.remove("requests/evidence.txt");
    await expect(storage.get("requests/evidence.txt")).rejects.toThrow();
    await expect(storage.put("../outside.txt", content)).rejects.toThrow("Invalid storage key");
  });

  it("validates every permitted signature and rejects mismatches", () => {
    const cases = [
      ["application/pdf", "document.pdf", Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])],
      ["image/png", "image.png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      ["image/jpeg", "image.jpg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00])],
      ["text/plain", "notes.txt", new TextEncoder().encode("Plain service notes")],
    ] as const;
    for (const [mimeType, filename, content] of cases) {
      expect(validateUpload({ filename, mimeType, size: content.byteLength }, content).size).toBe(content.byteLength);
    }
    expect(() => validateUpload({ filename: "notes.txt", mimeType: "text/plain", size: 2 }, Uint8Array.from([0, 1]))).toThrow();
    expect(() => validateUpload({ filename: "notes.txt", mimeType: "text/plain", size: 3 }, new TextEncoder().encode("longer"))).toThrow("size");
  });
});
