/**
 * Single-page builder: overview KPIs, spend chart, a filter toolbar, and the
 * four sections as inline expandable accordions. Pick items and adjust pricing
 * without leaving the page.
 */
import { useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  ChevronsDownUp,
  ChevronsUpDown,
  Coins,
  Layers,
  Receipt,
  Search,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import { Kpi, MoneyKpi } from "../components/Kpi";
import { SectionAccordion } from "../components/SectionAccordion";
import { SectionBarChart } from "../components/SectionBarChart";
import { Card, Diamond, SectionHeading, cx } from "../components/ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { ScopeItem } from "../lib/types";
import type { BudgetSummary } from "../lib/useTotals";

type PriceFilter = "all" | "priced" | "unpriced";

export function Dashboard({ budget }: { budget: BudgetSummary }) {
  const data = useStore((s) => s.data);
  const { t, tSource } = useT();
  const { catalog, totals, selectedCount, unpricedSelected } = budget;

  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [source, setSource] = useState("all");
  const [match, setMatch] = useState("all");
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(
    new Set([data.sections[0]?.key])
  );

  const sources = useMemo(
    () =>
      Array.from(new Set(data.sections.flatMap((s) => s.items.map((i) => i.priceSource))))
        .filter(Boolean)
        .sort(),
    [data]
  );

  const filterItem = (it: ScopeItem) => {
    if (query && !it.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (priceFilter === "priced" && !it.isPriced) return false;
    if (priceFilter === "unpriced" && it.isPriced) return false;
    if (source !== "all" && it.priceSource !== source) return false;
    if (match !== "all" && (it.matchStatus || "").toUpperCase() !== match) return false;
    return true;
  };

  const filtering =
    query !== "" || priceFilter !== "all" || source !== "all" || match !== "all";

  const perSection = data.sections.map((s) => ({
    section: s,
    items: s.items.filter(filterItem),
  }));

  const isExpanded = (key: string, hasMatches: boolean) =>
    filtering ? hasMatches : manualExpanded.has(key);

  const toggle = (key: string) =>
    setManualExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const allKeys = data.sections.map((s) => s.key);
  const allOpen = allKeys.every((k) => manualExpanded.has(k));

  const clearFilters = () => {
    setQuery("");
    setPriceFilter("all");
    setSource("all");
    setMatch("all");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* hero */}
      <div className="rounded-card bg-tam-gradient p-6 md:p-7 relative overflow-hidden border border-electric/30">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <path d="M0 100 Q50 40 100 100 T200 100" stroke="#EBA036" fill="none" strokeWidth="2" />
            <path d="M0 130 Q50 70 100 130 T200 130" stroke="#B7B2F9" fill="none" strokeWidth="2" />
          </svg>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 text-lavender-light/80 text-sm">
            <Diamond /> {t("heroEyebrow")}
          </div>
          <h1 className="mt-1.5 text-2xl md:text-3xl font-bold text-white">
            {t("heroTitle")}
          </h1>
          <p className="mt-1.5 text-lavender-light/80 max-w-2xl text-sm">
            {t("heroBody")}
          </p>
        </div>
      </div>

      {/* running budget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MoneyKpi label={t("kpiCurrentBase")} value={money(totals.base)} />
        <MoneyKpi label={t("kpiCurrentFees")} value={money(totals.fee)} />
        <MoneyKpi label={t("kpiCurrentGrand")} value={money(totals.grand)} highlight />
      </div>

      {/* catalog KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label={t("kpiSections")} value={catalog.sections} icon={<Layers size={18} />} />
        <Kpi label={t("kpiPricedItems")} value={catalog.priced} accent="emerald" icon={<CheckCircle2 size={18} />} />
        <Kpi label={t("kpiUnpricedItems")} value={catalog.unpriced} accent="gold" icon={<TriangleAlert size={18} />} />
        <Kpi label={t("kpiTotalItems")} value={catalog.items} icon={<Boxes size={18} />} />
        <Kpi
          label={t("kpiSelected")}
          value={selectedCount}
          accent="electric"
          icon={<Wallet size={18} />}
          sub={
            unpricedSelected.length
              ? t("kpiNeedPrice", { n: unpricedSelected.length })
              : undefined
          }
        />
        <Kpi label={t("kpiFeeApplied")} value="15%" accent="gold" icon={<Receipt size={18} />} />
      </div>

      {/* chart + tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionBarChart budget={budget} />
        </div>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Coins size={18} className="text-gold" />
            <h3 className="font-semibold text-white">{t("howTitle")}</h3>
          </div>
          <ul className="space-y-2 text-sm text-lavender-light/80">
            <li className="flex gap-2"><Diamond className="mt-1.5 shrink-0" /> {t("howBase")}</li>
            <li className="flex gap-2"><Diamond className="mt-1.5 shrink-0" /> {t("howFee")}</li>
            <li className="flex gap-2"><Diamond className="mt-1.5 shrink-0" /> {t("howTotal")}</li>
            <li className="flex gap-2 text-gold/90"><Diamond className="mt-1.5 shrink-0" /> {t("howUnpriced")}</li>
          </ul>
        </Card>
      </div>

      {/* section heading + toolbar */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SectionHeading sub={t("buildSub")}>{t("buildTitle")}</SectionHeading>
          <button
            onClick={() => setManualExpanded(allOpen ? new Set() : new Set(allKeys))}
            className="text-xs flex items-center gap-1.5 rounded-lg px-3 py-1.5 border border-white/10 text-lavender-light/80 hover:bg-white/5 transition-colors"
          >
            {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
            {allOpen ? t("collapseAll") : t("expandAll")}
          </button>
        </div>

        <Card className="p-3 mt-3 sticky top-[68px] z-20">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              {/* logical inset so the icon follows the text direction */}
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-lavender-light/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl bg-navy/60 border border-white/10 ps-9 pe-3 py-2 text-sm text-white placeholder:text-lavender-light/40 focus:border-electric focus:outline-none"
              />
            </div>
            <FilterSelect
              value={priceFilter}
              onChange={(v) => setPriceFilter(v as PriceFilter)}
              options={[
                ["all", t("filterAllPrices")],
                ["priced", t("filterPricedOnly")],
                ["unpriced", t("filterUnpricedOnly")],
              ]}
            />
            <FilterSelect
              value={source}
              onChange={setSource}
              options={[
                ["all", t("filterAllSources")],
                ...sources.map((s) => [s, tSource(s)] as [string, string]),
              ]}
            />
            <FilterSelect
              value={match}
              onChange={setMatch}
              options={[
                ["all", t("filterAllMatches")],
                ["EXACT", t("matchExact")],
                ["CLOSE", t("matchClose")],
                ["RESEARCH", t("matchResearch")],
                ["DERIVED", t("matchDerived")],
                ["NOT IN MASTER", t("matchNotInMaster")],
              ]}
            />
            {filtering && (
              <button
                onClick={clearFilters}
                className="text-xs text-lavender-light/60 hover:text-white flex items-center gap-1"
              >
                <X size={13} /> {t("clear")}
              </button>
            )}
          </div>
        </Card>

        {/* accordions */}
        <div className="mt-4 space-y-3">
          {perSection.map(({ section, items }) => {
            if (filtering && items.length === 0) return null;
            return (
              <SectionAccordion
                key={section.key}
                section={section}
                visibleItems={items}
                expanded={isExpanded(section.key, items.length > 0)}
                onToggle={() => toggle(section.key)}
              />
            );
          })}
          {filtering && perSection.every((p) => p.items.length === 0) && (
            <Card className="p-8 text-center text-lavender-light/50">
              {t("noMatches", { q: query })}{" "}
              <button className="text-electric underline" onClick={clearFilters}>
                {t("clearFilters")}
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl bg-navy/60 border border-white/10 px-3 py-2 text-sm text-lavender-light focus:border-electric focus:outline-none cursor-pointer"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v} className="bg-navy text-white">
          {label}
        </option>
      ))}
    </select>
  );
}
