/** Screen 3 - Selected Budget Summary: review, edit qty/notes, totals, export. */
import { useState } from "react";
import {
  Download,
  Plus,
  FileSpreadsheet,
  Printer,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { SECTION_ACCENT, SECTION_FALLBACK } from "../components/BudgetBar";
import { RfpCheck } from "../components/RfpCheck";
import { QtyStepper } from "../components/QtyStepper";
import { Badge, Button, Card, Diamond, MatchBadge, cx } from "../components/ui";
import { money, sar } from "../lib/format";
import { useT } from "../lib/i18n";
import { sumLines } from "../lib/pricing";
import { useStore } from "../lib/store";
import { useBudget } from "../lib/useTotals";
import type { ComputedLine } from "../lib/types";

export function BudgetSummary({ onBrowse }: { onBrowse: () => void }) {
  const { t, tSection, tSubCategory, tType } = useT();
  const budget = useBudget();
  const data = useStore((s) => s.data);
  const selections = useStore((s) => s.selections);
  const budgetTitle = useStore((s) => s.budgetTitle);
  const setBudgetTitle = useStore((s) => s.setBudgetTitle);
  const client = useStore((s) => s.client);
  const setClient = useStore((s) => s.setClient);
  const projectDate = useStore((s) => s.projectDate);
  const setProjectDate = useStore((s) => s.setProjectDate);
  const projectDescription = useStore((s) => s.projectDescription);
  const rfpText = useStore((s) => s.rfpText);
  const rfpFiles = useStore((s) => s.rfpFiles);
  const setProjectDescription = useStore((s) => s.setProjectDescription);
  const setQty = useStore((s) => s.setQty);
  const setNote = useStore((s) => s.setNote);
  const toggleItem = useStore((s) => s.toggleItem);
  const clearAll = useStore((s) => s.clearAll);
  const saveToHistory = useStore((s) => s.saveToHistory);
  const startNewBudget = useStore((s) => s.startNewBudget);
  const [exporting, setExporting] = useState(false);

  const { lines, priced, unpricedSelected, totals } = budget;

  // Grouped by section, so each line is read under the heading it belongs to
  // and the Section column no longer has to repeat itself on every row.
  const bySection = data.sections
    .map((section) => ({
      section,
      lines: priced.filter((l) => l.item.sectionKey === section.key),
      unpriced: unpricedSelected.filter((l) => l.item.sectionKey === section.key),
    }))
    .filter((g) => g.lines.length > 0 || g.unpriced.length > 0);

  async function handleExport() {
    setExporting(true);
    try {
      // Lazy-load the ExcelJS-backed export so it stays out of the main bundle.
      const { downloadBudget } = await import("../lib/excelExport");
      await downloadBudget(data, selections, budgetTitle, {
        client,
        projectDate,
        projectDescription,
      });
      // A downloaded budget is one worth keeping, so the export is what files it
      // into the sidebar's history. Selections are stored whole so it reopens.
      saveToHistory({
        title: budgetTitle,
        client,
        projectDate,
        projectDescription,
        rfpText,
        rfpFiles,
        base: totals.base,
        fee: totals.fee,
        grand: totals.grand,
        vat: totals.vat,
        total: totals.total,
        itemCount: lines.length,
        selections,
      });
      // Both the download and the history entry succeeded, so this budget is
      // finished and safely filed. Clear the desk and go back to the builder.
      startNewBudget();
      onBrowse();
    } finally {
      setExporting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="animate-fade-in">
        <Card className="p-12 text-center">
          <FileSpreadsheet className="mx-auto text-ink-muted mb-4" size={40} />
          <h2 className="text-lg font-semibold text-ink">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-ink-2">
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">{t("reviewTitle")}</h1>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="secondary" size="sm" onClick={onBrowse}>
            <Plus size={15} /> {t("addMoreItems")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer size={15} /> {t("print")}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Trash2 size={15} /> {t("clearAll")}
          </Button>
          <Button variant="warn" onClick={handleExport} disabled={exporting}>
            <Download size={16} /> {exporting ? t("exporting") : t("exportExcel")}
          </Button>
        </div>
      </div>

      {/* the brief: what this budget is for, and for whom */}
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <Diamond />
          {t("briefTitle")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="budget-title"
            label={t("projectLabel")}
            value={budgetTitle}
            onChange={setBudgetTitle}
            placeholder={t("projectPlaceholder")}
          />
          <Field
            id="budget-client"
            label={t("clientLabel")}
            value={client}
            onChange={setClient}
            placeholder={t("clientPlaceholder")}
          />
          <Field
            id="budget-date"
            label={t("dateLabel")}
            value={projectDate}
            onChange={setProjectDate}
            type="date"
          />
        </div>
        <div className="mt-4">
          <AreaField
            id="budget-project-desc"
            label={t("projectDescLabel")}
            value={projectDescription}
            onChange={setProjectDescription}
            placeholder={t("projectDescPlaceholder")}
          />
        </div>
      </Card>

      <div className="print:hidden">
        <RfpCheck />
      </div>

      {/* totals: base, fee, tax, then the one figure the client pays */}
      <Card className="overflow-hidden">
        <dl className="divide-y divide-line">
          <SummaryRow label={t("totalBaseCost")} value={money(totals.base)} />
          <SummaryRow label={t("totalFees")} value={money(totals.fee)} />
          <SummaryRow label={t("totalVat")} value={money(totals.vat)} />
          <div className="flex flex-wrap items-baseline justify-between gap-3 bg-active px-5 py-4">
            <dt className="text-sm font-semibold text-ink">{t("finalTotal")}</dt>
            <dd className="num text-2xl font-bold text-brand">
              {sar(totals.total)}
            </dd>
          </div>
        </dl>
      </Card>

      {unpricedSelected.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 flex items-start gap-3">
          <TriangleAlert size={18} className="text-warn mt-0.5 shrink-0" />
          <div className="text-sm text-warn">
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

      {/* one block per section */}
      {bySection.map(({ section, lines: sectionLines, unpriced: sectionUnpriced }) => {
        const st = sumLines(sectionLines);
        return (
        <Card key={section.key} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-bg/40 px-4 py-2.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span
                className="tam-diamond"
                style={{ backgroundColor: SECTION_ACCENT[section.key] ?? SECTION_FALLBACK }}
              />
              {tSection(section.name)}
            </h3>
            <span className="num text-sm font-bold text-warn">{money(st.grand)}</span>
          </div>
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-bg/60 text-[10px] uppercase tracking-wider text-ink-2 border-b border-line">
          <div className="col-span-6">{t("colItem")}</div>
          <div className="col-span-1 text-center">{t("colQty")}</div>
          <div className="col-span-1 text-end">{t("colUnit")}</div>
          <div className="col-span-1 text-end">{t("colBase")}</div>
          <div className="col-span-1 text-end">{t("colFee")}</div>
          <div className="col-span-1 text-end">{t("colTotal")}</div>
          <div className="col-span-1" />
        </div>
        <div className="divide-y divide-line">
          {sectionLines.map((l) => (
            <div key={l.item.id} className="px-4 py-3">
              <div className="flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center">
                <div className="md:col-span-6 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink truncate">
                      {l.item.name}
                    </span>
                    {l.customPrice ? <Badge tone="warn">{t("badgeCustom")}</Badge> : null}
                    {l.item.percentBasis ? (
                      <Badge tone="warn">{l.percentRate}%</Badge>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-ink-2">
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
                  <div className="mt-1">
                    <MatchBadge status={l.item.matchStatus} />
                  </div>
                </div>
                <div className="flex items-center gap-2 md:col-span-1 md:justify-center">
                  <span className="text-[10px] uppercase text-ink-muted md:hidden">
                    {t("colQty")}
                  </span>
                  {l.item.percentBasis ? (
                    // A contingency is a single percentage line: quantity does
                    // not apply, so there is nothing to edit here.
                    <span className="num text-sm text-ink-muted">-</span>
                  ) : (
                    <QtyStepper value={l.qty} onChange={(n) => setQty(l.item.id, n)} />
                  )}
                </div>
                <div className="num hidden text-sm text-ink-2 text-end md:col-span-1 md:block">
                  {money(l.unitPrice)}
                </div>
                <MoneyCell label={t("colBase")} value={money(l.baseCost)} />
                <MoneyCell label={t("colFee")} value={money(l.fee)} />
                <MoneyCell label={t("colTotal")} value={money(l.totalCost)} strong />
                <div className="flex justify-end md:col-span-1 print:hidden">
                  <button
                    onClick={() => toggleItem(l.item.id)}
                    className="text-ink-muted hover:text-bad transition-colors"
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
                className="mt-2 w-full bg-transparent text-xs text-ink-2 placeholder:text-ink-muted border-b border-transparent hover:border-line focus:border-brand/40 focus:outline-none py-1 print:hidden"
              />
            </div>
          ))}

          {/* the section's unpriced lines, on the same columns as the rest */}
          {sectionUnpriced.map((l) => (
            <UnpricedRow
              key={l.item.id}
              line={l}
              onRemove={() => toggleItem(l.item.id)}
              labels={{
                qty: t("colQty"),
                excluded: t("excludedTitle"),
                remove: t("removeItem"),
                meta: `${tSubCategory(l.item.subCategory)} · ${tType(l.item.type)}`,
              }}
            />
          ))}
        </div>
      </Card>
        );
      })}

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
      <span className="text-[10px] uppercase text-ink-muted md:hidden">
        {label}
      </span>
      <span
        className={
          strong
            ? "num text-sm font-semibold text-ink text-end"
            : "num text-sm text-ink-2 text-end"
        }
      >
        {value}
      </span>
    </div>
  );
}

/**
 * An unpriced line inside a section block. It rides the same 12-column grid as
 * the priced rows so the item name, quantity and money columns line up, rather
 * than sitting in a separate list with its own layout.
 */
function UnpricedRow({
  line,
  onRemove,
  labels,
}: {
  line: ComputedLine;
  onRemove: () => void;
  labels: { qty: string; excluded: string; remove: string; meta: string };
}) {
  const isPercent = line.item.percentBasis != null;
  return (
    <div className="bg-warn/[0.04] px-4 py-3">
      <div className="flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center">
        <div className="min-w-0 md:col-span-6">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">
              {line.item.name}
            </span>
            <Badge tone="missing">
              <TriangleAlert size={11} /> {labels.excluded}
            </Badge>
          </div>
          <div className="text-[11px] text-ink-2">{labels.meta}</div>
          {line.item.mappingNote && (
            <p className="mt-1 text-[11px] leading-snug text-ink-muted">
              {line.item.mappingNote}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 md:col-span-1 md:justify-center">
          <span className="text-[10px] uppercase text-ink-muted md:hidden">
            {labels.qty}
          </span>
          <span className="num text-sm text-ink-2">
            {isPercent ? "-" : line.qty}
          </span>
        </div>
        {/* the three money columns stay empty: this line contributes nothing */}
        <div className="hidden text-end md:col-span-1 md:block" />
        <div className="num hidden text-end text-sm text-ink-muted md:col-span-1 md:block">
          -
        </div>
        <div className="num hidden text-end text-sm text-ink-muted md:col-span-1 md:block">
          -
        </div>
        <div className="num hidden text-end text-sm text-ink-muted md:col-span-1 md:block">
          -
        </div>
        <div className="flex justify-end md:col-span-1 print:hidden">
          <button
            onClick={onRemove}
            className="text-ink-muted transition-colors hover:text-bad"
            title={labels.remove}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** A labelled single-line field in the brief. */
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(
          "mt-0.5 block w-full rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none",
          type === "date" && !value && "is-empty"
        )}
      />
    </div>
  );
}

/** A labelled multi-line field in the brief. */
function AreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-ink-2">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 block w-full resize-y rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
      />
    </div>
  );
}

/** One line of the budget summary. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="num text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
