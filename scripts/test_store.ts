/**
 * Exercise the Postgres backend against an in-process Postgres (pglite):
 * run the real migrations, then every Collection operation on every table.
 * Needs no database server. Run: npx tsx scripts/test_store.ts
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { MIGRATIONS_DIR, docCollection, type DocDb } from "../server/db/postgres";
import type { Budget, User } from "../server/db/store";

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
};

const client = new PGlite();
const db = drizzle(client);
await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
console.log("migrations applied");

const tables = await client.query<{ table_name: string }>(
  "select table_name from information_schema.tables where table_schema='public' order by 1"
);
console.log("tables:", tables.rows.map((r) => r.table_name).join(", "));

const users = docCollection(db as unknown as DocDb, "users");
const u: User = { id: "usr_1", email: "a@tamhub.com", name: "A", role: "user", passwordHash: "", createdAt: "2026-10-18" };
await users.insert(u);
assert((await users.get("usr_1"))?.email === "a@tamhub.com", "get after insert");
await users.update("usr_1", { role: "admin", picture: "http://x/y.png" });
const got = await users.get("usr_1");
assert(got?.role === "admin" && got.picture === "http://x/y.png" && got.email === "a@tamhub.com", "update merges patch");
assert((await users.find((x) => x.role === "admin")).length === 1, "find with predicate");
assert((await users.all()).length === 1, "all");
assert((await users.remove("usr_1")) === true, "remove");
assert((await users.remove("usr_1")) === false, "remove twice is false");
assert((await users.get("usr_1")) === undefined, "gone after remove");

const budgets = docCollection(db as unknown as DocDb, "budgets");
const b: Budget = {
  id: "bud_1", userId: "usr_1", userEmail: "a@tamhub.com",
  project: { title: "T", client: "C", projectType: "award", description: "d" },
  lines: [{ ref: "W1", section: "Event Management", name: "LED", unit: "sqm", qty: 30, unitPrice: 450, sourceType: "database", sourceRef: "x" }],
  totals: { base: 13500, fee: 2025, grand: 15525, vat: 2328.75, total: 17853.75 },
  createdAt: "2026-10-18", updatedAt: "2026-10-18",
};
await budgets.insert(b);
const back = await budgets.get("bud_1");
assert(back?.lines[0].unitPrice === 450 && back.totals.total === 17853.75, "nested JSON round-trips");

// Idempotent migrations: running them again must be a no-op.
await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
console.log("all store checks passed");
await client.close();
