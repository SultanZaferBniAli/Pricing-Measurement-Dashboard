/**
 * The local JSON-file backend: one file under DATA_DIR, written after every
 * change. This is what `npm run dev` uses when DATABASE_URL is not set, so a
 * laptop needs no database server. Not for shared use.
 */
import fs from "node:fs";
import path from "node:path";
import type { Collection, RowOf, Store, TableName, Tables } from "./store";

const EMPTY: Tables = { users: [], budgets: [], observations: [], aiSessions: [], usage: [], sessions: [] };

export function createJsonStore(dataDir: string): Store {
  const file = path.resolve(dataDir, "db.json");
  let tables: Tables = load();
  let timer: NodeJS.Timeout | null = null;

  function load(): Tables {
    try {
      return { ...structuredClone(EMPTY), ...(JSON.parse(fs.readFileSync(file, "utf8")) as Partial<Tables>) };
    } catch {
      return structuredClone(EMPTY);
    }
  }
  function flush() {
    timer = null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(tables, null, 1));
    fs.renameSync(tmp, file);
  }
  function schedule() {
    if (!timer) timer = setTimeout(flush, 50);
  }

  function collection<K extends TableName>(name: K): Collection<RowOf<K>> {
    type Row = RowOf<K>;
    const rows = () => tables[name] as Row[];
    return {
      async all() {
        return rows().slice();
      },
      async get(id) {
        return rows().find((r) => r.id === id);
      },
      async find(pred) {
        return rows().filter(pred);
      },
      async insert(row) {
        rows().push(row);
        schedule();
        return row;
      },
      async update(id, patch) {
        const list = rows();
        const i = list.findIndex((r) => r.id === id);
        if (i < 0) return undefined;
        list[i] = { ...list[i], ...patch };
        schedule();
        return list[i];
      },
      async remove(id) {
        const list = rows();
        const i = list.findIndex((r) => r.id === id);
        if (i < 0) return false;
        list.splice(i, 1);
        schedule();
        return true;
      },
    };
  }

  return {
    kind: "json",
    description: file,
    collection,
    async init() {
      tables = load();
    },
    async close() {
      if (timer) {
        clearTimeout(timer);
        flush();
      }
    },
  };
}
