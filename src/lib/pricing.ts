/**
 * Pricing engine — the single source of truth for all budget math.
 *
 * Business rules (from the TAM brief):
 *   Base Cost  = Qty × Unit Price
 *   Fee (15%)  = Base Cost × 0.15
 *   Total Cost = Base Cost + Fee
 *
 * Unpriced items (NOT IN MASTER / GAP / empty price) are NEVER invented.
 * They are excluded from totals unless the user supplies a custom price.
 */
import { FEE_RATE } from "./format";
import type {
  ComputedLine,
  ScopeItem,
  Section,
  SectionTotals,
  Selection,
} from "./types";

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

/** Build computed lines for every selected item in a section. */
export function sectionLines(
  section: Section,
  selections: Record<string, Selection>
): ComputedLine[] {
  return section.items
    .filter((it) => selections[it.id])
    .map((it) => computeLine(it, selections[it.id]));
}

/** All selected lines across every section, in section/sub-category order. */
export function allSelectedLines(
  sections: Section[],
  selections: Record<string, Selection>
): ComputedLine[] {
  const lines: ComputedLine[] = [];
  for (const s of sections) {
    for (const it of s.items) {
      if (selections[it.id]) lines.push(computeLine(it, selections[it.id]));
    }
  }
  return lines;
}
