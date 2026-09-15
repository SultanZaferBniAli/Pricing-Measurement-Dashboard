/**
 * A past budget, laid out as the document it is.
 *
 * The sidebar list answers "which budget"; this answers "what was in it". It
 * reads as a paper listing on purpose: the brief at the top, then every line
 * that was priced, grouped by section, with its own subtotal.
 *
 * Read-only by design for now. Editing a past export in place would quietly
 * change a figure somebody has already sent a client, so the way back in is
 * "Open in builder", which loads it as the working budget and leaves the
 * record alone until it is exported again.
 */
import { useMemo } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Printer, Trash2 } from "lucide-react";
import { SECTION_ACCENT } from "../components/BudgetBar";
import { Badge, Button, Card } from "../components/ui";
import { money, sar } from "../lib/format";
import { useT } from "../lib/i18n";
import { isContingency, resolveBudget, sumLines } from "../lib/pricing";
import { useStore } from "../lib/store";

export function HistoryView({
  entryId,
  onBack,
  onOpened,
}: {
  entryId: string;
  onBack: () => void;
  onOpened: () => void;
}) {
  const { t, tSection, tSubCategory, tType } = useT();
  const data = useStore((s) => s.data);
  const entry = useStore((s) => s.history.find((h) => h.id === entryId));
  const restoreFromHistory = useStore((s) => s.restoreFromHistory);
  const removeFromHistory = useStore((s) => s.removeFromHistory);

  // Re-price the stored selections against today's catalog, so the table shows
  // real line maths rather than four numbers and a count.
  const resolved = useMemo(
    () => (entry ? resolveBudget(data.sections, entry.selections) : null),
    [entry, data.sections]
  );

  const bySection = useMemo(() => {
    if (!entry || !resolved) return [];
    return data.sections
      .map((section) => ({
        section,
        lines: resolved.lines.filter((l) => l.item.sectionKey === section.key),
      }))
      .filter((g) => g.lines.length > 0);
  }, [entry, resolved, data.sections]);

  if (!entry || !resolved) {
    return (
      <Card className="p-12 text-center animate-fade-in">
        <FileSpreadsheet className="mx-auto mb-4 text-lavender-light/30" size={40} />
        <p className="text-sm text-lavender-light/60">{t("historyGone")}</p>
        <Button className="mt-5" onClick={onBack}>
          {t("backToBuilder")}
        </Button>
      </Card>
    );
  }

  const priced = resolved.lines.filter((l) => !l.isUnpriced);
  const unpriced = resolved.lines.filter((l) => l.isUnpriced);
  const totals = sumLines(priced);
  const drifted = Math.abs(totals.grand - entry.grand) > 0.5;

  return (
    <div className="space-y-5 animate-fade-in print:space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={onBack}
            className="mb-1 flex items-center gap-1.5 text-xs text-lavender-light/60 transition-colors hover:text-white print:hidden"
          >
            <ArrowLeft size={13} /> {t("backToBuilder")}
          </button>
          <h1 className="text-2xl font-bold text-white">
            {entry.title || t("untitledBudget")}
          </h1>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer size={15} /> {t("print")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              removeFromHistory(entry.id);
              onBack();
            }}
          >
            <Trash2 size={15} /> {t("historyDelete")}
          </Button>
          <Button
            onClick={() => {
              restoreFromHistory(entry.id);
              onOpened();
            }}
          >
            <Download size={15} /> {t("historyOpenInBuilder")}
          </Button>
        </div>
      </div>

      {/* the brief as it stood */}
      <Card className="p-5">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label={t("clientLabel")} value={entry.client || "-"} />
          <Fact label={t("dateLabel")} value={entry.projectDate || "-"} />
          <Fact label={t("historyExportedOn")} value={entry.exportedAt.slice(0, 10)} />
          <Fact
            label={t("historyRfpLabel")}
            value={entry.rfpFiles?.length ? entry.rfpFiles.join(", ") : "-"}
          />
        </dl>
        {entry.projectDescription && (
          <p className="mt-4 border-t border-white/5 pt-3 text-sm leading-relaxed text-lavender-light/70">
            {entry.projectDescription}
          </p>
        )}
      </Card>

      {drifted && (
        <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold/90">
          {t("historyDrift", {
            then: money(entry.grand),
            now: money(totals.grand),
          })}
        </p>
      )}

      {/* the listing */}
      {bySection.map(({ section, lines }) => {
        const st = sumLines(lines.filter((l) => !l.isUnpriced));
        return (
          <Card key={section.key} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-navy/40 px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span
                  className="tam-diamond"
                  style={{ backgroundColor: SECTION_ACCENT[section.key] ?? "#8A87F4" }}
                />
                {tSection(section.name)}
              </h2>
              <span className="num text-sm font-bold text-gold">{money(st.grand)}</span>
            </div>

            <div className="hidden grid-cols-12 gap-2 border-b border-white/5 bg-navy/20 px-4 py-2 text-[10px] uppercase tracking-wider text-lavender-light/50 md:grid">
              <div className="col-span-6">{t("colItem")}</div>
              <div className="col-span-1 text-center">{t("colQty")}</div>
              <div className="col-span-2 text-end">{t("colUnit")}</div>
              <div className="col-span-3 text-end">{t("colTotal")}</div>
            </div>

            <div className="divide-y divide-white/5">
              {lines.map((l) => (
                <div
                  key={l.item.id}
                  className="flex flex-col gap-1 px-4 py-2.5 md:grid md:grid-cols-12 md:items-center md:gap-2"
                >
                  <div className="min-w-0 md:col-span-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-white">{l.item.name}</span>
                      {l.isUnpriced && (
                        <Badge tone="missing">{t("excludedTitle")}</Badge>
                      )}
                      {l.customPrice ? <Badge tone="gold">{t("badgeCustom")}</Badge> : null}
                    </div>
                    <div className="text-[11px] text-lavender-light/50">
                      {tSubCategory(l.item.subCategory)} · {tType(l.item.type)}
                    </div>
                    {l.note && (
                      <p className="mt-0.5 text-[11px] italic text-lavender-light/45">
                        {l.note}
                      </p>
                    )}
                  </div>
                  <Cell label={t("colQty")} className="md:col-span-1 md:justify-center">
                    <span className="num text-sm text-lavender-light/70">
                      {isContingency(l.item) ? `${l.percentRate ?? 0}%` : l.qty}
                    </span>
                  </Cell>
                  <Cell label={t("colUnit")} className="md:col-span-2 md:justify-end">
                    <span className="num text-sm text-lavender-light/70">
                      {l.unitPrice != null ? money(l.unitPrice) : "-"}
                    </span>
                  </Cell>
                  <Cell label={t("colTotal")} className="md:col-span-3 md:justify-end">
                    <span className="num text-sm font-semibold text-white">
                      {l.isUnpriced ? "-" : money(l.totalCost)}
                    </span>
                  </Cell>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {/* the bottom line */}
      <Card className="overflow-hidden">
        <dl className="divide-y divide-white/5">
          <TotalRow label={t("totalBaseCost")} value={money(totals.base)} />
          <TotalRow label={t("totalFees")} value={money(totals.fee)} />
          <TotalRow label={t("grandTotal")} value={sar(totals.grand)} strong />
        </dl>
        {unpriced.length > 0 && (
          <p className="border-t border-white/5 bg-gold/[0.06] px-4 py-2.5 text-xs text-gold/80">
            {t("historyUnpricedNote", { n: unpriced.length })}
          </p>
        )}
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-lavender-light/50">{label}</dt>
      <dd className="truncate text-sm text-white" title={value}>
        {value}
      </dd>
    </div>
  );
}

/** A table cell that carries its own label once the columns are gone. */
function Cell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-2 ${className ?? ""}`}>
      <span className="text-[10px] uppercase text-lavender-light/40 md:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <dt className={strong ? "text-sm font-semibold text-white" : "text-sm text-lavender-light/70"}>
        {label}
      </dt>
      <dd
        className={
          strong
            ? "num text-lg font-bold text-gold"
            : "num text-sm text-lavender-light/70"
        }
      >
        {value}
      </dd>
    </div>
  );
}
