import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { pool } from "@/infrastructure/database/client";

const isProduction = process.env.NODE_ENV === "production";
const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET ?? "development-only-secret-change-before-production";
const localProductionOverride = process.env.ALLOW_INSECURE_LOCAL_PRODUCTION === "true"
  && ["localhost", "127.0.0.1"].includes(new URL(appUrl).hostname);

if (isProduction && (secret.length < 32 || secret.includes("development") || secret.includes("replace"))) {
  throw new Error("Production requires a non-placeholder BETTER_AUTH_SECRET of at least 32 characters.");
}

if (isProduction && !appUrl.startsWith("https://") && !localProductionOverride) {
  throw new Error("Production requires an HTTPS BETTER_AUTH_URL.");
}

export const authOptions = {
  appName: "Saj Service Desk",
  baseURL: appUrl,
  secret,
  database: pool,
  trustedOrigins: [appUrl],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
    cookieCache: { enabled: false },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "customer", input: false },
      customerId: { type: "number", required: false, input: false },
    },
  },
  advanced: {
    cookiePrefix: "saj_service_desk",
    useSecureCookies: isProduction,
    database: { joins: true },
  },
  plugins: [
    twoFactor({
      issuer: "Saj Service Desk",
      totpOptions: { digits: 6, period: 30 },
    }),
  ],
} satisfies Parameters<typeof betterAuth>[0];

export const auth = betterAuth(authOptions);
