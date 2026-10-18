/** Derived-state hooks: compute totals/counts from the store's selections. */
import { useMemo } from "react";
import { addTotals, computeAiLine, resolveBudget, sumAiLines, sumLines } from "./pricing";
import { useStore } from "./store";
import type { ComputedLine } from "./types";

export function useBudget() {
  const data = useStore((s) => s.data);
  const selections = useStore((s) => s.selections);
  const aiLinesRaw = useStore((s) => s.aiLines);

  return useMemo(() => {
    // One resolve pass feeds both the global totals and the per-section rollup,
    // so contingency lines are charged against exactly the same bases in each.
    const resolved = resolveBudget(data.sections, selections);
    const lines = resolved.lines;
    const priced = lines.filter((l) => !l.isUnpriced);
    const unpricedSelected = lines.filter((l) => l.isUnpriced);
    const catalogTotals = sumLines(priced);

    // AI-priced lines live beside the catalog lines and roll into the same
    // totals. They are excluded individually by the user, never silently.
    const aiLines = aiLinesRaw.map(computeAiLine);
    const aiTotals = sumAiLines(aiLines);
    const aiUnpriced = aiLines.filter((l) => l.isUnpriced);
    const totals = addTotals(catalogTotals, aiTotals);

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

    // AI lines grouped by their own section names
    const aiBySection = Array.from(
      aiLines.reduce((m, l) => {
        if (!l.line.included) return m;
        const list = m.get(l.line.section) ?? [];
        list.push(l);
        m.set(l.line.section, list);
        return m;
      }, new Map<string, typeof aiLines>())
    ).map(([section, sl]) => ({ section, lines: sl, totals: sumAiLines(sl) }));

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
      catalogTotals,
      aiLines,
      aiTotals,
      aiUnpriced,
      aiBySection,
      bySection,
      catalog,
      selectedCount: lines.length + aiTotals.selectedCount,
      catalogSelectedCount: lines.length,
    };
  }, [data, selections, aiLinesRaw]);
}

export type BudgetSummary = ReturnType<typeof useBudget>;
export type { ComputedLine };
