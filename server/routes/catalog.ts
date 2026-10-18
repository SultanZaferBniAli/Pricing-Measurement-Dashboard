import { Router } from "express";
import { requireAuth } from "../auth";
import { catalogMeta, searchCatalog, searchPastProjects, searchVendorQuotes } from "../pricing/catalog";
import { collection } from "../db/store";

export const catalogRouter = Router();
catalogRouter.use(requireAuth);

catalogRouter.get("/meta", async (_req, res) => {
  res.json({
    ...catalogMeta,
    observations: (await collection("observations").all()).length,
    savedBudgets: (await collection("budgets").all()).length,
  });
});

catalogRouter.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ catalog: [], vendor: [], past: [] });
  res.json({
    catalog: searchCatalog(q, undefined, 10),
    vendor: searchVendorQuotes(q, 8),
    past: await searchPastProjects(q, undefined, 10),
  });
});
