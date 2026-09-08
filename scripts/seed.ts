import { db, pool } from "../src/infrastructure/database/client";
import { demoMarker, settings } from "../src/infrastructure/database/schema";
await db.insert(settings).values({ legalName: "Demo business - replace during setup", abn: "00000000000", gstStatus: "unconfirmed", contactEmail: "demo@example.invalid" });
await db.insert(demoMarker).values({ isDemo: true });
await pool.end();
console.log("Demo seed applied. Records are explicitly marked as demo.");
