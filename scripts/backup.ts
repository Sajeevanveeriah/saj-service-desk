import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const target = process.argv[2] ?? "saj-service-desk-backup.sql";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
await run("pg_dump", ["--format=custom", "--file", target, process.env.DATABASE_URL]);
console.log(`Database backup written to ${target}`);
