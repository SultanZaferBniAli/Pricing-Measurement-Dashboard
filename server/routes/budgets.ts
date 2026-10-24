/**
 * Saved budgets, and the learning loop: every priced line of a saved budget
 * becomes a price observation that search_past_projects can find next time.
 */
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { collection, newId, type Budget, type BudgetLine, type PriceObservation } from "../db/store";
import { logUsage } from "./usage";

export const budgetsRouter = Router();
budgetsRouter.use(requireAuth);

const Line = z.object({
  ref: z.string(),
  section: z.string(),
  name: z.string(),
  unit: z.string(),
  qty: z.number(),
  unitPrice: z.number().nullable(),
  sourceType: z.enum(["database", "similar_project", "benchmark", "manual"]),
  sourceRef: z.string().default(""),
  matchedItemId: z.string().nullable().optional(),
  confidence: z.number().optional(),
  rationale: z.string().optional(),
  userAdjusted: z.boolean().optional(),
  aiUnitPrice: z.number().nullable().optional(),
  aiQty: z.number().optional(),
});
const Body = z.object({
  id: z.string().optional(),
  project: z.object({
    title: z.string(), client: z.string(), projectType: z.string(),
    startDate: z.string().optional(), endDate: z.string().optional(), durationMonths: z.number().optional(),
    location: z.string().optional(), description: z.string().default(""), rfpReference: z.string().optional(),
  }),
  lines: z.array(Line),
  totals: z.object({ base: z.number(), fee: z.number(), grand: z.number(), vat: z.number(), total: z.number() }),
  aiSessionId: z.string().nullable().optional(),
});

async function observe(b: Budget, createdBy: string) {
  const obs = collection("observations");
  // Replace this budget's earlier observations so a re-save does not double count.
  for (const o of await obs.find((o) => o.budgetId === b.id)) await obs.remove(o.id);
  for (const l of b.lines) {
    if (l.unitPrice == null || l.unitPrice <= 0) continue;
    const row: PriceObservation = {
      id: newId("obs"), budgetId: b.id, project: b.project.title, client: b.project.client,
      projectType: b.project.projectType, date: b.updatedAt.slice(0, 10), item: l.name, section: l.section,
      unit: l.unit, qty: l.qty, unitPrice: l.unitPrice, sourceType: l.sourceType, userAdjusted: Boolean(l.userAdjusted),
      matchedItemId: l.matchedItemId ?? null, createdBy,
    };
    await obs.insert(row);
  }
}

/** Who owns a budget, as the UI shows it: name and photo, looked up live. */
export async function ownerOf(userId: string, fallbackEmail: string) {
  const u = await collection("users").get(userId);
  return { userName: u?.name ?? fallbackEmail.split("@")[0], userPicture: u?.picture ?? null };
}

budgetsRouter.get("/", async (req, res) => {
  const all = await collection("budgets").all();
  const mine = req.user.role === "admin" ? all : all.filter((b) => b.userId === req.user.id);
  const rows = await Promise.all(
    mine.map(async ({ lines, ...b }) => ({ ...b, ...(await ownerOf(b.userId, b.userEmail)), lineCount: lines.length }))
  );
  res.json({ budgets: rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
});

budgetsRouter.get("/:id", async (req, res) => {
  const b = await collection("budgets").get(req.params.id);
  if (!b || (b.userId !== req.user.id && req.user.role !== "admin")) return res.status(404).json({ error: "Budget not found" });
  res.json({ budget: b });
});

budgetsRouter.post("/", async (req, res) => {
  const body = Body.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid budget", issues: body.error.issues });
  const now = new Date().toISOString();
  const budgets = collection("budgets");
  const existing = body.data.id ? await budgets.get(body.data.id) : undefined;
  if (existing && existing.userId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Not your budget" });
  const budget: Budget = {
    id: existing?.id ?? newId("bud"),
    userId: existing?.userId ?? req.user.id,
    userEmail: existing?.userEmail ?? req.user.email,
    project: body.data.project,
    lines: body.data.lines as BudgetLine[],
    totals: body.data.totals,
    aiSessionId: body.data.aiSessionId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing) await budgets.update(budget.id, budget);
  else await budgets.insert(budget);
  await observe(budget, req.user.email);
  logUsage({ userId: req.user.id, userEmail: req.user.email, action: "budget_saved", projectTitle: budget.project.title, client: budget.project.client, total: budget.totals.total, budgetId: budget.id, sessionId: budget.aiSessionId ?? undefined });
  const observations = (await collection("observations").find((o) => o.budgetId === budget.id)).length;
  res.status(existing ? 200 : 201).json({ budget, observations });
});

budgetsRouter.delete("/:id", async (req, res) => {
  const b = await collection("budgets").get(req.params.id);
  if (!b || (b.userId !== req.user.id && req.user.role !== "admin")) return res.status(404).json({ error: "Budget not found" });
  const obs = collection("observations");
  for (const o of await obs.find((o) => o.budgetId === b.id)) await obs.remove(o.id);
  await collection("budgets").remove(b.id);
  res.json({ ok: true });
});
