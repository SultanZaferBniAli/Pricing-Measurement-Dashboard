/**
 * App shell: sign-in gate, then a persistent sidebar plus the active view.
 *
 * The work runs: Home -> New budget (project information) -> Pricing
 * workspace (AI or catalog) -> Review -> save / export. The catalog builder
 * and vendors stay reachable on their own for browsing.
 */
import { useEffect, useState } from "react";
import { Loader2, Menu } from "lucide-react";
import { Sidebar, type View } from "./components/Sidebar";
import { ThemeToggle, useThemeEffect } from "./components/ThemeToggle";
import { TamLogo } from "./components/TamLogo";
import { auth } from "./lib/api";
import { money } from "./lib/format";
import { useT } from "./lib/i18n";
import { useStore } from "./lib/store";
import { useBudget } from "./lib/useTotals";
import { Admin } from "./screens/Admin";
import { BudgetsList } from "./screens/BudgetsList";
import { BudgetSummary } from "./screens/BudgetSummary";
import { Dashboard } from "./screens/Dashboard";
import { HistoryView } from "./screens/HistoryView";
import { Login } from "./screens/Login";
import { Overview } from "./screens/Overview";
import { PricingWorkspace } from "./screens/PricingWorkspace";
import { ProjectSetup } from "./screens/ProjectSetup";
import { Vendors } from "./screens/Vendors";

export default function App() {
  const [view, setView] = useState<View>({ name: "home" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const project = useStore((s) => s.project);
  const budget = useBudget();
  const { t, lang, dir } = useT();
  useThemeEffect();

  // Mirror the whole document, so Tailwind's logical properties, form controls
  // and the native scrollbar all flip with the language.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  // Ask the server who is signed in before showing anything.
  useEffect(() => {
    auth
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, [setUser]);

  const nav = (v: View) => {
    // The workspace needs a brief; send anyone without one through setup.
    // Read the store directly: this runs right after setProject, before the
    // closure above has re-rendered with the new value.
    if (v.name === "workspace" && !useStore.getState().project) v = { name: "setup" };
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-ink-2">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* desktop rail */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block print:hidden">
        <Sidebar view={view} onNavigate={nav} budget={budget} />
      </aside>

      {/* mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <button className="absolute inset-0 bg-bg/80 backdrop-blur-sm" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] shadow-card">
            <Sidebar view={view} onNavigate={nav} budget={budget} onCloseMobile={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:ms-64">
        {/* mobile top bar: the rail is a drawer below lg */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/85 px-4 py-3 backdrop-blur-md lg:hidden print:hidden">
          <button onClick={() => setMenuOpen(true)} aria-label={t("openMenu")} className="rounded-lg p-1.5 text-ink-2 hover:bg-hover hover:text-ink">
            <Menu size={20} />
          </button>
          <TamLogo />
          {budget.selectedCount > 0 && <span className="num ms-auto text-sm font-bold text-brand">{money(budget.totals.total)}</span>}
          <ThemeToggle className={budget.selectedCount > 0 ? "" : "ms-auto"} />
        </header>

        <main className="mx-auto w-full max-w-[96rem] px-4 py-6 md:px-10 md:py-10">
          {view.name === "home" && (
            <Overview
              budget={budget}
              onNew={() => nav({ name: "setup" })}
              onContinue={() => nav({ name: "workspace" })}
              onReview={() => nav({ name: "summary" })}
              onVendors={() => nav({ name: "vendors" })}
              onOpenHistory={(id) => nav({ name: "history", id })}
              onBudgets={() => nav({ name: "budgets" })}
            />
          )}
          {view.name === "setup" && (
            <ProjectSetup onDone={() => nav({ name: "workspace" })} onCancel={() => nav(project ? { name: "workspace" } : { name: "home" })} />
          )}
          {view.name === "workspace" && (
            <PricingWorkspace
              budget={budget}
              onEditProject={() => nav({ name: "setup" })}
              onReview={() => nav({ name: "summary" })}
              onOpenExport={(id) => nav({ name: "history", id })}
            />
          )}
          {view.name === "builder" && <Dashboard budget={budget} onOpenExport={(id) => nav({ name: "history", id })} onReview={() => nav({ name: "summary" })} />}
          {view.name === "vendors" && <Vendors />}
          {view.name === "summary" && <BudgetSummary onBrowse={() => nav(project ? { name: "workspace" } : { name: "builder" })} onSaved={() => nav({ name: "budgets" })} />}
          {view.name === "history" && <HistoryView entryId={view.id} onBack={() => nav({ name: "builder" })} onOpened={() => nav({ name: "summary" })} />}
          {view.name === "budgets" && <BudgetsList onOpen={() => nav({ name: "workspace" })} />}
          {view.name === "admin" && user.role === "admin" && <Admin />}
        </main>
      </div>
    </div>
  );
}
