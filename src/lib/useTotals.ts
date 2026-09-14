/** Derived-state hooks: compute totals/counts from the store's selections. */
import { useMemo } from "react";
import { resolveBudget, sumLines } from "./pricing";
import { useStore } from "./store";
import type { ComputedLine } from "./types";

export function useBudget() {
  const data = useStore((s) => s.data);
  const selections = useStore((s) => s.selections);

  return useMemo(() => {
    // One resolve pass feeds both the global totals and the per-section rollup,
    // so contingency lines are charged against exactly the same bases in each.
    const resolved = resolveBudget(data.sections, selections);
    const lines = resolved.lines;
    const priced = lines.filter((l) => !l.isUnpriced);
    const unpricedSelected = lines.filter((l) => l.isUnpriced);
    const totals = sumLines(priced);

    // per-section rollup (priced only for money; counts include all)
    const bySection = data.sections.map((section) => {
      const sl = resolved.bySectionKey[section.key] ?? [];
      const pricedTotals = sumLines(sl.filter((l) => !l.isUnpriced));
      const available = section.items.length;
      const pricedAvailable = section.items.filter((i) => i.isPriced).length;
      return {
        section,
        available,
        pricedAvailable,
        selectedCount: sl.length,
        unpricedSelected: sl.filter((l) => l.isUnpriced).length,
        totals: pricedTotals,
      };
    });

    // global catalog counts
    const allItems = data.sections.flatMap((s) => s.items);
    const catalog = {
      sections: data.sections.length,
      items: allItems.length,
      priced: allItems.filter((i) => i.isPriced).length,
      unpriced: allItems.filter((i) => !i.isPriced).length,
    };

    return {
      lines,
      priced,
      unpricedSelected,
      totals,
      bySection,
      catalog,
      selectedCount: lines.length,
    };
  }, [data, selections]);
}

export type BudgetSummary = ReturnType<typeof useBudget>;
export type { ComputedLine };
