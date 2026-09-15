/**
 * The builder. Catalog stats as a single strip, the spend chart, a filter bar,
 * and the four sections as inline accordions.
 *
 * The running Base / Fees / Grand total is NOT here. It lives once, in the
 * sidebar, so the same figures are never shown twice on one screen.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  X,
} from "lucide-react";
import { SectionAccordion } from "../components/SectionAccordion";
import { SectionBarChart } from "../components/SectionBarChart";
import { Card, cx } from "../components/ui";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { ScopeItem } from "../lib/types";
import type { BudgetSummary } from "../lib/useTotals";

type PriceFilter = "all" | "priced" | "unpriced";

export function Dashboard({ budget }: { budget: BudgetSummary }) {
  const data = useStore((s) => s.data);
  const expanded = useStore((s) => s.expanded);
  const setExpanded = useStore((s) => s.setExpanded);
  const toggleSection = useStore((s) => s.toggleSection);
  const focus = useStore((s) => s.focus);
  const { t, tSource } = useT();
  const { catalog, selectedCount, unpricedSelected } = budget;

  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [source, setSource] = useState("all");
  const [match, setMatch] = useState("all");

  /**
   * While a filter is on, sections open automatically to reveal their matches.
   * That used to override the header click entirely, so collapsing a section
   * mid-filter did nothing. Now a click records an override for that section
   * and the override wins until the filter itself changes.
   */
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtering =
    query !== "" || priceFilter !== "all" || source !== "all" || match !== "all";

  useEffect(() => {
    setOpenOverrides({});
  }, [query, priceFilter, source, match]);

  // The sidebar asks for a section by bumping a nonce; scroll to it.
  useEffect(() => {
    if (!focus) return;
    const el = sectionRefs.current[focus.key];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);

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
  }));

  const isExpanded = (key: string, hasMatches: boolean) =>
    filtering ? openOverrides[key] ?? hasMatches : expanded.includes(key);

  const toggle = (key: string, hasMatches: boolean) => {
    if (filtering) {
      setOpenOverrides((prev) => ({
        ...prev,
        [key]: !(prev[key] ?? hasMatches),
      }));
    } else {
      toggleSection(key);
    }
  };

  const allKeys = data.sections.map((s) => s.key);
  const allOpen = filtering
    ? perSection.every(({ section, items }) => isExpanded(section.key, items.length > 0))
    : allKeys.every((k) => expanded.includes(k));

  const toggleAll = () => {
    if (filtering) {
      setOpenOverrides(
        Object.fromEntries(allKeys.map((k) => [k, !allOpen]))
      );
    } else {
      setExpanded(allOpen ? [] : allKeys);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setPriceFilter("all");
    setSource("all");
    setMatch("all");
  };

  const noResults = filtering && perSection.every((p) => p.items.length === 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("buildTitle")}</h1>
        <p className="mt-1 text-sm text-lavender-light/70">{t("buildSub")}</p>
      </div>

      {/* catalog facts, one line, no cards */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/5 bg-surface/40 px-4 py-2.5 text-sm">
        <Stat value={catalog.items} label={t("statItems")} />
        <Stat value={catalog.priced} label={t("statPriced")} tone="text-emerald-300" />
        <Stat value={catalog.unpriced} label={t("statUnpriced")} tone="text-gold" />
        <span className="h-4 w-px bg-white/10" />
        <Stat value={selectedCount} label={t("statSelected")} tone="text-white" />
        {unpricedSelected.length > 0 && (
          <span className="text-xs text-gold/90">
            {t("kpiNeedPrice", { n: unpricedSelected.length })}
          </span>
        )}
        <span className="ms-auto text-xs text-lavender-light/50">
          15% {t("statFee")}
        </span>
      </div>

      {/* An empty chart is just a large hole above the work, so it waits until
          there is something to plot. */}
      {selectedCount > 0 && <SectionBarChart budget={budget} />}

      {/* filters */}
      <div className="space-y-3">
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

            {/* the filter people actually reach for, as one visible control */}
            <Segmented
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

            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs text-lavender-light/80 transition-colors hover:bg-white/5"
            >
              {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
              <span className="hidden sm:inline">
                {allOpen ? t("collapseAll") : t("expandAll")}
              </span>
            </button>
          </div>
        </Card>

        {/* sections */}
        <div className="space-y-3">
          {perSection.map(({ section, items }) => {
            if (filtering && items.length === 0) return null;
            return (
              <div
                key={section.key}
                ref={(el) => (sectionRefs.current[section.key] = el)}
                className="scroll-mt-24"
              >
                <SectionAccordion
                  section={section}
                  visibleItems={items}
                  expanded={isExpanded(section.key, items.length > 0)}
                  onToggle={() => toggle(section.key, items.length > 0)}
                />
              </div>
            );
          })}

          {noResults && (
            <Card className="p-8 text-center text-lavender-light/50">
              {query ? t("noMatches", { q: query }) : t("noFilterMatches")}{" "}
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

function Stat({
  value,
  label,
  tone = "text-lavender-light",
}: {
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cx("num text-base font-bold", tone)}>{value}</span>
      <span className="text-xs text-lavender-light/50">{label}</span>
    </span>
  );
}

/** Three mutually exclusive states worth showing at once, so not a dropdown. */
function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="flex rounded-xl border border-white/10 bg-navy/60 p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cx(
            "rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
            value === v
              ? "bg-electric text-white"
              : "text-lavender-light/70 hover:text-white"
          )}
        >
          {label}
        </button>
      ))}
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
