/**
 * The priced work breakdown: every AI line, grouped by section, with the
 * quantity and unit price open for editing, the source label on each row and
 * the model's rationale a click away.
 */
import { useState } from "react";
import { ChevronDown, Eye, EyeOff, Plus, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { SourceBadge } from "./SourceBadge";
import { Badge, Button, cx } from "./ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { BudgetSummary } from "../lib/useTotals";
import type { ComputedAiLine } from "../lib/types";

export function WbsTable({ budget, compact }: { budget: BudgetSummary; compact?: boolean }) {
  const { t } = useT();
  const assumptions = useStore((s) => s.assumptions);
  const addManualLine = useStore((s) => s.addManualLine);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ section: "Event Management", name: "", unit: "each", qty: 1, unitPrice: "" });

  const { aiBySection, aiTotals, aiLines } = budget;
  const excluded = aiLines.filter((l) => !l.line.included);

  if (aiLines.length === 0 && !adding) {
    return (
      <div className="px-4 py-8 text-center text-sm text-ink-muted">
        {t("wbsEmpty")}
        {!compact && (
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Plus size={14} /> {t("wbsAddLine")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="hidden grid-cols-12 gap-2 border-b border-line bg-bg/60 px-4 py-2 text-[10px] uppercase tracking-wider text-ink-2 md:grid">
        <div className="col-span-5">{t("colItem")}</div>
        <div className="col-span-1 text-center">{t("colQty")}</div>
        <div className="col-span-2 text-end">{t("colUnitPrice")}</div>
        <div className="col-span-2 text-end">{t("colBase")}</div>
        <div className="col-span-2 text-end">{t("wbsSource")}</div>
      </div>

      {aiBySection.map((group) => (
        <div key={group.section}>
          <div className="flex items-center justify-between gap-2 border-b border-line bg-raised px-4 py-1.5">
            <span className="text-xs font-semibold text-ink">{group.section}</span>
            <span className="num text-xs font-semibold text-ink-2">{money(group.totals.base)}</span>
          </div>
          <ul className="divide-y divide-line">
            {group.lines.map((l) => (
              <Row key={l.line.id} l={l} />
            ))}
          </ul>
        </div>
      ))}

      {excluded.length > 0 && (
        <div>
          <div className="border-b border-line bg-raised px-4 py-1.5 text-xs font-semibold text-ink-muted">{t("wbsExcluded")}</div>
          <ul className="divide-y divide-line opacity-60">
            {excluded.map((l) => (
              <Row key={l.line.id} l={l} />
            ))}
          </ul>
        </div>
      )}

      {adding ? (
        <div className="grid gap-2 border-t border-line bg-active/40 px-4 py-3 md:grid-cols-12 md:items-end">
          <label className="md:col-span-4">
            <span className="text-[10px] uppercase text-ink-muted">{t("colItem")}</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input-sm" autoFocus />
          </label>
          <label className="md:col-span-2">
            <span className="text-[10px] uppercase text-ink-muted">{t("wbsSection")}</span>
            <input value={draft.section} onChange={(e) => setDraft({ ...draft, section: e.target.value })} className="input-sm" />
          </label>
          <label className="md:col-span-2">
            <span className="text-[10px] uppercase text-ink-muted">{t("wbsUnit")}</span>
            <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="input-sm" />
          </label>
          <label className="md:col-span-1">
            <span className="text-[10px] uppercase text-ink-muted">{t("colQty")}</span>
            <input type="number" min={0} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })} className="input-sm num" />
          </label>
          <label className="md:col-span-2">
            <span className="text-[10px] uppercase text-ink-muted">{t("colUnitPrice")}</span>
            <input type="number" min={0} value={draft.unitPrice} onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })} className="input-sm num" />
          </label>
          <div className="flex gap-1 md:col-span-1">
            <Button
              size="sm"
              disabled={!draft.name.trim()}
              onClick={() => {
                addManualLine({
                  ref: `M${Date.now().toString(36).slice(-4)}`,
                  section: draft.section.trim() || "Other",
                  name: draft.name.trim(),
                  unit: draft.unit.trim() || "each",
                  qty: draft.qty || 1,
                  unitPrice: draft.unitPrice === "" ? null : Number(draft.unitPrice),
                });
                setDraft({ ...draft, name: "", unitPrice: "" });
                setAdding(false);
              }}
            >
              {t("wbsAdd")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              ✕
            </Button>
          </div>
        </div>
      ) : (
        !compact && (
          <div className="border-t border-line px-4 py-2">
            <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-brand hover:underline">
              <Plus size={13} /> {t("wbsAddLine")}
            </button>
          </div>
        )
      )}

      {/* totals */}
      <div className="border-t border-line bg-bg/40 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs text-ink-2">{t("wbsBaseTotal")}</span>
          <span className="num text-sm font-semibold text-ink">{money(aiTotals.base)} SAR</span>
        </div>
        <p className="num mt-0.5 text-[11px] text-ink-muted">
          {t("sidebarBaseFeeVat", { base: money(aiTotals.base), fee: money(aiTotals.fee), vat: money(aiTotals.vat) })} ·{" "}
          <span className="font-semibold text-ink">{money(aiTotals.total)} SAR</span> {t("wbsFinalIncl")}
        </p>
        {aiTotals.unpricedSelectedCount > 0 && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-warn">
            <TriangleAlert size={12} /> {t("summaryUnpriced", { n: aiTotals.unpricedSelectedCount })}
          </p>
        )}
        <SourceSplit budget={budget} />
      </div>

      {assumptions.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs font-semibold text-ink">{t("wbsAssumptions")}</p>
          <ul className="mt-1 list-disc space-y-0.5 ps-4 text-[12px] text-ink-2">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SourceSplit({ budget }: { budget: BudgetSummary }) {
  const { t } = useT();
  const counts = { database: 0, similar_project: 0, benchmark: 0, manual: 0 };
  for (const l of budget.aiLines) if (l.line.included) counts[l.line.sourceType] += 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-2">
      <span>{t("wbsSplit")}:</span>
      {(["database", "similar_project", "benchmark", "manual"] as const)
        .filter((k) => counts[k] > 0)
        .map((k) => (
          <span key={k} className="flex items-center gap-1">
            <SourceBadge type={k} />
            <span className="num">{counts[k]}</span>
          </span>
        ))}
    </div>
  );
}

