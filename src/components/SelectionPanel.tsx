/**
 * What you have picked, kept beside the catalog.
 *
 * Without this, removing a line meant remembering which section it was in and
 * scrolling back to find it. Here every chosen line is one click from being
 * dropped, and the running total sits with the list rather than across the app.
 *
 * It is also the way from the catalog to the budget, which is why the review
 * button lives here now and not in the sidebar.
 */
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ShoppingCart, Trash2, X } from "lucide-react";
import { SECTION_ACCENT, SECTION_FALLBACK } from "./BudgetBar";
import { Button, cx } from "./ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { isContingency } from "../lib/pricing";
import { useStore } from "../lib/store";
import type { BudgetSummary } from "../lib/useTotals";

export function SelectionPanel({
  budget,
  onReview,
}: {
  budget: BudgetSummary;
  onReview: () => void;
}) {
  const { t, tSection } = useT();
  const toggleItem = useStore((s) => s.toggleItem);
  const clearAll = useStore((s) => s.clearAll);
  const setActiveSection = useStore((s) => s.setActiveSection);
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const { lines, totals, selectedCount, unpricedSelected } = budget;

  const bySection = useMemo(() => {
    const map = new Map<string, typeof lines>();
    for (const l of lines) {
      const k = l.item.sectionKey;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(l);
    }
    return Array.from(map.entries());
  }, [lines]);

  const body = (
    <>
      {selectedCount === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-2">
          {t("panelEmpty")}
        </p>
      ) : (
        <ul className="max-h-[min(52vh,26rem)] overflow-y-auto">
          {bySection.map(([key, sectionLines]) => (
            <li key={key}>
              <button
                onClick={() => setActiveSection(key)}
                className="flex w-full items-center gap-2 px-4 pb-1 pt-3 text-start"
                title={t("panelJump")}
              >
                <span
                  className="tam-diamond shrink-0"
                  style={{ backgroundColor: SECTION_ACCENT[key] ?? SECTION_FALLBACK }}
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-2">
                  {tSection(sectionLines[0].item.section)}
                </span>
                <span className="num text-xs text-ink-muted">
                  {sectionLines.length}
                </span>
              </button>

              <ul>
                {sectionLines.map((l) => (
                  <li
                    key={l.item.id}
                    className="group flex items-center gap-2 px-4 py-1.5 transition-colors hover:bg-hover"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">
                        {l.item.name}
                      </span>
                      <span className="num block text-[11px] text-ink-muted">
                        {isContingency(l.item)
                          ? `${l.percentRate ?? 0}%`
                          : `${l.qty} x ${
                              l.unitPrice != null ? money(l.unitPrice) : "-"
                            }`}
                      </span>
                    </span>
                    <span
                      className={cx(
                        "num shrink-0 text-xs font-semibold",
                        l.isUnpriced ? "text-warn" : "text-ink"
                      )}
                    >
                      {l.isUnpriced ? t("badgeUnpriced") : money(l.totalCost)}
                    </span>
                    <button
                      onClick={() => toggleItem(l.item.id)}
                      aria-label={t("panelRemove", { name: l.item.name })}
                      title={t("panelRemove", { name: l.item.name })}
                      className="shrink-0 rounded-md p-1 text-ink-muted opacity-0 transition-colors hover:bg-bad-bg hover:text-bad focus:opacity-100 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {/* running total and the way onward */}
      <div className="border-t border-line px-4 py-3">
        {unpricedSelected.length > 0 && (
          <p className="mb-2 rounded-control border border-warn/25 bg-warn-bg px-2.5 py-1.5 text-[11px] text-warn">
            {t("summaryUnpriced", { n: unpricedSelected.length })}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-ink-2">{t("finalTotal")}</span>
          <span className="num text-lg font-bold text-ink">
            {money(totals.total)}
            <span className="ms-1 text-xs font-normal text-ink-2">SAR</span>
          </span>
        </div>
        <p className="num mt-0.5 text-[11px] text-ink-muted">
          {t("sidebarBaseFeeVat", {
            base: money(totals.base),
            fee: money(totals.fee),
            vat: money(totals.vat),
          })}
        </p>

        <Button className="mt-3 w-full" onClick={onReview} disabled={!selectedCount}>
          {t("summaryReview")} <ArrowRight size={15} />
        </Button>

        {selectedCount > 0 && (
          <button
            onClick={() => (confirmClear ? clearAll() : setConfirmClear(true))}
            onBlur={() => setConfirmClear(false)}
            className={cx(
              "mt-2 flex w-full items-center justify-center gap-1.5 rounded-control px-2 py-1.5 text-xs transition-colors",
              confirmClear
                ? "bg-bad-bg text-bad"
                : "text-ink-2 hover:bg-hover hover:text-ink"
            )}
          >
            <Trash2 size={13} />
            {confirmClear ? t("panelClearConfirm") : t("clearAll")}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* desktop: a column that travels with the page */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <ShoppingCart size={15} className="text-brand" />
            <h2 className="flex-1 text-sm font-semibold text-ink">
              {t("panelTitle")}
            </h2>
            <span className="num rounded-full bg-active px-2 py-0.5 text-[11px] font-bold text-brand">
              {selectedCount}
            </span>
          </header>
          {body}
        </div>
      </aside>

      {/* below lg the same panel collapses to a bar you can open */}
      <div className="lg:hidden">
        <div className="min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-4 py-3 text-start"
          >
            <ShoppingCart size={15} className="text-brand" />
            <span className="flex-1 text-sm font-semibold text-ink">
              {t("panelTitle")}
            </span>
            <span className="num text-sm font-bold text-ink">
              {money(totals.total)}
            </span>
            <span className="num rounded-full bg-active px-2 py-0.5 text-[11px] font-bold text-brand">
              {selectedCount}
            </span>
            <ChevronDown
              size={16}
              className={cx(
                "shrink-0 text-ink-2 transition-transform duration-150",
                open && "rotate-180"
              )}
            />
          </button>
          {open && <div className="border-t border-line">{body}</div>}
        </div>
      </div>
    </>
  );
}
