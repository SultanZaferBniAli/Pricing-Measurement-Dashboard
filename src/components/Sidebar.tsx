/**
 * The app's left rail (right, in Arabic).
 *
 * It does two jobs at once: it navigates, and it reports. Each section row
 * carries its own selected count and subtotal, so the shape of the budget is
 * readable without opening anything. The running grand total lives in the
 * footer, and it is the ONLY place in the app that figure appears, which is why
 * there is no sticky bar along the bottom of the builder any more.
 *
 * "Budget" is deliberately not a nav item. The footer's "Review budget" button
 * already goes there, and two controls for one destination is one too many.
 */
import { LayoutGrid, Languages, Settings2, ShoppingCart, X } from "lucide-react";
import { TamLogo } from "./TamLogo";
import { Button, cx } from "./ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { BudgetSummary } from "../lib/useTotals";

export type View = "builder" | "summary" | "admin";

/** Accent per section, matching the spend chart so the two read as one system. */
const SECTION_DOT: Record<string, string> = {
  MARKETING: "#5E45FF",
  "EVENT MANAGEMENT": "#8A87F4",
  LOGISTICS: "#EBA036",
  "VIDEO PRODUCTIONS": "#6256F3",
};

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
  const { t, lang, tSection } = useT();
  const setLanguage = useStore((s) => s.setLanguage);
  const focusSection = useStore((s) => s.focusSection);
  const expanded = useStore((s) => s.expanded);

  const goToSection = (key: string) => {
    onNavigate("builder");
    focusSection(key);
    onCloseMobile?.();
  };

  const go = (v: View) => {
    onNavigate(v);
    onCloseMobile?.();
  };

  return (
    <div className="flex h-full flex-col bg-surface/60 border-e border-white/5">
      {/* brand */}
      <div className="flex items-center justify-between gap-2 px-5 py-4">
        <button onClick={() => go("builder")} aria-label={t("appHome")}>
          <TamLogo />
        </button>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label={t("closeMenu")}
            className="lg:hidden rounded-lg p-1.5 text-lavender-light/60 hover:bg-white/5 hover:text-white"
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

        <p className="px-3 pt-5 pb-2 text-xs font-medium text-lavender-light/40">
          {t("navSections")}
        </p>

        <ul className="space-y-0.5">
          {budget.bySection.map((s) => {
            const open = view === "builder" && expanded.includes(s.section.key);
            return (
              <li key={s.section.key}>
                <button
                  onClick={() => goToSection(s.section.key)}
                  className={cx(
                    "group w-full rounded-xl px-3 py-2 text-start transition-colors",
                    open ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className="tam-diamond shrink-0"
                      style={{ backgroundColor: SECTION_DOT[s.section.key] ?? "#8A87F4" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-lavender-light group-hover:text-white">
                      {tSection(s.section.name)}
                    </span>
                    {s.selectedCount > 0 && (
                      <span className="num shrink-0 rounded-full bg-electric/25 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {s.selectedCount}
                      </span>
                    )}
                  </span>
                  {/* the subtotal only earns its line once there is one */}
                  {s.totals.grand > 0 && (
                    <span className="num mt-0.5 block ps-[18px] text-xs text-gold/80">
                      {money(s.totals.grand)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
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