function Row({ l }: { l: ComputedAiLine }) {
  const { t } = useT();
  const updateAiLine = useStore((s) => s.updateAiLine);
  const removeAiLine = useStore((s) => s.removeAiLine);
  const [open, setOpen] = useState(false);
  const line = l.line;
  const changed = line.userAdjusted && (line.unitPrice !== line.aiUnitPrice || line.qty !== line.aiQty);

  return (
    <li className={cx("px-4 py-2.5", l.isUnpriced && "bg-warn/[0.04]")}>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-12 md:items-center">
        <div className="min-w-0 md:col-span-5">
          <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-1.5 text-start">
            <ChevronDown size={14} className={cx("mt-0.5 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} />
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-snug text-ink">{line.name}</span>
              <span className="block text-[11px] text-ink-2">
                <span className="num">{line.ref}</span> · {line.unit}
                {changed && (
                  <Badge tone="warn" className="ms-1.5">
                    {t("wbsEdited")}
                  </Badge>
                )}
                {l.isUnpriced && (
                  <Badge tone="missing" className="ms-1.5">
                    <TriangleAlert size={10} /> {t("badgeUnpriced")}
                  </Badge>
                )}
              </span>
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2 md:col-span-1 md:justify-center">
          <span className="text-[10px] uppercase text-ink-muted md:hidden">{t("colQty")}</span>
          <input
            type="number"
            min={0}
            step="any"
            value={line.qty}
            onChange={(e) => updateAiLine(line.id, { qty: Math.max(0, Number(e.target.value) || 0) })}
            className="num w-20 rounded-control border border-line bg-bg/50 px-2 py-1 text-center text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-2 md:col-span-2 md:justify-end">
          <span className="text-[10px] uppercase text-ink-muted md:hidden">{t("colUnitPrice")}</span>
          <input
            type="number"
            min={0}
            step="any"
            value={line.unitPrice ?? ""}
            placeholder="—"
            onChange={(e) => updateAiLine(line.id, { unitPrice: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })}
            className={cx(
              "num w-28 rounded-control border bg-bg/50 px-2 py-1 text-end text-sm text-ink focus:border-brand focus:outline-none",
              l.isUnpriced ? "border-warn/50" : "border-line"
            )}
          />
        </div>
        <div className="flex items-baseline justify-between gap-2 md:col-span-2 md:justify-end">
          <span className="text-[10px] uppercase text-ink-muted md:hidden">{t("colBase")}</span>
          <span className="num text-sm font-semibold text-ink">{l.isUnpriced ? "—" : money(l.baseCost)}</span>
        </div>
        <div className="flex items-center justify-end gap-1 md:col-span-2">
          <SourceBadge type={line.sourceType} />
          <button
            onClick={() => updateAiLine(line.id, { included: !line.included })}
            title={line.included ? t("wbsExclude") : t("wbsInclude")}
            className="rounded-md p-1 text-ink-muted hover:bg-hover hover:text-ink"
          >
            {line.included ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          {changed && (
            <button
              onClick={() => updateAiLine(line.id, { unitPrice: line.aiUnitPrice ?? null, qty: line.aiQty ?? line.qty, userAdjusted: false })}
              title={t("wbsRevert")}
              className="rounded-md p-1 text-ink-muted hover:bg-hover hover:text-ink"
            >
              <Undo2 size={14} />
            </button>
          )}
          <button onClick={() => removeAiLine(line.id)} title={t("removeItem")} className="rounded-md p-1 text-ink-muted hover:bg-bad-bg hover:text-bad">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 rounded-control bg-raised px-3 py-2 text-[12px] leading-relaxed text-ink-2 md:ms-5">
          <p>
            <span className="font-semibold text-ink">{t("wbsSourceRef")}:</span> {line.sourceRef || "—"}
            {line.confidence != null && (
              <span className="num text-ink-muted"> · {t("wbsConfidence")} {Math.round(line.confidence * 100)}%</span>
            )}
          </p>
          {line.rationale && (
            <p className="mt-1">
              <span className="font-semibold text-ink">{t("wbsWhy")}:</span> {line.rationale}
            </p>
          )}
          {changed && (
            <p className="num mt-1 text-ink-muted">
              {t("wbsAiSuggested", { qty: line.aiQty ?? "-", price: line.aiUnitPrice != null ? money(line.aiUnitPrice) : "-" })}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
