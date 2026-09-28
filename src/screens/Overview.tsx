/**
 * The dashboard home: where the budget stands, what it is made of, what has
 * been exported, and what the RFP check is proposing.
 *
 * Every figure is computed from the live catalog and the current selection.
 * Nothing here is a placeholder, which is why the numbers are modest until a
 * budget is actually being built: an empty tool that claims SAR 12m would be
 * lying to the first person who opens it.
 */
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Handshake,
  Plus,
  Receipt,
  Sparkles,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { SECTION_ACCENT, SECTION_FALLBACK } from "../components/BudgetBar";
import {
  Donut,
  FilterTabs,
  KpiTile,
  Legend,
  Panel,
  ProjectMark,
  StatusBadge,
  type Slice,
} from "../components/dashboard";
import { Button } from "../components/ui";
import { compact, money, sar } from "../lib/format";
import { useT } from "../lib/i18n";
import { vendorFor, VENDORS } from "../data/vendors";
import { useStore } from "../lib/store";
import type { BudgetSummary } from "../lib/useTotals";

type Breakdown = "section" | "vendor" | "subCategory";

export function Overview({
  budget,
  onBuild,
  onReview,
  onVendors,
  onOpenHistory,
}: {
  budget: BudgetSummary;
  onBuild: () => void;
  onReview: () => void;
  onVendors: () => void;
  onOpenHistory: (id: string) => void;
}) {
  const { t, tSection, tSubCategory } = useT();
  const data = useStore((s) => s.data);
  const history = useStore((s) => s.history);
  const [breakdown, setBreakdown] = useState<Breakdown>("section");

  const { catalog, totals, selectedCount, unpricedSelected, priced } = budget;

  /** How many suppliers actually price something in the current budget. */
  const vendorsInPlay = useMemo(
    () => new Set(priced.map((l) => vendorFor(l.item.priceSource).source)).size,
    [priced]
  );

  const slices: Slice[] = useMemo(() => {
    if (breakdown === "section") {
      return budget.bySection.map((b) => ({
        key: b.section.key,
        label: tSection(b.section.name),
        value: b.totals.grand,
        color: SECTION_ACCENT[b.section.key] ?? SECTION_FALLBACK,
      }));
    }
    const palette = ["c1", "c2", "c3", "c4", "c5"];
    const bucket = new Map<string, number>();
    for (const l of priced) {
      const key =
        breakdown === "vendor"
          ? vendorFor(l.item.priceSource).name
          : tSubCategory(l.item.subCategory);
      bucket.set(key, (bucket.get(key) ?? 0) + l.totalCost);
    }
    return Array.from(bucket.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({
        key: label,
        label,
        value,
        color: `rgb(var(--${palette[i % palette.length]}))`,
      }));
  }, [breakdown, budget.bySection, priced, tSection, tSubCategory]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink md:text-[1.75rem]">
            {t("overviewTitle")}
          </h1>
          <p className="mt-1 text-sm text-ink-2">{t("overviewSub")}</p>
        </div>
        <Button onClick={onBuild}>
          <Plus size={16} /> {t("overviewNewBudget")}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label={t("kpiTotal")}
          value={compact(totals.total)}
          unit="SAR"
          hint={t("kpiTotalHint")}
          tone="brand"
          icon={<Wallet size={16} />}
        />
        <KpiTile
          label={t("kpiSelected")}
          value={selectedCount}
          hint={t("kpiSelectedHint", { n: catalog.items })}
          icon={<CheckCircle2 size={16} />}
        />
        <KpiTile
          label={t("kpiFee")}
          value={compact(totals.fee)}
          unit="SAR"
          hint={t("kpiFeeHint")}
          icon={<Receipt size={16} />}
        />
        <KpiTile
          label={t("kpiVendors")}
          value={vendorsInPlay}
          hint={t("kpiVendorsHint", { n: VENDORS.length })}
          icon={<Handshake size={16} />}
        />
        <KpiTile
          label={t("kpiPriced")}
          value={catalog.priced}
          hint={t("kpiPricedHint", { n: catalog.items })}
          tone="ok"
          icon={<Boxes size={16} />}
        />
        <KpiTile
          label={t("kpiMissing")}
          value={unpricedSelected.length}
          hint={t("kpiMissingHint", { n: catalog.unpriced })}
          tone={unpricedSelected.length > 0 ? "warn" : "neutral"}
          icon={<TriangleAlert size={16} />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* breakdown */}
        <Panel
          className="xl:col-span-3"
          title={t("breakdownTitle")}
          action={
            <FilterTabs
              value={breakdown}
              onChange={setBreakdown}
              options={[
                ["section", t("breakdownBySection")],
                ["subCategory", t("breakdownByType")],
                ["vendor", t("breakdownByVendor")],
              ] as const}
            />
          }
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <Donut
              slices={slices}
              centerValue={
                totals.grand > 0 ? compact(totals.grand) : money(0)
              }
              centerLabel={t("breakdownCenter")}
            />
            <Legend
              slices={slices}
              total={slices.reduce((s, x) => s + x.value, 0)}
              emptyLabel={t("breakdownEmpty")}
              format={money}
            />
          </div>
        </Panel>

        {/* summary */}
        <Panel className="xl:col-span-2" title={t("summaryTitle")}>
          <dl className="space-y-2.5">
            <Row label={t("totalBaseCost")} value={money(totals.base)} />
            <Row label={t("totalFees")} value={money(totals.fee)} />
            <Row label={t("totalVat")} value={money(totals.vat)} />
            <div className="border-t border-line pt-3">
              <dt className="text-xs text-ink-2">{t("finalTotal")}</dt>
              <dd className="num mt-0.5 text-2xl font-bold text-brand">
                {sar(totals.total)}
              </dd>
            </div>
          </dl>
          {unpricedSelected.length > 0 && (
            <p className="mt-3 rounded-control border border-warn/25 bg-warn-bg px-3 py-2 text-xs text-warn">
              {t("summaryUnpriced", { n: unpricedSelected.length })}
            </p>
          )}
          <Button
            className="mt-4 w-full"
            onClick={onReview}
            disabled={!selectedCount}
          >
            {t("summaryReview")} <ArrowRight size={15} />
          </Button>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* recent budgets */}
        <Panel
          title={t("recentTitle")}
          action={
            history.length > 0 ? (
              <span className="text-xs text-ink-2">
                {t("recentCount", { n: history.length })}
              </span>
            ) : undefined
          }
          bodyClassName="px-0 pb-2"
        >
          {history.length === 0 ? (
            <p className="px-5 pb-3 text-sm text-ink-2">{t("recentEmpty")}</p>
          ) : (
            <ul>
              {history.slice(0, 5).map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => onOpenHistory(h.id)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-start transition-colors duration-150 hover:bg-hover"
                  >
                    <ProjectMark name={h.title || "?"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {h.title || t("untitledBudget")}
                      </span>
                      <span className="block truncate text-xs text-ink-2">
                        {h.client || t("recentNoClient")}
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm font-semibold text-ink">
                      {money(h.total ?? h.grand)}
                    </span>
                    <StatusBadge tone={statusTone(h.rfpFiles?.length)}>
                      {h.rfpFiles?.length ? t("statusChecked") : t("statusDraft")}
                    </StatusBadge>
                    <span className="num hidden w-20 shrink-0 text-end text-xs text-ink-muted sm:block">
                      {h.exportedAt.slice(0, 10)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* where the prices come from */}
        <Panel
          title={t("vendorsTitle")}
          subtitle={t("overviewVendorsSub")}
          action={
            <button
              onClick={onVendors}
              className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              {t("overviewViewAll")} <ArrowRight size={13} />
            </button>
          }
        >
          {priced.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <Sparkles size={15} className="text-brand" />
              {t("overviewVendorsEmpty")}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {VENDORS.filter((v) =>
                priced.some((l) => vendorFor(l.item.priceSource).source === v.source)
              ).map((v) => {
                const value = priced
                  .filter((l) => vendorFor(l.item.priceSource).source === v.source)
                  .reduce((s, l) => s + l.totalCost, 0);
                const share = totals.grand > 0 ? (value / totals.grand) * 100 : 0;
                return (
                  <li key={v.source} className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: v.accent }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {v.name}
                    </span>
                    <StatusBadge tone={v.backing === "quoted" ? "ok" : "warn"}>
                      {t(v.backing === "quoted" ? "vendorsQuoted" : "vendorsAssumed")}
                    </StatusBadge>
                    <span className="num shrink-0 text-end text-sm font-semibold text-ink">
                      {money(value)}
                    </span>
                    <span className="num hidden w-12 shrink-0 text-end text-xs text-ink-2 sm:block">
                      {share.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function statusTone(hasRfp?: number) {
  return hasRfp ? ("ok" as const) : ("neutral" as const);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="num text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
