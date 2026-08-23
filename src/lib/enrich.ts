/**
 * Layer research-based pricing (flights + ground transport) onto the parsed
 * scope catalog. Applied once when data loads (store init) and again on any
 * admin re-upload, so the bundled data and re-parsed data behave identically.
 */
import {
  FLIGHT_PRICING,
  GROUND_TRANSPORT_ITEMS,
  RESEARCH_MATCH,
  RESEARCH_SOURCE,
} from "../data/researchPricing";
import type { ScopeData, Section } from "./types";

/** Apply flight prices and inject transport options into the sections list. */
export function applyResearchPricing(sections: Section[]): Section[] {
  return sections.map((section) => {
    // 1) fill in benchmark prices on matching flight lines
    let items = section.items.map((it) => {
      const f = FLIGHT_PRICING[it.id];
      if (!f) return it;
      return {
        ...it,
        unitPrice: f.price,
        isPriced: true,
        priceSource: RESEARCH_SOURCE,
        matchStatus: RESEARCH_MATCH,
        mappingNote: f.note,
        defaultQty: it.defaultQty || 1,
      };
    });

    // 2) append real ground-transport options to Logistics
    if (section.key === "LOGISTICS") {
      const existing = new Set(items.map((i) => i.id));
      const additions = GROUND_TRANSPORT_ITEMS.filter((i) => !existing.has(i.id));
      items = [...items, ...additions];
    }

    return { ...section, items };
  });
}

/** Enrich a full ScopeData object and recompute the catalog counts. */
export function enrichScopeData(data: ScopeData): ScopeData {
  const sections = applyResearchPricing(data.sections);
  const allItems = sections.flatMap((s) => s.items);
  const priced = allItems.filter((i) => i.isPriced).length;
  return {
    ...data,
    sections,
    meta: {
      ...data.meta,
      counts: {
        sections: sections.length,
        items: allItems.length,
        priced,
        unpriced: allItems.length - priced,
      },
    },
  };
}
