/**
 * The app's left rail (right, in Arabic).
 *
 * It holds navigation, the budgets that have already been exported, and the
 * running grand total. The total is the ONLY place in the app that figure
 * appears, which is why there is no sticky bar along the bottom of the builder.
 *
 * "Budget" is deliberately not a nav item. The footer's "Review budget" button
 * already goes there, and two controls for one destination is one too many.
 */
import { useState } from "react";
import {
  Boxes,
  History,
  Handshake,
  Sparkles,
  LayoutGrid,
  Languages,
  Settings2,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { TamLogo } from "./TamLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Button, cx } from "./ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { BudgetSummary } from "../lib/useTotals";

export type View =
  | { name: "home" }
  | { name: "builder" }
  | { name: "vendors" }
  | { name: "summary" }
  | { name: "admin" }
  | { name: "history"; id: string };

export function Sidebar({
  view,
  onNavigate,
  budget,
  onCloseMobile,
}: {
  view: View;
  onNavigate: (v: View) => void;
  budget: BudgetSummary;
  onCloseMobile?: () => void;
}) {
  const { t, lang } = useT();
  const setLanguage = useStore((s) => s.setLanguage);
  const history = useStore((s) => s.history);
  const removeFromHistory = useStore((s) => s.removeFromHistory);
  const budgetTitle = useStore((s) => s.budgetTitle);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const go = (v: View) => {
    onNavigate(v);
    onCloseMobile?.();
  };

  const openEntry = (id: string) => go({ name: "history", id });

  return (
    <div className="flex h-full flex-col border-e border-line bg-rail">
      {/* brand */}
      <div className="flex items-center justify-between gap-2 px-5 py-4">
        <button
          onClick={() => go({ name: "home" })}
          aria-label={t("appHome")}
          className="flex min-w-0 items-center gap-2.5 text-start"
        >
          <TamLogo />
          <span className="min-w-0 truncate text-[11px] font-medium leading-tight text-ink-2">
            {t("productName")}
          </span>
        </button>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label={t("closeMenu")}
            className="rounded-lg p-1.5 text-ink-2 hover:bg-hover hover:text-ink lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <RailButton
          active={view.name === "home"}
          onClick={() => go({ name: "home" })}
          icon={<LayoutGrid size={16} />}
        >
          {t("navHome")}
        </RailButton>
        <RailButton
          active={view.name === "builder"}
          onClick={() => go({ name: "builder" })}
          icon={<Boxes size={16} />}
        >
          {t("navCatalog")}
        </RailButton>
        <RailButton
          active={view.name === "vendors"}
          onClick={() => go({ name: "vendors" })}
          icon={<Handshake size={16} />}
        >
          {t("navVendors")}
        </RailButton>

        <p className="flex items-center gap-2 px-3 pb-2 pt-5 text-xs font-medium text-ink-muted">
          <History size={13} />
          {t("navHistory")}
        </p>

        {history.length === 0 ? (
          <p className="px-3 text-xs leading-relaxed text-ink-muted">
            {t("historyEmpty")}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {history.map((h) => {
              const isCurrent =
                view.name === "history"
                  ? view.id === h.id
                  : h.title.trim() !== "" && h.title.trim() === budgetTitle.trim();
              return (
                <li key={h.id} className="group relative">
                  <button
                    onClick={() => openEntry(h.id)}
                    title={t("historyOpen")}
                    className={cx(
                      "w-full rounded-xl px-3 py-2 pe-8 text-start transition-colors",
                      isCurrent ? "bg-active" : "hover:bg-hover"
                    )}
                  >
                    <span className="block truncate text-sm text-ink-2 group-hover:text-ink">
                      {h.title || t("untitledBudget")}
                    </span>
                    <span className="mt-0.5 flex items-baseline justify-between gap-2">
                      <span className="num truncate text-xs text-warn">
                        {money(h.grand)}
                      </span>
                      <span className="num shrink-0 text-[10px] text-ink-muted">
                        {h.exportedAt.slice(0, 10)}
                      </span>
                    </span>
                    {h.client && (
                      <span className="block truncate text-[11px] text-ink-muted">
                        {h.client}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      confirmId === h.id ? removeFromHistory(h.id) : setConfirmId(h.id)
                    }
                    onBlur={() => setConfirmId(null)}
                    aria-label={t("historyDelete")}
                    title={confirmId === h.id ? t("historyConfirm") : t("historyDelete")}
                    className={cx(
                      "absolute end-1.5 top-2 rounded-md p-1.5 transition-colors",
                      confirmId === h.id
                        ? "bg-bad/20 text-bad"
                        : "text-ink-muted opacity-0 hover:text-bad focus:opacity-100 group-hover:opacity-100"
                    )}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* what the RFP tooling is for, said once */}
      <div className="mx-3 mb-3 rounded-card border border-brand/20 bg-active p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
          <Sparkles size={13} /> {t("aiCardTitle")}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink">
          {t("aiCardBody")}
        </p>
      </div>

      {/* running total: the single home for this figure */}
      <div className="border-t border-line px-4 py-4">
        <p className="text-xs text-ink-2">{t("finalTotal")}</p>
        {budget.selectedCount === 0 ? (
          <p className="mt-1 text-sm text-ink-muted">{t("sidebarEmpty")}</p>
        ) : (
          <>
            <p className="num mt-0.5 text-2xl font-bold text-ink">
              {money(budget.totals.total)}{" "}
              <span className="text-sm font-normal text-ink-2">SAR</span>
            </p>
            <p className="num mt-0.5 text-xs text-ink-2">
              {t("sidebarBaseFeeVat", {
                base: money(budget.totals.base),
                fee: money(budget.totals.fee),
                vat: money(budget.totals.vat),
              })}
            </p>
          </>
        )}
        <Button
          className="mt-3 w-full"
          onClick={() => go({ name: "summary" })}
          disabled={!budget.selectedCount}
        >
          <ShoppingCart size={16} /> {t("barReview")}
        </Button>

        <div className="mt-3 flex items-center justify-between gap-2">
          <RailButton
            active={view.name === "admin"}
            onClick={() => go({ name: "admin" })}
            icon={<Settings2 size={15} />}
            compact
          >
            {t("navAdmin")}
          </RailButton>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage(lang === "ar" ? "en" : "ar")}
              aria-label={t("langToggleLabel")}
              title={t("langToggleLabel")}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <Languages size={15} />
              {t("langToggle")}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

function RailButton({
  children,
  active,
  onClick,
  icon,
  compact,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-2.5 rounded-xl text-sm font-medium transition-colors",
        compact ? "px-2.5 py-2" : "w-full px-3 py-2.5",
        active
          ? "bg-active text-brand"
          : "text-ink-2 hover:bg-hover hover:text-ink"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
