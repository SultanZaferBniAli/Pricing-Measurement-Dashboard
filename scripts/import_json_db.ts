/**
 * Copy the local JSON database into Postgres, once, when going live.
 *
 *   DATABASE_URL=postgresql://... npx tsx scripts/import_json_db.ts [path/to/db.json]
 *
 * Rows that already exist (same id) are left alone, so it is safe to re-run.
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "../server/config";
import { openStore, type TableName, type Tables } from "../server/db/store";

if (!config.DATABASE_URL) {
  console.error("Set DATABASE_URL to the Postgres database to import into.");
  process.exit(1);
}
const file = path.resolve(process.argv[2] ?? path.join(config.DATA_DIR, "db.json"));
const data = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<Tables>;
const store = await openStore();
if (store.kind !== "postgres") throw new Error("Expected the Postgres backend");

for (const name of Object.keys(data) as TableName[]) {
  if (name === "sessions") continue; // browser sessions are not worth carrying over
  const col = store.collection(name);
  let added = 0;
  for (const row of data[name] ?? []) {
    if (await col.get(row.id)) continue;
    await col.insert(row as never);
    added++;
  }
  console.log(`${name}: ${added} added, ${(data[name] ?? []).length - added} already present`);
}
await store.close();
