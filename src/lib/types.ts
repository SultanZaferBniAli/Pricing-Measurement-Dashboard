/**
 * Core domain model for the TAM Scope-Based Budget Builder.
 * These types mirror the normalized JSON produced by scripts/parse_excel.py.
 */

export type MatchStatus =
  | "EXACT"
  | "CLOSE"
  | "NOT IN MASTER"
  | string; // tolerate any raw value from the source

/** A single scope line item as parsed from the source workbook. */
export interface ScopeItem {
  id: string;
  section: string; // human label, e.g. "Marketing"
  sectionKey: string; // upper key, e.g. "MARKETING"
  subCategory: string; // grouping within a section
  name: string; // the item shown to users
  type: string; // pricing basis (Per attendee, Per day, Fixed per event…)
  defaultQty: number; // suggested quantity from the source
  unitPrice: number | null; // null => unpriced / missing price
  sourceItem: string; // Source Item (Pricing Master)
  masterCategory: string;
  masterQtyUnit: string;
  priceSource: string; // TAM / Threelines / Pricing_V1 / research
  matchStatus: MatchStatus; // EXACT / CLOSE / NOT IN MASTER
  mappingNote: string;
  isPriced: boolean; // false for GAP / NOT IN MASTER / empty price
  /**
   * Contingency lines are a percentage of a subtotal, not a unit rate, so they
   * carry no unit price at all. "section" charges against the section's own
   * priced subtotal, "budget" against the whole budget. The rate itself is left
   * to the user (no benchmark exists for it), so the line stays excluded from
   * totals until they enter one.
   */
  percentBasis?: "section" | "budget";
}

export interface Section {
  id: string;
  key: string;
  name: string;
  items: ScopeItem[];
}

export interface PricingLibraryEntry {
  type: string;
  domain: string;
  item: string;
  quantity: string;
  price: number | null;
  notes: string;
  priceSource: string;
  scalingDriver: string;
  basis: string;
  status: string;
  reviewNote: string;
}

export interface ScopeData {
  meta: {
    project: string;
    currency: string;
    feeRate: number;
    generatedFrom: string;
    counts: {
      sections: number;
      items: number;
      priced: number;
      unpriced: number;
    };
  };
  sections: Section[];
  pricingMaster: {
    library: PricingLibraryEntry[];
    gaps: string[][];
    methodology: string[][];
  };
  reference: {
    ground_transport: string[][];
    domestic_flights: Record<string, string>[];
    notes: string[];
  };
}

/** Per-item selection state kept in the store (keyed by item id). */
export interface Selection {
  qty: number;
  /** Custom price entered by the user for an otherwise-unpriced item. */
  customPrice?: number | null;
  /**
   * Contingency rate as a whole number of percent (10 means 10%). Only used by
   * items with a `percentBasis`; null until the user sets one.
   */
  percentRate?: number | null;
  /** Optional free-text note attached in the budget summary. */
  note?: string;
}

/** A fully computed line, item + selection + math, used across the UI/export. */
export interface ComputedLine {
  item: ScopeItem;
  qty: number;
  /** Effective unit price: source price, or the user's custom override. */
  unitPrice: number | null;
  baseCost: number;
  fee: number;
  totalCost: number;
  /** True when this selected line still has no usable price. */
  isUnpriced: boolean;
  customPrice?: number | null;
  note?: string;
  /** Set on contingency lines: the rate applied and the subtotal it ran against. */
  percentRate?: number | null;
  percentOfBase?: number;
}

/**
 * A budget as it stood when it was exported. Saved so the sidebar can list past
 * budgets by title and load one back for a second pass. The selections are kept
 * whole, which is what makes an entry restorable rather than just a receipt.
 */
export interface BudgetHistoryEntry {
  id: string;
  title: string;
  client: string;
  /** ISO timestamp of the export that created this entry. */
  exportedAt: string;
  projectDate: string;
  projectDescription: string;
  base: number;
  fee: number;
  grand: number;
  vat: number;
  total: number;
  itemCount: number;
  selections: Record<string, Selection>;
  /**
   * The RFP this budget was priced against, if one was analysed. Kept so a
   * later RFP can be compared against it: a budget that was actually exported
   * is a decision somebody stood behind, which makes it the most useful kind of
   * precedent. Capped when stored, since this is going into localStorage.
   */
  rfpText?: string;
  rfpFiles?: string[];
}

export interface SectionTotals {
  /** Scope cost before anything is added. */
  base: number;
  /** TAM's 15% fee on the base. */
  fee: number;
  /** base + fee. What TAM invoices before tax. */
  grand: number;
  /** 15% VAT on `grand`, because the fee is taxable too. */
  vat: number;
  /** grand + vat. The figure the client actually pays. */
  total: number;
  selectedCount: number;
  unpricedSelectedCount: number;
}
