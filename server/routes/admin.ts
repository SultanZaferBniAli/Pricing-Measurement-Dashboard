import { Router } from "express";
import { requireAdmin } from "../auth";
import { collection } from "../db/store";
import { ownerOf } from "./budgets";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

/** Who used the dashboard, what they priced, and what it came to. */
adminRouter.get("/usage", async (_req, res) => {
  const usage = (await collection("usage").all()).sort((a, b) => b.at.localeCompare(a.at));
  const budgets = await collection("budgets").all();
  const sessions = await collection("aiSessions").all();
  const users = await collection("users").all();
  const observations = (await collection("observations").all()).length;
  const perUser = users.map((u) => {
    const mine = usage.filter((e) => e.userId === u.id);
    const myBudgets = budgets.filter((b) => b.userId === u.id);
    const mySessions = sessions.filter((s) => s.userId === u.id);
    return {
      id: u.id, email: u.email, name: u.name, picture: u.picture ?? null, role: u.role, lastLoginAt: u.lastLoginAt ?? null,
      logins: mine.filter((e) => e.action === "login").length,
      aiRuns: mine.filter((e) => e.action === "ai_run").length,
      followUps: mine.filter((e) => e.action === "ai_followup").length,
      budgetsSaved: myBudgets.length,
      totalPriced: myBudgets.reduce((s, b) => s + (b.totals?.total ?? 0), 0),
      tokens: mySessions.reduce((s, x) => s + x.usage.inputTokens + x.usage.outputTokens, 0),
    };
  });
  res.json({
    summary: {
      users: users.length,
      budgets: budgets.length,
      aiRuns: usage.filter((e) => e.action === "ai_run").length,
      observations,
      totalPriced: budgets.reduce((s, b) => s + (b.totals?.total ?? 0), 0),
    },
    perUser,
    events: usage.slice(0, 300),
    budgets: (
      await Promise.all(budgets.map(async ({ lines, ...b }) => ({ ...b, ...(await ownerOf(b.userId, b.userEmail)), lineCount: lines.length })))
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  });
});
