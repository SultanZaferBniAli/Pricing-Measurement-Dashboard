/**
 * Where a budget gets priced. Two ways in: talk to the AI analyst (upload RFP
 * parts or describe the scope), or pick lines from the catalog by hand. Both
 * feed the same budget and the same review page.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Boxes, Pencil, Sparkles } from "lucide-react";
import { AiChat } from "../components/AiChat";
import { AiProcessPanel } from "../components/AiProcessPanel";
import { WbsTable } from "../components/WbsTable";
import { Button, Card, cx } from "../components/ui";
import { ai as aiApi, type AiStatus, type Attachment } from "../lib/api";
import { extractFile } from "../lib/extract";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { BudgetSummary } from "../lib/useTotals";
import { Dashboard } from "./Dashboard";

type Mode = "ai" | "manual";

export function PricingWorkspace({
  budget,
  onEditProject,
  onReview,
  onOpenExport,
}: {
  budget: BudgetSummary;
  onEditProject: () => void;
  onReview: () => void;
  onOpenExport: (id: string) => void;
}) {
  const { t } = useT();
  const project = useStore((s) => s.project);
  const run = useStore((s) => s.ai);
  const sessionId = useStore((s) => s.aiSessionId);
  const aiBegin = useStore((s) => s.aiBegin);
  const aiApply = useStore((s) => s.aiApply);
  const aiFinish = useStore((s) => s.aiFinish);
  const [mode, setMode] = useState<Mode>("ai");
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [model, setModel] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    aiApi
      .status()
      .then((s) => {
        setStatus(s);
        setModel((m) => m || s.model);
      })
      .catch(() => setStatus(null));
  }, []);

  // A page refresh mid-run loses the stream; make sure the UI is not stuck.
  useEffect(() => {
    if (run.running && !abortRef.current) aiFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string, files: File[]) {
    if (!project) return;
    const extracted = await Promise.all(files.map(extractFile));
    const failed = extracted.filter((f) => f.error || (!f.image && f.chars === 0));
    const attachments: Attachment[] = extracted
      .filter((f) => !f.error && (f.image || f.chars > 0))
      .map((f) => (f.image ? { name: f.name, image: f.image } : { name: f.name, text: f.text.slice(0, 400_000) }));
    const label = failed.length ? `${text}\n(${t("rfpUnreadable", { files: failed.map((f) => f.name).join(", ") })})` : text;
    aiBegin(label || t("chatAttachedOnly"), attachments.map((a) => a.name));
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (sessionId) await aiApi.continue(sessionId, text || t("chatAttachedOnly"), attachments, aiApply, controller.signal);
      else await aiApi.start(project, text, attachments, aiApply, controller.signal, model || undefined);
      aiFinish();
    } catch (err) {
      aiFinish((err as Error).name === "AbortError" ? t("chatStopped") : (err as Error).message);
    } finally {
      abortRef.current = null;
    }
  }

  if (!project) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* header: the brief, the mode, the way onward */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-ink">{project.title}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
            <span>{project.client}</span>
            <span className="text-ink-muted">·</span>
            <span>{t(`ptype_${project.projectType}` as never) ?? project.projectType}</span>
            {project.location && (
              <>
                <span className="text-ink-muted">·</span>
                <span>{project.location}</span>
              </>
            )}
            <button onClick={onEditProject} className="ms-1 inline-flex items-center gap-1 text-xs text-brand hover:underline">
              <Pencil size={12} /> {t("wsEditProject")}
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" className="flex rounded-xl border border-line bg-surface p-0.5">
            <ModeTab active={mode === "ai"} onClick={() => setMode("ai")} icon={<Sparkles size={14} />} label={t("wsModeAi")} />
            <ModeTab active={mode === "manual"} onClick={() => setMode("manual")} icon={<Boxes size={14} />} label={t("wsModeManual")} count={budget.catalogSelectedCount} />
          </div>
          <Button onClick={onReview} disabled={budget.selectedCount === 0}>
            {t("summaryReview")} <ArrowRight size={15} />
          </Button>
        </div>
      </div>

      {mode === "manual" ? (
        <Dashboard budget={budget} onOpenExport={onOpenExport} onReview={onReview} embedded />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* left: the conversation */}
          <Card className="flex min-h-[32rem] flex-col overflow-hidden xl:h-[calc(100vh-11rem)] xl:min-h-0">
            <header className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Sparkles size={15} className="text-brand" />
              <h2 className="flex-1 text-sm font-semibold text-ink">{t("wsChatTitle")}</h2>
              {status && status.provider === "mock" && <span className="text-[11px] text-ink-muted">{t("wsMock")}</span>}
              {status && status.provider !== "mock" && !status.ready && <span className="text-[11px] text-warn">{t("wsNoKey")}</span>}
              {status && status.provider !== "mock" && status.ready && (
                sessionId ? (
                  <span className="text-[11px] text-ink-muted">{run.provider?.split(" · ")[1] ?? model}</span>
                ) : (
                  <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                    {t("wsModel")}
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="cursor-pointer rounded-control border border-line bg-bg/60 px-2 py-1 text-[11px] text-ink focus:outline-none"
                    >
                      {status.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              )}
            </header>
            <AiChat
              chat={run.chat}
              running={run.running}
              hasSession={Boolean(sessionId)}
              ready={Boolean(status?.ready)}
              onSend={send}
              onStop={() => abortRef.current?.abort()}
            />
          </Card>

          {/* right: the process, then the priced list */}
          <div className="flex min-h-0 flex-col gap-4 xl:h-[calc(100vh-11rem)]">
            <Card className="flex max-h-[40%] min-h-[14rem] flex-col overflow-hidden">
              <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                <h2 className="flex-1 text-sm font-semibold text-ink">{t("wsProcessTitle")}</h2>
                {run.usage.outputTokens > 0 && (
                  <span className="num text-[11px] text-ink-muted">
                    {t("wsTokens", { in: run.usage.inputTokens.toLocaleString("en-US"), out: run.usage.outputTokens.toLocaleString("en-US") })}
                  </span>
                )}
              </header>
              <AiProcessPanel run={run} />
            </Card>
            <Card className="flex min-h-[16rem] flex-1 flex-col overflow-hidden">
              <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                <h2 className="flex-1 text-sm font-semibold text-ink">{t("wsItemsTitle")}</h2>
                {budget.aiLines.length > 0 && (
                  <span className="num text-xs font-semibold text-ink">
                    {money(budget.aiTotals.base)} <span className="font-normal text-ink-muted">SAR {t("wsBase")}</span>
                  </span>
                )}
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <WbsTable budget={budget} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeTab({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        "flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-active text-brand" : "text-ink-2 hover:text-ink"
      )}
    >
      {icon}
      {label}
      {count ? <span className="num rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-on-brand">{count}</span> : null}
    </button>
  );
}
