import { Router } from "express";
import { requireAuth } from "../auth";
import { catalogMeta, searchCatalog, searchPastProjects, searchVendorQuotes } from "../pricing/catalog";
import { collection } from "../db/store";

export const catalogRouter = Router();
catalogRouter.use(requireAuth);

catalogRouter.get("/meta", (_req, res) => {
  res.json({ ...catalogMeta, observations: collection("observations").all().length, savedBudgets: collection("budgets").all().length });
});

catalogRouter.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json({ catalog: [], vendor: [], past: [] });
  res.json({
    catalog: searchCatalog(q, undefined, 10),
    vendor: searchVendorQuotes(q, 8),
    past: searchPastProjects(q, undefined, 10),
  });
});
