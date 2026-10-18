/**
 * Every budget saved to the platform, newest first. Admins see everyone's;
 * users see their own. Opening one loads it back into the workspace.
 */
import { useEffect, useState } from "react";
import { FolderOpen, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { ProjectMark, StatusBadge } from "../components/dashboard";
import { OwnerChip } from "../components/OwnerChip";
import { Button, Card, Diamond } from "../components/ui";
import { budgets as budgetsApi, type SavedBudgetSummary } from "../lib/api";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";

export function BudgetsList({ onOpen }: { onOpen: () => void }) {
  const { t } = useT();
  const user = useStore((s) => s.user);
  const [rows, setRows] = useState<SavedBudgetSummary[] | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  async function load() {
    setError("");
    try {
      const { budgets } = await budgetsApi.list();
      setRows(budgets);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function open(id: string) {
    const { budget } = await budgetsApi.get(id);
    const s = useStore.getState();
    s.startNewBudget();
    s.setProject(budget.project);
    s.setPricing({
      items: budget.lines.map((l) => ({ ...l, sourceRef: l.sourceRef ?? "" })),
      assumptions: [],
      summary: "",
    });
    s.setSavedBudgetId(budget.id);
    onOpen();
  }

  async function remove(id: string) {
    await budgetsApi.remove(id);
    setConfirm(null);
    load();
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <Diamond />
          <div>
            <h1 className="text-2xl font-bold text-ink">{t("budgetsTitle")}</h1>
            <p className="text-sm text-ink-2">{user?.role === "admin" ? t("budgetsSubAdmin") : t("budgetsSub")}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw size={14} /> {t("budgetsRefresh")}
        </Button>
      </div>

      {error && <p className="rounded-control border border-bad/30 bg-bad-bg px-3 py-2 text-sm text-bad">{error}</p>}

      <Card className="overflow-hidden">
        {rows === null ? (
          <p className="flex items-center gap-2 px-5 py-6 text-sm text-ink-2">
            <Loader2 size={15} className="animate-spin" /> {t("budgetsLoading")}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-2">{t("budgetsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <ProjectMark name={b.project.title || "?"} />
                <button onClick={() => open(b.id)} className="min-w-0 flex-1 text-start">
                  <span className="block truncate text-sm font-medium text-ink hover:text-brand">{b.project.title || t("untitledBudget")}</span>
                  <span className="block truncate text-xs text-ink-2">
                    {b.project.client || t("recentNoClient")} · {t(`ptype_${b.project.projectType}` as never) ?? b.project.projectType} ·{" "}
                    <span className="num">{b.lineCount}</span> {t("budgetsLines")}
                  </span>
                </button>
                <span className="hidden w-36 shrink-0 sm:block">
                  <OwnerChip name={b.userName} email={b.userEmail} picture={b.userPicture} />
                </span>
                <StatusBadge tone={b.aiSessionId ? "info" : "neutral"}>{b.aiSessionId ? t("budgetsAi") : t("budgetsManual")}</StatusBadge>
                <span className="num w-28 shrink-0 text-end text-sm font-semibold text-ink">{money(b.totals.total)}</span>
                <span className="num hidden w-20 shrink-0 text-end text-xs text-ink-muted sm:block">{b.updatedAt.slice(0, 10)}</span>
                <button onClick={() => open(b.id)} title={t("historyOpen")} className="rounded-md p-1.5 text-ink-muted hover:bg-hover hover:text-ink">
                  <FolderOpen size={15} />
                </button>
                <button
                  onClick={() => (confirm === b.id ? remove(b.id) : setConfirm(b.id))}
                  onBlur={() => setConfirm(null)}
                  title={confirm === b.id ? t("historyConfirm") : t("historyDelete")}
                  className={confirm === b.id ? "rounded-md bg-bad/20 p-1.5 text-bad" : "rounded-md p-1.5 text-ink-muted hover:text-bad"}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
