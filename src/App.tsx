/**
 * App shell: top bar (brand + nav), routed views, and a sticky budget bar that
 * surfaces the running grand total and a quick jump to the summary.
 */
import { useState } from "react";
import { LayoutDashboard, ListChecks, Settings2, ShoppingCart } from "lucide-react";
import { TamLogo } from "./components/TamLogo";
import { Button, cx } from "./components/ui";
import { money } from "./lib/format";
import { useBudget } from "./lib/useTotals";
import { Admin } from "./screens/Admin";
import { BudgetSummary } from "./screens/BudgetSummary";
import { Dashboard } from "./screens/Dashboard";

type View = { name: "dashboard" } | { name: "summary" } | { name: "admin" };

export default function App() {
  const [view, setView] = useState<View>({ name: "dashboard" });
  const budget = useBudget();
  const selectedCount = budget.selectedCount;

  const nav = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-navy text-white flex flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-navy/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <button onClick={() => nav({ name: "dashboard" })} aria-label="Home">
            <TamLogo />
          </button>
          <nav className="flex items-center gap-1">
            <NavButton
              active={view.name === "dashboard"}
              onClick={() => nav({ name: "dashboard" })}
              icon={<LayoutDashboard size={16} />}
            >
              Dashboard
            </NavButton>
            <NavButton
              active={view.name === "summary"}
              onClick={() => nav({ name: "summary" })}
              icon={<ListChecks size={16} />}
              badge={selectedCount || undefined}
            >
              Budget
            </NavButton>
            <NavButton
              active={view.name === "admin"}
              onClick={() => nav({ name: "admin" })}
              icon={<Settings2 size={16} />}
            >
              Admin
            </NavButton>
          </nav>
        </div>
      </header>

      {/* main content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 md:px-6 py-6 pb-28">
        {view.name === "dashboard" && <Dashboard budget={budget} />}
        {view.name === "summary" && (
          <BudgetSummary onBrowse={() => nav({ name: "dashboard" })} />
        )}
        {view.name === "admin" && <Admin />}
      </main>

      {/* sticky budget bar */}
      {view.name !== "summary" && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-surface/95 backdrop-blur-md print:hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-8 text-sm">
              <BudgetStat label="Selected" value={String(selectedCount)} />
              <BudgetStat label="Base" value={money(budget.totals.base)} />
              <BudgetStat
                label="Fees 15%"
                value={money(budget.totals.fee)}
                className="hidden sm:block"
              />
              <BudgetStat
                label="Grand Total"
                value={`${money(budget.totals.grand)} SAR`}
                accent
              />
            </div>
            <Button onClick={() => nav({ name: "summary" })} disabled={!selectedCount}>
              <ShoppingCart size={16} /> Review Budget
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  children,
  active,
  onClick,
  icon,
  badge,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "relative flex items-center gap-2 rounded-xl px-3 md:px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-electric/15 text-white"
          : "text-lavender-light/70 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
      {badge != null && (
        <span className="ml-0.5 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-navy num">
          {badge}
        </span>
      )}
    </button>
  );
}

function BudgetStat({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-lavender-light/50">
        {label}
      </div>
      <div
        className={cx(
          "num font-bold",
          accent ? "text-gold text-base md:text-lg" : "text-white"
        )}
      >
        {value}
      </div>
    </div>
  );
}
