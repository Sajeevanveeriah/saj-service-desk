import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const source = process.argv[2];
if (!source || !process.env.RESTORE_DATABASE_URL) throw new Error("Usage: restore <backup-file> with RESTORE_DATABASE_URL set to an isolated database");
await run("pg_restore", ["--clean", "--if-exists", "--dbname", process.env.RESTORE_DATABASE_URL, source]);
console.log("Backup restored to the explicitly supplied isolated database.");
