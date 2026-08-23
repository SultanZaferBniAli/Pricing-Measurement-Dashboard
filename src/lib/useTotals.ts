/** Derived-state hooks: compute totals/counts from the store's selections. */
import { useMemo } from "react";
import { allSelectedLines, sectionLines, sumLines } from "./pricing";
import { useStore } from "./store";
import type { ComputedLine } from "./types";

export function useBudget() {
  const data = useStore((s) => s.data);
  const selections = useStore((s) => s.selections);

  return useMemo(() => {
    const lines = allSelectedLines(data.sections, selections);
    const priced = lines.filter((l) => !l.isUnpriced);
    const unpricedSelected = lines.filter((l) => l.isUnpriced);
    const totals = sumLines(priced);

    // per-section rollup (priced only for money; counts include all)
    const bySection = data.sections.map((section) => {
      const sl = sectionLines(section, selections);
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
