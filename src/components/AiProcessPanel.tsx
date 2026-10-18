/**
 * The AI's working, shown as it happens: which of the four steps it is on,
 * what it noted, every search it ran and what came back, and the summary of
 * its reasoning. Nothing in the budget appears without a trace here.
 */
import { useEffect, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  Circle,
  Database,
  FileSearch,
  Globe,
  ListTree,
  Loader2,
  MessageSquareText,
  Receipt,
  TriangleAlert,
} from "lucide-react";
import { cx } from "./ui";
import { useT } from "../lib/i18n";
import type { AiRunState } from "../lib/store";
import type { ProcessEntry } from "../lib/types";

export function AiProcessPanel({ run }: { run: AiRunState }) {
  const { t } = useT();
  const [showThinking, setShowThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run.log.length]);

  const steps: { n: 1 | 2 | 3 | 4; label: string }[] = [
    { n: 1, label: t("aiStep1") },
    { n: 2, label: t("aiStep2") },
    { n: 3, label: t("aiStep3") },
    { n: 4, label: t("aiStep4") },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* the four steps */}
      <ol className="grid grid-cols-4 gap-1 border-b border-line px-3 py-3">
        {steps.map((s) => {
          const state = run.steps[s.n];
          return (
            <li
              key={s.n}
              className={cx(
                "flex items-center gap-1.5 rounded-control px-2 py-1.5 text-[11px] font-medium transition-colors",
                state === "done" && "bg-ok-bg text-ok",
                state === "active" && "bg-active text-brand",
                state === "pending" && "text-ink-muted"
              )}
            >
              {state === "done" ? (
                <CheckCircle2 size={13} className="shrink-0" />
              ) : state === "active" && run.running ? (
                <Loader2 size={13} className="shrink-0 animate-spin" />
              ) : (
                <Circle size={13} className="shrink-0" />
              )}
              <span className="truncate">
                <span className="num me-1">{s.n}.</span>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* the log */}
      <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {run.log.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-ink-muted">{t("aiLogEmpty")}</p>
        ) : (
          <ul className="space-y-1">
            {run.log.map((e) => (
              <LogRow key={e.id} entry={e} />
            ))}
            {run.running && (
              <li className="flex items-center gap-2 px-2 py-1.5 text-xs text-ink-muted">
                <Loader2 size={13} className="animate-spin text-brand" /> {t("aiWorking")}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* thinking summary */}
      {run.thinking && (
        <div className="border-t border-line">
          <button
            onClick={() => setShowThinking((v) => !v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink-2 hover:bg-hover"
          >
            <Brain size={13} className="text-brand" />
            <span className="flex-1 text-start">{t("aiThinking")}</span>
            <ChevronDown size={14} className={cx("transition-transform", showThinking && "rotate-180")} />
          </button>
          {showThinking && (
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap px-3 pb-3 text-[12px] leading-relaxed text-ink-2">
              {run.thinking}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function iconFor(e: ProcessEntry) {
  switch (e.kind) {
    case "note":
      return <MessageSquareText size={13} className="text-brand" />;
    case "tool":
      return <FileSearch size={13} className="text-ink-2" />;
    case "result":
      return e.isError ? <TriangleAlert size={13} className="text-bad" /> : <Database size={13} className="text-ink-muted" />;
    case "web":
      return <Globe size={13} className="text-ink-2" />;
    case "wbs":
      return <ListTree size={13} className="text-brand" />;
    case "pricing":
      return <Receipt size={13} className="text-ok" />;
    case "error":
      return <TriangleAlert size={13} className="text-bad" />;
    default:
      return <Circle size={13} className="text-ink-muted" />;
  }
}

function LogRow({ entry }: { entry: ProcessEntry }) {
  const [open, setOpen] = useState(false);
  const expandable = Boolean(entry.detail) || (entry.kind === "result" && entry.data != null) || entry.kind === "wbs";
  return (
    <li
      className={cx(
        "rounded-control px-2 py-1.5 text-[12px] leading-snug",
        entry.kind === "note" && "bg-active/60 text-ink",
        entry.kind === "error" && "bg-bad-bg text-bad",
        entry.kind === "pricing" && "bg-ok-bg text-ok",
        entry.kind !== "note" && entry.kind !== "error" && entry.kind !== "pricing" && "text-ink-2"
      )}
    >
      <button
        onClick={() => expandable && setOpen((v) => !v)}
        className={cx("flex w-full items-start gap-2 text-start", !expandable && "cursor-default")}
      >
        <span className="mt-0.5 shrink-0">{iconFor(entry)}</span>
        <span dir="auto" className="min-w-0 flex-1 break-words text-start">
          {entry.step ? <span className="num me-1 font-semibold">{entry.step}.</span> : null}
          {entry.title}
        </span>
        {expandable && (
          <ChevronDown size={13} className={cx("mt-0.5 shrink-0 transition-transform", open && "rotate-180")} />
        )}
      </button>
      {open && entry.detail && <p className="mt-1.5 whitespace-pre-wrap ps-5 text-[12px] text-ink-2">{entry.detail}</p>}
      {open && entry.kind === "result" && entry.data != null && <ResultDetail data={entry.data} />}
      {open && entry.kind === "wbs" && Array.isArray(entry.data) && (
        <ul className="mt-1.5 space-y-0.5 ps-5">
          {(entry.data as { ref: string; name: string; qty: number; unit: string; scopeEvidence: string }[]).map((w) => (
            <li key={w.ref} className="text-[12px] text-ink-2">
              <span className="num font-medium text-ink">{w.ref}</span> {w.name} · <span className="num">{w.qty}</span> {w.unit}
              {w.scopeEvidence && <span className="text-ink-muted"> · “{w.scopeEvidence}”</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Search results, rendered compactly so the call can be checked at a glance. */
function ResultDetail({ data }: { data: unknown }) {
  const d = data as {
    hits?: { name?: string; item?: string; project?: string; unitPriceSar?: number | null; unit?: string | null; source?: string | null }[];
    vendorOnly?: { vendor: string; item: string; unitPriceSar: number | null; unit: string | null }[];
    rows?: unknown[];
  };
  const hits = d?.hits ?? [];
  const vendor = d?.vendorOnly ?? [];
  if (!hits.length && !vendor.length && !d?.rows) return <p className="mt-1 ps-5 text-[12px] text-ink-muted">—</p>;
  return (
    <div className="mt-1.5 space-y-0.5 ps-5">
      {hits.slice(0, 8).map((h, i) => (
        <p key={i} className="text-[12px] text-ink-2">
          <span className="text-ink">{h.name ?? h.item}</span>
          {h.project ? <span className="text-ink-muted"> · {h.project}</span> : null}
          {" · "}
          <span className="num">{h.unitPriceSar != null ? `${h.unitPriceSar.toLocaleString("en-US")} SAR` : "no price"}</span>
          {h.unit ? <span className="text-ink-muted"> / {h.unit}</span> : null}
          {h.source ? <span className="text-ink-muted"> · {h.source}</span> : null}
        </p>
      ))}
      {vendor.slice(0, 5).map((v, i) => (
        <p key={`v${i}`} className="text-[12px] text-ink-2">
          <span className="text-ink-muted">{v.vendor}:</span> {v.item} ·{" "}
          <span className="num">{v.unitPriceSar != null ? `${v.unitPriceSar.toLocaleString("en-US")} SAR` : "—"}</span>
          {v.unit ? <span className="text-ink-muted"> / {v.unit}</span> : null}
        </p>
      ))}
      {d?.rows && <p className="text-[12px] text-ink-muted">{(d.rows as unknown[]).length} rows</p>}
    </div>
  );
}
