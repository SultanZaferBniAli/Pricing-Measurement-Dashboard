/**
 * Who priced what.
 *
 * Every figure here is derived from the `priceSource` already carried by each
 * catalog line. There is no contract, contact or discount data in any of the
 * source workbooks, so none is shown: this answers "has this price been agreed
 * with someone, and who" and stops there.
 *
 * Threelines is the outside supplier, TAM is in-house, Pricing_V1 is an older
 * internal list, Research is benchmark data from the travel and transport
 * studies, and Derived is composed from Pricing Master rows.
 */
import { useMemo } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, cx } from "../components/ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import { useBudget } from "../lib/useTotals";

/** How much weight to give a price, by where it came from. */
const SOURCE_TONE: Record<string, { dot: string; verified: boolean }> = {
  Threelines: { dot: "#5E45FF", verified: true },
  TAM: { dot: "#8A87F4", verified: true },
  Pricing_V1: { dot: "#6256F3", verified: true },
  Research: { dot: "#EBA036", verified: false },
  Derived: { dot: "#EBA036", verified: false },
};

const UNSOURCED = new Set(["", "(no source on file)"]);

export function Vendors() {
  const data = useStore((s) => s.data);
  const budget = useBudget();
  const { t, tSection, tSource } = useT();

  const rows = useMemo(() => {
    const map = new Map<
      string,
      { items: number; priced: number; sections: Set<string>; value: number; lines: number }
    >();

    for (const section of data.sections) {
      for (const item of section.items) {
        const key = UNSOURCED.has(item.priceSource) ? "" : item.priceSource;
        if (!map.has(key)) {
          map.set(key, { items: 0, priced: 0, sections: new Set(), value: 0, lines: 0 });
        }
        const row = map.get(key)!;
        row.items += 1;
        if (item.isPriced) row.priced += 1;
        if (item.isPriced) row.sections.add(section.name);
      }
    }

    // attribute the current budget to whoever priced each selected line
    for (const line of budget.priced) {
      const key = UNSOURCED.has(line.item.priceSource) ? "" : line.item.priceSource;
      const row = map.get(key);
      if (row) {
        row.value += line.totalCost;
        row.lines += 1;
      }
    }

    return Array.from(map.entries())
      .map(([source, v]) => ({ source, ...v, sections: Array.from(v.sections) }))
      .sort((a, b) => b.priced - a.priced);
  }, [data, budget.priced]);

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);
  const verifiedValue = rows
    .filter((r) => SOURCE_TONE[r.source]?.verified)
    .reduce((sum, r) => sum + r.value, 0);
  const verifiedShare = totalValue > 0 ? (verifiedValue / totalValue) * 100 : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("vendorsTitle")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-lavender-light/70">{t("vendorsSub")}</p>
      </div>

      {/* how much of the current budget rests on an agreed price */}
      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck size={16} className="text-emerald-300" />
            {t("vendorsVerifiedTitle")}
          </h2>
          <span className="num text-sm text-lavender-light/60">
            {money(verifiedValue)} / {money(totalValue)} SAR
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full bg-emerald-400/80 transition-[width] duration-500 ease-out"
            style={{ width: `${verifiedShare}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-lavender-light/55">
          {totalValue === 0
            ? t("vendorsVerifiedEmpty")
            : t("vendorsVerifiedBody", { pct: verifiedShare.toFixed(0) })}
        </p>
      </Card>

      <div className="space-y-2">
        {rows.map((r) => {
          const tone = SOURCE_TONE[r.source];
          const unsourced = r.source === "";
          const share = totalValue > 0 ? (r.value / totalValue) * 100 : 0;
          return (
            <Card key={r.source || "none"} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span
                      className="tam-diamond shrink-0"
                      style={{ backgroundColor: tone?.dot ?? "#4b4870" }}
                    />
                    {unsourced ? t("vendorsNoSource") : tSource(r.source)}
                    {tone?.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                        <ShieldCheck size={11} /> {t("vendorsAgreed")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">
                        <TriangleAlert size={11} /> {t("vendorsBenchmark")}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-lavender-light/55">
                    {unsourced
                      ? t("vendorsNoSourceBody")
                      : r.sections.map(tSection).join(", ") || t("vendorsNoPriced")}
                  </p>
                </div>

                <div className="flex shrink-0 items-baseline gap-5 text-end">
                  <Figure value={String(r.priced)} label={t("vendorsPricesLines")} />
                  <Figure value={String(r.lines)} label={t("vendorsInBudget")} />
                  <Figure
                    value={money(r.value)}
                    label={t("vendorsValue")}
                    tone={r.value > 0 ? "text-gold" : "text-lavender-light/30"}
                  />
                </div>
              </div>

              {r.value > 0 && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${share}%`,
                      backgroundColor: tone?.dot ?? "#4b4870",
                    }}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Figure({
  value,
  label,
  tone = "text-white",
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <div>
      <div className={cx("num text-base font-bold", tone)}>{value}</div>
      <div className="text-[10px] text-lavender-light/45">{label}</div>
    </div>
  );
}
