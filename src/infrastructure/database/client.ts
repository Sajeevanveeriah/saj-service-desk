import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://saj_service_desk:local-development-only@127.0.0.1:5432/saj_service_desk" });
export const db = drizzle(pool, { schema });
