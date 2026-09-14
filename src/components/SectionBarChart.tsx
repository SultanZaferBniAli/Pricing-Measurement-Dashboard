/** Lightweight dependency-free horizontal bar chart: spend by section. */
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import type { BudgetSummary } from "../lib/useTotals";
import { Card, Diamond } from "./ui";

const COLORS = ["#5E45FF", "#8A87F4", "#EBA036", "#6256F3"];

export function SectionBarChart({ budget }: { budget: BudgetSummary }) {
  const { t, tSection } = useT();
  const rows = budget.bySection.map((b, i) => ({
    name: tSection(b.section.name),
    value: b.totals.grand,
    color: COLORS[i % COLORS.length],
  }));
  const max = Math.max(1, ...rows.map((r) => r.value));
  const anySpend = rows.some((r) => r.value > 0);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Diamond />
        <h3 className="font-semibold text-white">{t("chartTitle")}</h3>
        <span className="ms-auto text-xs text-lavender-light/60">{t("chartSub")}</span>
      </div>
      {!anySpend ? (
        <p className="text-sm text-lavender-light/50 py-6 text-center">
          {t("chartEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-lavender-light">{r.name}</span>
                <span className="num text-white font-medium">{money(r.value)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(r.value / max) * 100}%`,
                    backgroundColor: r.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
