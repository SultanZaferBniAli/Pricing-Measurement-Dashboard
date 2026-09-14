/**
 * Pricing engine - the single source of truth for all budget math.
 *
 * Business rules (from the TAM brief):
 *   Base Cost  = Qty × Unit Price
 *   Fee (15%)  = Base Cost × 0.15
 *   Total Cost = Base Cost + Fee
 *
 * Unpriced items (NOT IN MASTER / GAP / empty price) are NEVER invented.
 * They are excluded from totals unless the user supplies a custom price.
 *
 * Contingency lines are the one exception to "Base = Qty x Unit Price": they
 * have no unit rate and instead charge a user-set percentage against a subtotal
 * of the other selected lines. Because they depend on the rest of the budget,
 * they are resolved in a second pass (`resolveBudget`) after every ordinary
 * line is known. A contingency never charges against another contingency.
 */
import { FEE_RATE } from "./format";
import type {
  ComputedLine,
  ScopeItem,
  Section,
  SectionTotals,
  Selection,
} from "./types";

/** True for contingency lines, which are a % of a subtotal rather than a rate. */
export function isContingency(item: ScopeItem): boolean {
  return item.percentBasis != null;
}

/** Resolve the effective unit price: custom override wins over source price. */
export function effectiveUnitPrice(
  item: ScopeItem,
  selection?: Selection
): number | null {
  if (selection?.customPrice != null && selection.customPrice > 0) {
    return selection.customPrice;
  }
  return item.unitPrice;
}

/**
 * Compute a contingency line against an already-known subtotal.
 * Stays unpriced (and out of totals) until the user enters a rate.
 */
export function computeContingencyLine(
  item: ScopeItem,
  selection: Selection,
  basisBase: number
): ComputedLine {
  const rate = selection.percentRate ?? null;
  const priced = rate != null && rate > 0;

  const baseCost = priced ? basisBase * (rate / 100) : 0;
  const fee = baseCost * FEE_RATE;

  return {
    item,
    qty: 1,
    unitPrice: priced ? baseCost : null,
    baseCost,
    fee,
    totalCost: baseCost + fee,
    isUnpriced: !priced,
    customPrice: null,
    note: selection.note,
    percentRate: rate,
    percentOfBase: basisBase,
  };
}

/** Compute a single line's math from an item + its selection. */
export function computeLine(
  item: ScopeItem,
  selection: Selection
): ComputedLine {
  const qty = selection.qty ?? 0;
  const unitPrice = effectiveUnitPrice(item, selection);
  const priced = unitPrice != null && unitPrice > 0;

  const baseCost = priced ? qty * (unitPrice as number) : 0;
  const fee = baseCost * FEE_RATE;
  const totalCost = baseCost + fee;

  return {
    item,
    qty,
    unitPrice,
    baseCost,
    fee,
    totalCost,
    isUnpriced: !priced,
    customPrice: selection.customPrice ?? null,
    note: selection.note,
  };
}

/** Roll a set of computed lines up into base / fee / grand totals. */
export function sumLines(lines: ComputedLine[]): SectionTotals {
  return lines.reduce<SectionTotals>(
    (acc, l) => {
      acc.base += l.baseCost;
      acc.fee += l.fee;
      acc.grand += l.totalCost;
      acc.selectedCount += 1;
      if (l.isUnpriced) acc.unpricedSelectedCount += 1;
      return acc;
    },
    { base: 0, fee: 0, grand: 0, selectedCount: 0, unpricedSelectedCount: 0 }
  );
}

/** Every selected line, in section / sub-category order, grouped by section. */
export interface ResolvedBudget {
  /** All selected lines, contingencies resolved, in catalog order. */
  lines: ComputedLine[];
  /** The same lines bucketed by section key. */
  bySectionKey: Record<string, ComputedLine[]>;
}

/**
 * Resolve the whole budget in two passes.
 *
 * Pass 1 computes every ordinary line. Pass 2 computes contingency lines
 * against the priced base of pass 1, so a contingency is charged on real cost
 * only and never on another contingency.
 */
export function resolveBudget(
  sections: Section[],
  selections: Record<string, Selection>
): ResolvedBudget {
  // Pass 1: ordinary lines, remembering where each contingency belongs.
  const bySectionKey: Record<string, ComputedLine[]> = {};
  const pending: Array<{ item: ScopeItem; sectionKey: string; index: number }> = [];

  for (const section of sections) {
    const bucket: ComputedLine[] = [];
    for (const item of section.items) {
      const selection = selections[item.id];
      if (!selection) continue;
      if (isContingency(item)) {
        // Placeholder keeps catalog order; filled in during pass 2.
        pending.push({ item, sectionKey: section.key, index: bucket.length });
        bucket.push(computeContingencyLine(item, selection, 0));
      } else {
        bucket.push(computeLine(item, selection));
      }
    }
    bySectionKey[section.key] = bucket;
  }

  // Pass 2: bases drawn only from priced, non-contingency lines.
  const ordinaryBase = (lines: ComputedLine[]) =>
    lines
      .filter((l) => !isContingency(l.item) && !l.isUnpriced)
      .reduce((sum, l) => sum + l.baseCost, 0);

  const budgetBase = Object.values(bySectionKey).reduce(
    (sum, lines) => sum + ordinaryBase(lines),
    0
  );

  for (const { item, sectionKey, index } of pending) {
    const basis =
      item.percentBasis === "budget"
        ? budgetBase
        : ordinaryBase(bySectionKey[sectionKey]);
    bySectionKey[sectionKey][index] = computeContingencyLine(
      item,
      selections[item.id],
      basis
    );
  }

  const lines = sections.flatMap((s) => bySectionKey[s.key] ?? []);
  return { lines, bySectionKey };
}

/** Build computed lines for one section, with contingencies resolved. */
export function sectionLines(
  section: Section,
  selections: Record<string, Selection>,
  sections: Section[]
): ComputedLine[] {
  return resolveBudget(sections, selections).bySectionKey[section.key] ?? [];
}

/** All selected lines across every section, in section/sub-category order. */
export function allSelectedLines(
  sections: Section[],
  selections: Record<string, Selection>
): ComputedLine[] {
  return resolveBudget(sections, selections).lines;
}
