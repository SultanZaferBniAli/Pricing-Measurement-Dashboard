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
  History,
  Handshake,
  LayoutGrid,
  Languages,
  Settings2,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { TamLogo } from "./TamLogo";
import { Button, cx } from "./ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { BudgetSummary } from "../lib/useTotals";

export type View = "builder" | "vendors" | "summary" | "admin";

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
  const restoreFromHistory = useStore((s) => s.restoreFromHistory);
  const removeFromHistory = useStore((s) => s.removeFromHistory);
  const budgetTitle = useStore((s) => s.budgetTitle);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const go = (v: View) => {
    onNavigate(v);
    onCloseMobile?.();
  };

  const restore = (id: string) => {
    restoreFromHistory(id);
    go("summary");
  };

  return (
    <div className="flex h-full flex-col border-e border-white/5 bg-surface/60">
      {/* brand */}
      <div className="flex items-center justify-between gap-2 px-5 py-4">
        <button onClick={() => go("builder")} aria-label={t("appHome")}>
          <TamLogo />
        </button>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label={t("closeMenu")}
            className="rounded-lg p-1.5 text-lavender-light/60 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <RailButton
          active={view === "builder"}
          onClick={() => go("builder")}
          icon={<LayoutGrid size={16} />}
        >
          {t("navOverview")}
        </RailButton>
        <RailButton
          active={view === "vendors"}
          onClick={() => go("vendors")}
          icon={<Handshake size={16} />}
        >
          {t("navVendors")}
        </RailButton>

        <p className="flex items-center gap-2 px-3 pb-2 pt-5 text-xs font-medium text-lavender-light/40">
          <History size={13} />
          {t("navHistory")}
        </p>

        {history.length === 0 ? (
          <p className="px-3 text-xs leading-relaxed text-lavender-light/35">
            {t("historyEmpty")}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {history.map((h) => {
              const isCurrent = h.title.trim() === budgetTitle.trim();
              return (
                <li key={h.id} className="group relative">
                  <button
                    onClick={() => restore(h.id)}
                    title={t("historyRestore")}
                    className={cx(
                      "w-full rounded-xl px-3 py-2 pe-8 text-start transition-colors",
                      isCurrent ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="block truncate text-sm text-lavender-light group-hover:text-white">
                      {h.title || t("untitledBudget")}
                    </span>
                    <span className="mt-0.5 flex items-baseline justify-between gap-2">
                      <span className="num truncate text-xs text-gold/80">
                        {money(h.grand)}
                      </span>
                      <span className="num shrink-0 text-[10px] text-lavender-light/40">
                        {h.exportedAt.slice(0, 10)}
                      </span>
                    </span>
                    {h.client && (
                      <span className="block truncate text-[11px] text-lavender-light/45">
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
                        ? "bg-red-500/20 text-red-300"
                        : "text-lavender-light/30 opacity-0 hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
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

      {/* running total: the single home for this figure */}
      <div className="border-t border-white/5 px-4 py-4">
        <p className="text-xs text-lavender-light/50">{t("sidebarTotalLabel")}</p>
        {budget.selectedCount === 0 ? (
          <p className="mt-1 text-sm text-lavender-light/40">{t("sidebarEmpty")}</p>
        ) : (
          <>
            <p className="num mt-0.5 text-2xl font-bold text-white">
              {money(budget.totals.grand)}{" "}
              <span className="text-sm font-normal text-lavender-light/60">SAR</span>
            </p>
            <p className="num mt-0.5 text-xs text-lavender-light/50">
              {t("sidebarBaseFee", {
                base: money(budget.totals.base),
                fee: money(budget.totals.fee),
              })}
            </p>
          </>
        )}
        <Button
          className="mt-3 w-full"
          onClick={() => go("summary")}
          disabled={!budget.selectedCount}
        >
          <ShoppingCart size={16} /> {t("barReview")}
        </Button>

        <div className="mt-3 flex items-center justify-between">
          <RailButton
            active={view === "admin"}
            onClick={() => go("admin")}
            icon={<Settings2 size={15} />}
            compact
          >
            {t("navAdmin")}
          </RailButton>
          <button
            onClick={() => setLanguage(lang === "ar" ? "en" : "ar")}
            aria-label={t("langToggleLabel")}
            title={t("langToggleLabel")}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-lavender-light/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Languages size={15} />
            {t("langToggle")}
          </button>
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
          ? "bg-electric/20 text-white"
          : "text-lavender-light/70 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
