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

/** A signed-in browser session, kept in the database so a redeploy does not sign everyone out. */
export interface Session {
  id: string;
  userId: string;
  expires: number;
}

export interface Tables {
  users: User[];
  budgets: Budget[];
  observations: PriceObservation[];
  aiSessions: AiSession[];
  usage: UsageEvent[];
  sessions: Session[];
}
export type TableName = keyof Tables;
export type RowOf<K extends TableName> = Tables[K][number];

/**
 * What every storage backend provides for one collection. Rows are documents
 * with an `id`; the backend decides how to keep them. `find` takes a predicate
 * because every query the app makes is small; the Postgres backend loads the
 * collection and filters in memory, which is fine at TAM's scale (hundreds of
 * budgets, thousands of observations) and keeps the two backends identical.
 */
export interface Collection<Row extends { id: string }> {
  all(): Promise<Row[]>;
  get(id: string): Promise<Row | undefined>;
  find(pred: (r: Row) => boolean): Promise<Row[]>;
  insert(row: Row): Promise<Row>;
  update(id: string, patch: Partial<Row>): Promise<Row | undefined>;
  remove(id: string): Promise<boolean>;
}

export interface Store {
  kind: "json" | "postgres";
  description: string;
  collection<K extends TableName>(name: K): Collection<RowOf<K>>;
  /** Run migrations / open connections. Called once at startup. */
  init(): Promise<void>;
  close(): Promise<void>;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

let active: Store | null = null;

/** Pick the backend: Postgres when DATABASE_URL is set, else the local JSON file. */
export async function openStore(): Promise<Store> {
  if (active) return active;
  if (config.DATABASE_URL) {
    const { createPostgresStore } = await import("./postgres");
    active = await createPostgresStore(config.DATABASE_URL);
  } else {
    const { createJsonStore } = await import("./json");
    active = createJsonStore(config.DATA_DIR);
  }
  await active.init();
  return active;
}

export function store(): Store {
  if (!active) throw new Error("Store not opened yet");
  return active;
}

export function collection<K extends TableName>(name: K): Collection<RowOf<K>> {
  return store().collection(name);
}

export async function closeStore() {
  if (active) await active.close();
  active = null;
}
