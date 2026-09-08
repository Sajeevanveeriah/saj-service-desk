import { describe, expect, it } from "vitest";
import { Client } from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("PostgreSQL persistence", () => {
  it("persists records across connections", async () => {
    const first = new Client({ connectionString: databaseUrl });
    const second = new Client({ connectionString: databaseUrl });
    await first.connect();
    await second.connect();
    await first.query("CREATE TABLE IF NOT EXISTS persistence_probe (value text NOT NULL)");
    await first.query("INSERT INTO persistence_probe(value) VALUES ($1)", ["persisted"]);
    const result = await second.query<{ value: string }>("SELECT value FROM persistence_probe WHERE value = $1", ["persisted"]);
    expect(result.rows[0]?.value).toBe("persisted");
    await first.query("DELETE FROM persistence_probe WHERE value = $1", ["persisted"]);
    await first.end();
    await second.end();
  });
});
