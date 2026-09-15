/**
 * Who stands behind the prices in this budget.
 *
 * The question this page answers is the one a client asks: how much of this
 * number did somebody quote us, and how much did we assume? It leads with that
 * split, then puts each supplier on a card. Open a card to see exactly which of
 * your selected lines that supplier prices, and what they come to.
 *
 * Everything is derived from the `priceSource` already on each catalog line.
 * There is no contract, contact or discount data in any source workbook, so
 * none is shown.
 */
import { useMemo, useState } from "react";
import { ChevronDown, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, cx } from "../components/ui";
import { VENDORS, UNSOURCED, initials, type VendorProfile } from "../data/vendors";
import { money } from "../lib/format";
import { useT, type StringKey } from "../lib/i18n";
import { useStore } from "../lib/store";
import { useBudget } from "../lib/useTotals";
import type { ComputedLine } from "../lib/types";

export function Vendors() {
  const data = useStore((s) => s.data);
  const budget = useBudget();
  const { t, tSection, tSubCategory } = useT();
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const profiles = [...VENDORS, UNSOURCED];
    return profiles
      .map((vendor) => {
        const catalogLines = data.sections.flatMap((s) =>
          s.items.filter((i) => resolveSource(i.priceSource) === vendor.source)
        );
        const lines = budget.priced.filter(
          (l) => resolveSource(l.item.priceSource) === vendor.source
        );
        return {
          vendor,
          catalogCount: catalogLines.length,
          sections: Array.from(
            new Set(catalogLines.filter((i) => i.isPriced).map((i) => i.section))
          ),
          lines,
          value: lines.reduce((sum, l) => sum + l.totalCost, 0),
        };
      })
      .filter((r) => r.catalogCount > 0)
      .sort((a, b) => b.value - a.value || b.catalogCount - a.catalogCount);
  }, [data, budget.priced]);

  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const quoted = rows
    .filter((r) => r.vendor.backing === "quoted")
    .reduce((sum, r) => sum + r.value, 0);
  const quotedPct = total > 0 ? (quoted / total) * 100 : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">{t("vendorsTitle")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-lavender-light/70">{t("vendorsSub")}</p>
      </div>

      {/* the headline: quoted against assumed */}
      <Card className="p-5">
        {total === 0 ? (
          <p className="text-sm text-lavender-light/50">{t("vendorsVerifiedEmpty")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-lavender-light/55">{t("vendorsQuotedLabel")}</p>
                <p className="num mt-0.5 text-3xl font-bold text-white">
                  {quotedPct.toFixed(0)}
                  <span className="text-lg font-normal text-lavender-light/60">%</span>
                </p>
              </div>
              <p className="num text-sm text-lavender-light/60">
                {money(quoted)} / {money(total)} SAR
              </p>
            </div>

            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              {rows
                .filter((r) => r.value > 0)
                .map((r) => (
                  <div
                    key={r.vendor.source || "none"}
                    className="h-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${(r.value / total) * 100}%`,
                      backgroundColor: r.vendor.accent,
                      opacity: r.vendor.backing === "quoted" ? 1 : 0.45,
                    }}
                    title={`${r.vendor.name}: ${money(r.value)}`}
                  />
                ))}
            </div>
            <p className="mt-2 text-xs text-lavender-light/55">
              {t("vendorsQuotedBody", {
                quoted: quotedPct.toFixed(0),
                assumed: (100 - quotedPct).toFixed(0),
              })}
            </p>
          </>
        )}
      </Card>

      {/* one card per supplier */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const isOpen = open === r.vendor.source;
          const share = total > 0 ? (r.value / total) * 100 : 0;
          return (
            <button
              key={r.vendor.source || "none"}
              onClick={() => setOpen(isOpen ? null : r.vendor.source)}
              aria-expanded={isOpen}
              className={cx(
                "rounded-card border p-4 text-start transition-colors duration-150",
                isOpen
                  ? "border-electric/60 bg-surface"
                  : "border-white/5 bg-surface/50 hover:border-white/15 hover:bg-surface/80"
              )}
            >
              <div className="flex items-start gap-3">
                <VendorLogo vendor={r.vendor} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-white">
                    {r.vendor.name}
                  </h2>
                  <Backing backing={r.vendor.backing} t={t} />
                </div>
                <ChevronDown
                  size={16}
                  className={cx(
                    "shrink-0 text-lavender-light/40 transition-transform duration-150",
                    isOpen && "rotate-180"
                  )}
                />
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-lavender-light/50">
                {r.vendor.role}
              </p>

              <dl className="mt-3 flex items-baseline justify-between gap-2">
                <div>
                  <dd className="num text-base font-bold text-white">{r.catalogCount}</dd>
                  <dt className="text-[10px] text-lavender-light/45">
                    {t("vendorsCatalogLines")}
                  </dt>
                </div>
                <div className="text-end">
                  <dd
                    className={cx(
                      "num text-base font-bold",
                      r.value > 0 ? "text-gold" : "text-lavender-light/25"
                    )}
                  >
                    {money(r.value)}
                  </dd>
                  <dt className="text-[10px] text-lavender-light/45">
                    {r.lines.length === 0
                      ? t("vendorsNotUsed")
                      : r.lines.length === 1
                        ? t("vendorsOneLineInBudget")
                        : t("vendorsLinesInBudget", { n: r.lines.length })}
                  </dt>
                </div>
              </dl>

              {r.value > 0 && (
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full transition-[width] duration-500 ease-out"
                    style={{ width: `${share}%`, backgroundColor: r.vendor.accent }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* what the open supplier covers in this budget */}
      {open !== null && (
        <VendorDetail
          row={rows.find((r) => r.vendor.source === open)!}
          tSection={tSection}
          tSubCategory={tSubCategory}
          t={t}
        />
      )}
    </div>
  );
}

/** Sources not listed in VENDORS all fall into the unsourced bucket. */
function resolveSource(priceSource: string): string {
  const known = VENDORS.some((v) => v.source === priceSource);
  return known ? priceSource : "";
}

function VendorLogo({ vendor }: { vendor: VendorProfile }) {
  const [failed, setFailed] = useState(false);
  const showImage = vendor.logo && !failed;

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-navy/60"
      style={showImage ? undefined : { backgroundColor: `${vendor.accent}22` }}
    >
      {showImage ? (
        <img
          src={vendor.logo!}
          alt={vendor.name}
          className="h-7 w-auto max-w-[34px] object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="num text-sm font-bold" style={{ color: vendor.accent }}>
          {initials(vendor.name)}
        </span>
      )}
    </div>
  );
}

function Backing({
  backing,
  t,
}: {
  backing: VendorProfile["backing"];
  t: (k: StringKey) => string;
}) {
  return backing === "quoted" ? (
    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
      <ShieldCheck size={10} /> {t("vendorsQuoted")}
    </span>
  ) : (
    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
      <TriangleAlert size={10} /> {t("vendorsAssumed")}
    </span>
  );
}

function VendorDetail({
  row,
  tSection,
  tSubCategory,
  t,
}: {
  row: {
    vendor: VendorProfile;
    lines: ComputedLine[];
    sections: string[];
    value: number;
  };
  tSection: (v: string) => string;
  tSubCategory: (v: string) => string;
  t: (k: StringKey, vars?: Record<string, string | number>) => string;
}) {
  const bySection = useMemo(() => {
    const map = new Map<string, ComputedLine[]>();
    for (const l of row.lines) {
      if (!map.has(l.item.section)) map.set(l.item.section, []);
      map.get(l.item.section)!.push(l);
    }
    return Array.from(map.entries());
  }, [row.lines]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-navy/40 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span
            className="tam-diamond"
            style={{ backgroundColor: row.vendor.accent }}
          />
          {t("vendorsDetailTitle", { name: row.vendor.name })}
        </h2>
        {row.lines.length > 0 && (
          <span className="num text-sm font-bold text-gold">{money(row.value)}</span>
        )}
      </div>

      {row.lines.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-lavender-light/50">
          {t("vendorsDetailEmpty", { name: row.vendor.name })}
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {bySection.map(([section, lines]) => (
            <div key={section} className="px-5 py-3">
              <h3 className="mb-2 text-xs font-semibold text-lavender-light/70">
                {tSection(section)}
              </h3>
              <ul className="space-y-1.5">
                {lines.map((l) => (
                  <li
                    key={l.item.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-white">{l.item.name}</span>
                      <span className="ms-2 text-[11px] text-lavender-light/45">
                        {tSubCategory(l.item.subCategory)}
                      </span>
                    </div>
                    <span className="num shrink-0 text-xs text-lavender-light/50">
                      {l.qty} x {money(l.unitPrice)}
                    </span>
                    <span className="num w-24 shrink-0 text-end text-sm font-semibold text-white">
                      {money(l.totalCost)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
