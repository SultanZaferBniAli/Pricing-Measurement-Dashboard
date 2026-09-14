/**
 * Prices DERIVED from lines that already exist in the Pricing Master, plus the
 * two contingency lines that are a percentage rather than a rate.
 *
 * The core rule still holds: no price is invented. Every figure below is the
 * sum of real master rows, and the components are spelled out in the note so a
 * reviewer can check the arithmetic against the source workbook. Where the
 * scope file's own mapping note prescribed the formula, that formula is used
 * verbatim. Anything the master genuinely does not cover (hotels, visas,
 * permits, insurance, gates, animation) is deliberately left unpriced.
 */
import type { ScopeItem } from "../lib/types";

export const DERIVED_SOURCE = "Derived";
export const DERIVED_MATCH = "DERIVED";

/** Composite prices keyed by scope item id. */
export const DERIVED_PRICING: Record<
  string,
  { price: number; note: string }
> = {
  // Formula taken verbatim from the scope file's own mapping note.
  "event-management-venue-setup-main-stage-build-layout": {
    price: 16000,
    note:
      "Composite of Pricing Master stage lines: podium 3,500 + rigging 3,000 + flooring 5,500 + panels 4,000 = 16,000. Excludes stage dismantling (3,500), which is a separate line.",
  },
  // Formula taken verbatim from the scope file's own mapping note.
  "event-management-staffing-onsite-technical-security-cleaning-teams": {
    price: 5030,
    note:
      "Composite of three Pricing Master roles: technical support 3,500 + security guards 980 + cleaning staff 550 = 5,030. Per day, one of each role.",
  },
  // The master prices the pack's components per attendee, just not the pack.
  "marketing-branding-collateral-printed-materials-for-trips-closing-event": {
    price: 14,
    note:
      "Per-attendee pack composed from Pricing Master print lines: printed agendas 6 + folders 8 = 14. Set the quantity to the attendee count.",
  },
};

/**
 * Benchmark figures that exist in the research workbooks but were previously
 * held back. Flagged as Research, same as the flight and transport prices.
 */
export const RESEARCH_GAP_PRICING: Record<
  string,
  { price: number; note: string }
> = {
  "logistics-visa-airport-services-airport-lounge-access": {
    price: 7000,
    note:
      "Executive lounge, SAR 7,000 covering 4 lounge uses on one international itinerary (International flight research). Not in the Pricing Master.",
  },
};

/**
 * Contingency lines. These carry no price at all: they charge a percentage the
 * user chooses against the subtotal of the other selected lines. No default
 * rate is supplied, because no benchmark for one exists.
 */
export const CONTINGENCY_BASIS: Record<string, ScopeItem["percentBasis"]> = {
  "logistics-onsite-logistics-additional-transfer-contingencies": "section",
  "logistics-onsite-logistics-operational-contingency-reserve": "budget",
};

export const CONTINGENCY_NOTES: Record<string, string> = {
  "logistics-onsite-logistics-additional-transfer-contingencies":
    "Percentage of the Logistics section base, set by you. No unit rate exists for this line.",
  "logistics-onsite-logistics-operational-contingency-reserve":
    "Percentage of the whole budget base, set by you. No unit rate exists for this line.",
};
