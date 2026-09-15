/**
 * How the budget is split across the four sections, as one stacked bar.
 *
 * This replaces both the catalog stat strip and the four-row chart. Those were
 * two blocks saying overlapping things, and the chart only appeared once you
 * had selected something, so the page jumped. This is always here: empty, it is
 * a quiet track that says what to do next; filled, it is the composition of the
 * budget at a glance.
 */
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { cx } from "./ui";
import type { BudgetSummary } from "../lib/useTotals";

/** Accent per section, shared with the section tabs so the two read as one. */
export const SECTION_ACCENT: Record<string, string> = {
  MARKETING: "#5E45FF",
  "EVENT MANAGEMENT": "#8A87F4",
  LOGISTICS: "#EBA036",
  "VIDEO PRODUCTIONS": "#6256F3",
};

export function BudgetBar({ budget }: { budget: BudgetSummary }) {
  const { t, tSection } = useT();
  const { totals, selectedCount, unpricedSelected } = budget;

  const rows = budget.bySection.map((b) => ({
    key: b.section.key,
    name: tSection(b.section.name),
    value: b.totals.grand,
    color: SECTION_ACCENT[b.section.key] ?? "#8A87F4",
  }));

  const spent = rows.reduce((sum, r) => sum + r.value, 0);
  const hasSpend = spent > 0;

  return (
    <div className="rounded-card border border-white/5 bg-surface/50 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold text-white">{t("chartTitle")}</h2>
        <p className="text-xs text-lavender-light/55">
          {selectedCount === 0
            ? t("budgetBarHint")
            : t("budgetBarStatus", { n: selectedCount })}
          {unpricedSelected.length > 0 && (
            <span className="text-gold/90">
              {" "}
              {t("budgetBarNeedsPrice", { n: unpricedSelected.length })}
            </span>
          )}
        </p>
      </div>

      {/* the whole budget as one track, so the split is readable at a glance */}
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        {hasSpend &&
          rows.map((r) =>
            r.value > 0 ? (
              <div
                key={r.key}
                className="h-full transition-[width] duration-500 ease-out"
                style={{ width: `${(r.value / spent) * 100}%`, backgroundColor: r.color }}
                title={`${r.name}: ${money(r.value)}`}
              />
            ) : null
          )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {rows.map((r) => (
          <span key={r.key} className="flex items-baseline gap-1.5 text-xs">
            <span
              className={cx("tam-diamond", r.value > 0 ? "" : "opacity-30")}
              style={{ backgroundColor: r.color }}
            />
            <span className={r.value > 0 ? "text-lavender-light" : "text-lavender-light/40"}>
              {r.name}
            </span>
            <span
              className={cx(
                "num font-semibold",
                r.value > 0 ? "text-white" : "text-lavender-light/30"
              )}
            >
              {money(r.value)}
            </span>
          </span>
        ))}
        <span className="num ms-auto text-xs text-lavender-light/50">
          {t("chartSub")}
        </span>
      </div>
    </div>
  );
}
