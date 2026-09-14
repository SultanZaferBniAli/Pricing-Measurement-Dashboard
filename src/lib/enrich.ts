/**
 * Layer research-based pricing (flights + ground transport) onto the parsed
 * scope catalog. Applied once when data loads (store init) and again on any
 * admin re-upload, so the bundled data and re-parsed data behave identically.
 */
import {
  CONTINGENCY_BASIS,
  CONTINGENCY_NOTES,
  DERIVED_MATCH,
  DERIVED_PRICING,
  DERIVED_SOURCE,
  RESEARCH_GAP_PRICING,
} from "../data/derivedPricing";
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
    // 1) fill in benchmark prices on matching flight lines, composites derived
    //    from the Pricing Master, and the contingency lines' percentage basis
    let items = section.items.map((it) => {
      const research = FLIGHT_PRICING[it.id] ?? RESEARCH_GAP_PRICING[it.id];
      if (research) {
        return {
          ...it,
          unitPrice: research.price,
          isPriced: true,
          priceSource: RESEARCH_SOURCE,
          matchStatus: RESEARCH_MATCH,
          mappingNote: research.note,
          defaultQty: it.defaultQty || 1,
        };
      }

      const derived = DERIVED_PRICING[it.id];
      if (derived) {
        return {
          ...it,
          unitPrice: derived.price,
          isPriced: true,
          priceSource: DERIVED_SOURCE,
          matchStatus: DERIVED_MATCH,
          mappingNote: derived.note,
          defaultQty: it.defaultQty || 1,
        };
      }

      const basis = CONTINGENCY_BASIS[it.id];
      if (basis) {
        // Stays isPriced: false. A contingency has no rate until the user sets
        // one, so it must keep behaving like an unpriced line in the totals.
        return {
          ...it,
          percentBasis: basis,
          mappingNote: CONTINGENCY_NOTES[it.id] ?? it.mappingNote,
          defaultQty: 1,
        };
      }

      return it;
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
