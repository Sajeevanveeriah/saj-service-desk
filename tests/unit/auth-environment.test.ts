import { afterEach, describe, expect, it, vi } from "vitest";

const validSecret = "production-auth-secret-with-at-least-32-characters";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("authentication environment guards", () => {
  it("rejects a placeholder production secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "short");
    vi.stubEnv("BETTER_AUTH_URL", "https://service.example");
    await expect(import("@/infrastructure/auth/auth")).rejects.toThrow("BETTER_AUTH_SECRET");
  });

  it("rejects plain HTTP for a deployed production URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", validSecret);
    vi.stubEnv("BETTER_AUTH_URL", "http://service.example");
    await expect(import("@/infrastructure/auth/auth")).rejects.toThrow("HTTPS");
  });

  it("permits the explicit localhost-only production smoke override", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", validSecret);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("ALLOW_INSECURE_LOCAL_PRODUCTION", "true");
    await expect(import("@/infrastructure/auth/auth")).resolves.toHaveProperty("auth");
  });
});
