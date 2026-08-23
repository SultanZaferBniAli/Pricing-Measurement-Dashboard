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
import { useStore } from "../lib/store";
import type { ScopeItem } from "../lib/types";
import type { BudgetSummary } from "../lib/useTotals";

type PriceFilter = "all" | "priced" | "unpriced";

export function Dashboard({ budget }: { budget: BudgetSummary }) {
  const data = useStore((s) => s.data);
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
            <Diamond /> Scope-Based Budget Builder
          </div>
          <h1 className="mt-1.5 text-2xl md:text-3xl font-bold text-white">
            Pricing Measurement Dashboard
          </h1>
          <p className="mt-1.5 text-lavender-light/80 max-w-2xl text-sm">
            Pick a section, choose the items you need, adjust the quantities. The
            15% fee and all totals update instantly.
          </p>
        </div>
      </div>

      {/* running budget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MoneyKpi label="Current Base Total" value={money(totals.base)} />
        <MoneyKpi label="Current Fees (15%)" value={money(totals.fee)} />
        <MoneyKpi label="Current Grand Total" value={money(totals.grand)} highlight />
      </div>

      {/* catalog KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Sections" value={catalog.sections} icon={<Layers size={18} />} />
        <Kpi label="Priced Items" value={catalog.priced} accent="emerald" icon={<CheckCircle2 size={18} />} />
        <Kpi label="Unpriced Items" value={catalog.unpriced} accent="gold" icon={<TriangleAlert size={18} />} />
        <Kpi label="Total Items" value={catalog.items} icon={<Boxes size={18} />} />
        <Kpi
          label="Selected"
          value={selectedCount}
          accent="electric"
          icon={<Wallet size={18} />}
          sub={unpricedSelected.length ? `${unpricedSelected.length} need a price` : undefined}
        />
        <Kpi label="Fee Applied" value="15%" accent="gold" icon={<Receipt size={18} />} />
      </div>

      {/* chart + tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionBarChart budget={budget} />
        </div>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Coins size={18} className="text-gold" />
            <h3 className="font-semibold text-white">How pricing works</h3>
          </div>
          <ul className="space-y-2 text-sm text-lavender-light/80">
            <li className="flex gap-2"><Diamond className="mt-1.5" /> Base = Qty x Unit Price</li>
            <li className="flex gap-2"><Diamond className="mt-1.5" /> Fee = Base x 15%</li>
            <li className="flex gap-2"><Diamond className="mt-1.5" /> Total = Base + Fee</li>
            <li className="flex gap-2 text-gold/90"><Diamond className="mt-1.5" /> Unpriced items are flagged &amp; excluded until you set a price.</li>
          </ul>
        </Card>
      </div>

      {/* section heading + toolbar */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SectionHeading sub="Click a section to expand it and select items">
            Build your budget
          </SectionHeading>
          <button
            onClick={() => setManualExpanded(allOpen ? new Set() : new Set(allKeys))}
            className="text-xs flex items-center gap-1.5 rounded-lg px-3 py-1.5 border border-white/10 text-lavender-light/80 hover:bg-white/5 transition-colors"
          >
            {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>

        <Card className="p-3 mt-3 sticky top-[68px] z-20">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lavender-light/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all items..."
                className="w-full rounded-xl bg-navy/60 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-lavender-light/40 focus:border-electric focus:outline-none"
              />
            </div>
            <FilterSelect
              value={priceFilter}
              onChange={(v) => setPriceFilter(v as PriceFilter)}
              options={[["all", "All prices"], ["priced", "Priced only"], ["unpriced", "Unpriced only"]]}
            />
            <FilterSelect
              value={source}
              onChange={setSource}
              options={[["all", "All sources"], ...sources.map((s) => [s, s] as [string, string])]}
            />
            <FilterSelect
              value={match}
              onChange={setMatch}
              options={[
                ["all", "All matches"],
                ["EXACT", "Exact"],
                ["CLOSE", "Close"],
                ["RESEARCH", "Research"],
                ["NOT IN MASTER", "Not in master"],
              ]}
            />
            {filtering && (
              <button
                onClick={clearFilters}
                className="text-xs text-lavender-light/60 hover:text-white flex items-center gap-1"
              >
                <X size={13} /> Clear
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
              No items match “{query}”.{" "}
              <button className="text-electric underline" onClick={clearFilters}>
                Clear filters
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
