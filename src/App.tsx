/**
 * App shell: a persistent sidebar plus the active view.
 *
 * The sidebar carries navigation, the per-section rollup and the running grand
 * total, which is why there is no sticky totals bar along the bottom any more:
 * that bar and the old KPI cards were showing the same figures twice.
 */
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar, type View } from "./components/Sidebar";
import { TamLogo } from "./components/TamLogo";
import { money } from "./lib/format";
import { useT } from "./lib/i18n";
import { useBudget } from "./lib/useTotals";
import { Admin } from "./screens/Admin";
import { BudgetSummary } from "./screens/BudgetSummary";
import { Dashboard } from "./screens/Dashboard";
import { HistoryView } from "./screens/HistoryView";
import { Vendors } from "./screens/Vendors";

export default function App() {
  const [view, setView] = useState<View>({ name: "builder" });
  const [menuOpen, setMenuOpen] = useState(false);
  const budget = useBudget();
  const { t, lang, dir } = useT();

  // Mirror the whole document, so Tailwind's logical properties, form controls
  // and the native scrollbar all flip with the language.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const nav = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* desktop rail */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block print:hidden">
        <Sidebar view={view} onNavigate={nav} budget={budget} />
      </aside>

      {/* mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <button
            className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            aria-label={t("closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] shadow-card">
            <Sidebar
              view={view}
              onNavigate={nav}
              budget={budget}
              onCloseMobile={() => setMenuOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:ms-64">
        {/* mobile top bar: the rail is a drawer below lg */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-navy/85 px-4 py-3 backdrop-blur-md lg:hidden print:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t("openMenu")}
            className="rounded-lg p-1.5 text-lavender-light/80 hover:bg-white/5 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <TamLogo />
          {budget.selectedCount > 0 && (
            <span className="num ms-auto text-sm font-bold text-gold">
              {money(budget.totals.grand)}
            </span>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {view.name === "builder" && <Dashboard budget={budget} />}
          {view.name === "vendors" && <Vendors />}
          {view.name === "summary" && (
            <BudgetSummary onBrowse={() => nav({ name: "builder" })} />
          )}
          {view.name === "history" && (
            <HistoryView
              entryId={view.id}
              onBack={() => nav({ name: "builder" })}
              onOpened={() => nav({ name: "summary" })}
            />
          )}
          {view.name === "admin" && <Admin />}
        </main>
      </div>
    </div>
  );
}
