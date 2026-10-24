/**
 * The Postgres backend. Used whenever DATABASE_URL is set (the deployed app).
 * Migrations in server/db/migrations run at startup, so a fresh database is
 * ready without manual steps and a schema change ships with the code.
 */
import { eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { TABLES, users } from "./schema";

/** Every collection table has the same columns, so one table type covers them all. */
type DocTable = typeof users;
import type { Collection, RowOf, Store, TableName } from "./store";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = path.resolve(here, "migrations");

/** Any Drizzle Postgres database with the same query surface (pg in production, pglite in tests). */
export type DocDb = Pick<NodePgDatabase, "select" | "insert" | "update" | "delete">;

export function docCollection<K extends TableName>(db: DocDb, name: K): Collection<RowOf<K>> {
  type Row = RowOf<K>;
  const table = TABLES[name] as DocTable;
  return {
    async all() {
      const rows = await db.select({ doc: table.doc }).from(table);
      return rows.map((r) => r.doc as Row);
    },
    async get(id) {
      const rows = await db.select({ doc: table.doc }).from(table).where(eq(table.id, id)).limit(1);
      return rows[0]?.doc as Row | undefined;
    },
    async find(pred) {
      const rows = await db.select({ doc: table.doc }).from(table);
      return rows.map((r) => r.doc as Row).filter(pred);
    },
    async insert(row) {
      await db.insert(table).values({ id: row.id, doc: row });
      return row;
    },
    async update(id, patch) {
      const current = await this.get(id);
      if (!current) return undefined;
      const next = { ...current, ...patch } as Row;
      await db.update(table).set({ doc: next, updatedAt: new Date() }).where(eq(table.id, id));
      return next;
    },
    async remove(id) {
      const deleted = await db.delete(table).where(eq(table.id, id)).returning({ id: table.id });
      return deleted.length > 0;
    },
  };
}

export async function createPostgresStore(url: string): Promise<Store> {
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzle(pool);
  const safeUrl = url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
  return {
    kind: "postgres",
    description: safeUrl,
    collection: (name) => docCollection(db, name),
    async init() {
      await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    },
    async close() {
      await pool.end();
    },
  };
}
