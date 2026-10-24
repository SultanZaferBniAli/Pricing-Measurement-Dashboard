/**
 * Postgres schema (Drizzle).
 *
 * One table per collection. Each row keeps its full document in `doc` (JSONB),
 * with the identifiers and timestamps the app sorts and filters on as real
 * columns. This mirrors the JSON store exactly, so both backends behave the
 * same, and it is still queryable in SQL for reporting. Splitting the
 * documents into normalised columns is a later, additive migration.
 */
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const docTable = (name: string) =>
  pgTable(
    name,
    {
      id: text("id").primaryKey(),
      doc: jsonb("doc").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index(`${name}_updated_at_idx`).on(t.updatedAt)]
  );

export const users = docTable("users");
export const budgets = docTable("budgets");
export const observations = docTable("observations");
export const aiSessions = docTable("ai_sessions");
export const usage = docTable("usage_events");
export const sessions = docTable("sessions");

export const TABLES = { users, budgets, observations, aiSessions, usage, sessions } as const;
