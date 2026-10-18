/**
 * A small JSON-file database.
 *
 * This is the developer-version store. It keeps every collection in one file
 * under DATA_DIR and writes it back on each change. The interface is the thing
 * that matters: `collection(name)` returns get / insert / update / remove, and
 * the Postgres implementation that replaces this for deployment only has to
 * satisfy the same shape. Nothing outside this module touches the file.
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "../config";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  /** Empty for accounts that only sign in with Google. */
  passwordHash: string;
  /** Google account id (sub claim) once the person has signed in with Google. */
  googleSub?: string;
  /** Profile photo URL from Google. */
  picture?: string;
  provider?: "password" | "google";
  createdAt: string;
  lastLoginAt?: string;
}

export interface ProjectInfo {
  title: string;
  client: string;
  projectType: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
  location?: string;
  description: string;
  rfpReference?: string;
}

export type PriceSourceType = "database" | "similar_project" | "benchmark" | "manual";

export interface BudgetLine {
  ref: string;
  section: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number | null;
  sourceType: PriceSourceType;
  sourceRef: string;
  matchedItemId?: string | null;
  confidence?: number;
  rationale?: string;
  /** True when the user changed qty or price after the AI priced it. */
  userAdjusted?: boolean;
  aiUnitPrice?: number | null;
  aiQty?: number;
}

export interface Budget {
  id: string;
  userId: string;
  userEmail: string;
  project: ProjectInfo;
  lines: BudgetLine[];
  totals: { base: number; fee: number; grand: number; vat: number; total: number };
  aiSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One priced line, remembered so later estimates can lean on it. */
export interface PriceObservation {
  id: string;
  budgetId: string;
  project: string;
  client: string;
  projectType: string;
  date: string;
  item: string;
  section: string;
  unit: string;
  qty: number;
  unitPrice: number;
  sourceType: PriceSourceType;
  userAdjusted: boolean;
  matchedItemId?: string | null;
  createdBy: string;
}

export interface AiSession {
  id: string;
  userId: string;
  project: ProjectInfo;
  /** The model this conversation runs on. Fixed for the session: thinking blocks are bound to it. */
  model?: string;
  /** Full Claude conversation, append-only. */
  messages: unknown[];
  /** The latest pricing the model submitted. */
  pricing?: unknown;
  wbs?: unknown;
  createdAt: string;
  updatedAt: string;
  usage: { inputTokens: number; outputTokens: number; cacheRead: number; cacheWrite: number; turns: number };
}

export interface UsageEvent {
  id: string;
  at: string;
  userId: string;
  userEmail: string;
  action: "login" | "ai_run" | "ai_followup" | "budget_saved" | "export";
  projectTitle?: string;
  client?: string;
  total?: number;
  sessionId?: string;
  budgetId?: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface Tables {
  users: User[];
  budgets: Budget[];
  observations: PriceObservation[];
  aiSessions: AiSession[];
  usage: UsageEvent[];
}

const EMPTY: Tables = { users: [], budgets: [], observations: [], aiSessions: [], usage: [] };

const FILE = path.resolve(config.DATA_DIR, "db.json");

let tables: Tables = load();

function load(): Tables {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Tables>) };
  } catch {
    return structuredClone(EMPTY);
  }
}

let writeTimer: NodeJS.Timeout | null = null;
function scheduleWrite() {
  if (writeTimer) return;
  writeTimer = setTimeout(flush, 50);
}
export function flush() {
  writeTimer = null;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(tables, null, 1));
  fs.renameSync(tmp, FILE);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function collection<K extends keyof Tables>(name: K) {
  type Row = Tables[K][number];
  return {
    all(): Row[] {
      return tables[name] as Row[];
    },
    get(id: string): Row | undefined {
      return (tables[name] as Row[]).find((r) => (r as { id: string }).id === id);
    },
    find(pred: (r: Row) => boolean): Row[] {
      return (tables[name] as Row[]).filter(pred);
    },
    insert(row: Row): Row {
      (tables[name] as Row[]).push(row);
      scheduleWrite();
      return row;
    },
    update(id: string, patch: Partial<Row>): Row | undefined {
      const rows = tables[name] as Row[];
      const i = rows.findIndex((r) => (r as { id: string }).id === id);
      if (i < 0) return undefined;
      rows[i] = { ...rows[i], ...patch };
      scheduleWrite();
      return rows[i];
    },
    remove(id: string): boolean {
      const rows = tables[name] as Row[];
      const i = rows.findIndex((r) => (r as { id: string }).id === id);
      if (i < 0) return false;
      rows.splice(i, 1);
      scheduleWrite();
      return true;
    },
  };
}

export function dbPath(): string {
  return FILE;
}
