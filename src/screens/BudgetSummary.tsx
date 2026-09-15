/** Screen 3 - Selected Budget Summary: review, edit qty/notes, totals, export. */
import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Printer,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { QtyStepper } from "../components/QtyStepper";
import { Badge, Button, Card, Diamond, MatchBadge } from "../components/ui";
import { money, sar } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import { useBudget } from "../lib/useTotals";

export function BudgetSummary({ onBrowse }: { onBrowse: () => void }) {
  const { t, tSection, tSubCategory, tType } = useT();
  const budget = useBudget();
  const data = useStore((s) => s.data);
  const selections = useStore((s) => s.selections);
  const budgetTitle = useStore((s) => s.budgetTitle);
  const setBudgetTitle = useStore((s) => s.setBudgetTitle);
  const client = useStore((s) => s.client);
  const setClient = useStore((s) => s.setClient);
  const setQty = useStore((s) => s.setQty);
  const setNote = useStore((s) => s.setNote);
  const toggleItem = useStore((s) => s.toggleItem);
  const clearAll = useStore((s) => s.clearAll);
  const saveToHistory = useStore((s) => s.saveToHistory);
  const [exporting, setExporting] = useState(false);

  const { lines, priced, unpricedSelected, totals } = budget;

  async function handleExport() {
    setExporting(true);
    try {
      // Lazy-load the ExcelJS-backed export so it stays out of the main bundle.
      const { downloadBudget } = await import("../lib/excelExport");
      await downloadBudget(data, selections, budgetTitle, client);
      // A downloaded budget is one worth keeping, so the export is what files it
      // into the sidebar's history. Selections are stored whole so it reopens.
      saveToHistory({
        title: budgetTitle,
        client,
        base: totals.base,
        fee: totals.fee,
        grand: totals.grand,
        itemCount: lines.length,
        selections,
      });
    } finally {
      setExporting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="animate-fade-in">
        <Card className="p-12 text-center">
          <FileSpreadsheet className="mx-auto text-lavender-light/30 mb-4" size={40} />
          <h2 className="text-lg font-semibold text-white">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-lavender-light/60">
            {t("emptyBody")}
          </p>
          <Button className="mt-5" onClick={onBrowse}>
            {t("backToBuilder")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in print:space-y-3">
      {/* header + actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Diamond className="mt-3 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <label
                htmlFor="budget-title"
                className="text-xs text-lavender-light/50"
              >
                {t("budgetTitleLabel")}
              </label>
              <input
                id="budget-title"
                value={budgetTitle}
                onChange={(e) => setBudgetTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                className="block w-full border-b border-white/10 bg-transparent text-2xl font-bold text-white placeholder:text-lavender-light/30 hover:border-white/20 focus:border-electric focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="budget-client" className="text-xs text-lavender-light/50">
                {t("clientLabel")}
              </label>
              <input
                id="budget-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={t("clientPlaceholder")}
                className="block w-full max-w-md border-b border-white/10 bg-transparent text-base text-lavender-light placeholder:text-lavender-light/30 hover:border-white/20 focus:border-electric focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer size={15} /> {t("print")}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Trash2 size={15} /> {t("clearAll")}
          </Button>
          <Button variant="gold" onClick={handleExport} disabled={exporting}>
            <Download size={16} /> {exporting ? t("exporting") : t("exportExcel")}
          </Button>
        </div>
      </div>

      {/* totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-lavender-light/60">
            {t("totalBaseCost")}
          </div>
          <div className="mt-1 text-2xl font-bold text-white num">{money(totals.base)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-lavender-light/60">
            {t("totalFees")}
          </div>
          <div className="mt-1 text-2xl font-bold text-lavender-light num">
            {money(totals.fee)}
          </div>
        </Card>
        <Card className="p-4 bg-tam-gradient border-electric/40">
          <div className="text-xs uppercase tracking-wider text-lavender-light/80">
            {t("grandTotal")}
          </div>
          <div className="mt-1 text-2xl font-bold text-white num">{sar(totals.grand)}</div>
        </Card>
      </div>

      {unpricedSelected.length > 0 && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 flex items-start gap-3">
          <TriangleAlert size={18} className="text-gold mt-0.5 shrink-0" />
          <div className="text-sm text-gold/90">
            <span className="font-semibold">
              {unpricedSelected.length === 1
                ? t("unpricedCalloutOne")
                : t("unpricedCalloutMany", { n: unpricedSelected.length })}
            </span>{" "}
            {unpricedSelected.length === 1
              ? t("unpricedCalloutTailOne")
              : t("unpricedCalloutTailMany")}
          </div>
        </div>
      )}

      {/* priced lines table */}
      <Card className="overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-navy/60 text-[10px] uppercase tracking-wider text-lavender-light/50 border-b border-white/5">
          <div className="col-span-4">{t("colItem")}</div>
          <div className="col-span-2">{t("colSection")}</div>
          <div className="col-span-1 text-center">{t("colQty")}</div>
          <div className="col-span-1 text-end">{t("colUnit")}</div>
          <div className="col-span-1 text-end">{t("colBase")}</div>
          <div className="col-span-1 text-end">{t("colFee")}</div>
          <div className="col-span-1 text-end">{t("colTotal")}</div>
          <div className="col-span-1" />
        </div>
        <div className="divide-y divide-white/5">
          {priced.map((l) => (
            <div key={l.item.id} className="px-4 py-3">
              <div className="flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center">
                <div className="md:col-span-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {l.item.name}
                    </span>
                    {l.customPrice ? <Badge tone="gold">{t("badgeCustom")}</Badge> : null}
                    {l.item.percentBasis ? (
                      <Badge tone="gold">{l.percentRate}%</Badge>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-lavender-light/50">
                    {l.item.percentBasis
                      ? `${tSubCategory(l.item.subCategory)} · ${t(
                          l.item.percentBasis === "budget"
                            ? "percentOfBudgetBase"
                            : "percentOfSectionBase",
                          {
                            rate: l.percentRate ?? 0,
                            base: money(l.percentOfBase ?? 0),
                          }
                        )}`
                      : `${tSubCategory(l.item.subCategory)} · ${tType(l.item.type)}`}
                  </div>
                </div>
                <div className="md:col-span-2 text-xs text-lavender-light/70">
                  {tSection(l.item.section)}
                  <div className="mt-0.5">
                    <MatchBadge status={l.item.matchStatus} />
                  </div>
                </div>
                <div className="flex items-center gap-2 md:col-span-1 md:justify-center">
                  <span className="text-[10px] uppercase text-lavender-light/40 md:hidden">
                    {t("colQty")}
                  </span>
                  {l.item.percentBasis ? (
                    // A contingency is a single percentage line: quantity does
                    // not apply, so there is nothing to edit here.
                    <span className="num text-sm text-lavender-light/40">-</span>
                  ) : (
                    <QtyStepper value={l.qty} onChange={(n) => setQty(l.item.id, n)} />
                  )}
                </div>
                <div className="num hidden text-sm text-lavender-light/70 text-end md:col-span-1 md:block">
                  {money(l.unitPrice)}
                </div>
                <MoneyCell label={t("colBase")} value={money(l.baseCost)} />
                <MoneyCell label={t("colFee")} value={money(l.fee)} />
                <MoneyCell label={t("colTotal")} value={money(l.totalCost)} strong />
                <div className="flex justify-end md:col-span-1 print:hidden">
                  <button
                    onClick={() => toggleItem(l.item.id)}
                    className="text-lavender-light/40 hover:text-red-400 transition-colors"
                    title={t("removeItem")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {/* optional note */}
              <input
                value={l.note ?? ""}
                onChange={(e) => setNote(l.item.id, e.target.value)}
                placeholder={t("notePlaceholder")}
                className="mt-2 w-full bg-transparent text-xs text-lavender-light/70 placeholder:text-lavender-light/30 border-b border-transparent hover:border-white/10 focus:border-electric/40 focus:outline-none py-1 print:hidden"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* unpriced excluded list */}
      {unpricedSelected.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-gold">
            <TriangleAlert size={16} />
            <h3 className="font-semibold">{t("excludedTitle")}</h3>
          </div>
          <Card className="divide-y divide-white/5">
            {unpricedSelected.map((l) => (
              <div
                key={l.item.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{l.item.name}</div>
                  <div className="text-[11px] text-lavender-light/50 truncate">
                    {tSection(l.item.section)} · {tSubCategory(l.item.subCategory)} ·{" "}
                    {l.item.mappingNote}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone="missing">{t("qtyBadge", { n: l.qty })}</Badge>
                  <button
                    onClick={() => toggleItem(l.item.id)}
                    className="text-lavender-light/40 hover:text-red-400"
                    title={t("removeItem")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * One money figure. On a phone the column headers are gone, so the label rides
 * along with the value; from md up it is just the cell in the table.
 */
function MoneyCell({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 md:col-span-1 md:justify-end">
      <span className="text-[10px] uppercase text-lavender-light/40 md:hidden">
        {label}
      </span>
      <span
        className={
          strong
            ? "num text-sm font-semibold text-white text-end"
            : "num text-sm text-lavender-light/70 text-end"
        }
      >
        {value}
      </span>
    </div>
  );
}
