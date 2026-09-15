/**
 * The builder. One section at a time, chosen from a tab strip, so picking items
 * in Logistics never means scrolling past everything in Marketing first.
 *
 * Order on the page follows the order of the work: see where the budget stands,
 * narrow the catalog, choose a section, tick items. The search and filters sit
 * above the tabs because they apply to every section, not just the open one.
 *
 * The running Base / Fees / Grand total is not here. It lives once, in the
 * sidebar, so the same figures are never shown twice on one screen.
 */
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { BudgetBar, SECTION_ACCENT } from "../components/BudgetBar";
import { SectionPanel } from "../components/SectionPanel";
import { Card, cx } from "../components/ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { ScopeItem } from "../lib/types";
import type { BudgetSummary } from "../lib/useTotals";

type PriceFilter = "all" | "priced" | "unpriced";

export function Dashboard({ budget }: { budget: BudgetSummary }) {
  const data = useStore((s) => s.data);
  const activeSection = useStore((s) => s.activeSection);
  const setActiveSection = useStore((s) => s.setActiveSection);
  const { t, tSection, tSource } = useT();

  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [source, setSource] = useState("all");
  const [match, setMatch] = useState("all");

  const filtering =
    query !== "" || priceFilter !== "all" || source !== "all" || match !== "all";

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

  const perSection = data.sections.map((s) => ({
    section: s,
    items: s.items.filter(filterItem),
    rollup: budget.bySection.find((b) => b.section.key === s.key),
  }));

  const current = perSection.find((p) => p.section.key === activeSection) ?? perSection[0];

  const clearFilters = () => {
    setQuery("");
    setPriceFilter("all");
    setSource("all");
    setMatch("all");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("buildTitle")}</h1>
      </div>

      <BudgetBar budget={budget} />

      {/* search and filters apply across every section, so they lead */}
      <Card className="sticky top-2 z-20 p-3 lg:top-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            {/* logical inset so the icon follows the text direction */}
            <Search
              size={16}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-lavender-light/50"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-navy/60 py-2 pe-3 ps-9 text-sm text-white placeholder:text-lavender-light/40 focus:border-electric focus:outline-none"
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
              className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-lavender-light/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={13} /> {t("clear")}
            </button>
          )}
        </div>
      </Card>

      {/* the four sections, side by side */}
      <div>
        <div
          role="tablist"
          aria-label={t("buildTitle")}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {perSection.map(({ section, items, rollup }) => {
            const active = section.key === current?.section.key;
            const chosen = rollup?.selectedCount ?? 0;
            const subtotal = rollup?.totals.grand ?? 0;
            const accent = SECTION_ACCENT[section.key] ?? "#8A87F4";
            return (
              <button
                key={section.key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSection(section.key)}
                className={cx(
                  "group relative overflow-hidden rounded-card border px-4 py-3 text-start transition-colors duration-150",
                  active
                    ? "border-electric/60 bg-surface"
                    : "border-white/5 bg-surface/40 hover:border-white/15 hover:bg-surface/70"
                )}
              >
                {/* the active tab is marked along its leading edge, not by a wash */}
                <span
                  className={cx(
                    "absolute inset-y-0 start-0 w-[3px] transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  )}
                  style={{ backgroundColor: accent }}
                />
                <span className="flex items-center gap-2">
                  <span className="tam-diamond shrink-0" style={{ backgroundColor: accent }} />
                  <span
                    className={cx(
                      "min-w-0 flex-1 truncate text-sm font-semibold",
                      active ? "text-white" : "text-lavender-light"
                    )}
                  >
                    {tSection(section.name)}
                  </span>
                  {chosen > 0 && (
                    <span className="num shrink-0 rounded-full bg-electric/25 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {chosen}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="num text-xs text-lavender-light/45">
                    {filtering
                      ? t("countMatching", { n: items.length })
                      : t("countItems", { n: section.items.length })}
                  </span>
                  {subtotal > 0 && (
                    <span className="num text-sm font-bold text-gold">{money(subtotal)}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {current && (
            <SectionPanel
              key={current.section.key}
              section={current.section}
              visibleItems={current.items}
              filtering={filtering}
              onClearFilters={clearFilters}
            />
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
  const active = value !== "all";
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "cursor-pointer rounded-xl border px-2.5 py-2 text-xs focus:outline-none",
        active
          ? "border-electric/50 bg-electric/10 text-white"
          : "border-white/10 bg-navy/60 text-lavender-light/80"
      )}
    >
      {options.map(([v, label]) => (
        <option key={v} value={v} className="bg-navy text-white">
          {label}
        </option>
      ))}
    </select>
  );
}
