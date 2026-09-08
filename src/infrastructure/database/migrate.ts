import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "@/infrastructure/auth/auth";
import { pool } from "./client";

const migrationDirectory = resolve(process.cwd(), "drizzle");
const migrationFiles = (await readdir(migrationDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));

for (const migrationFile of migrationFiles) {
  const sql = await readFile(resolve(migrationDirectory, migrationFile), "utf8");
  await pool.query(sql);
}

const authMigrations = await getMigrations(authOptions);
await authMigrations.runMigrations();
await pool.end();
console.log("Database schema applied.");
