/**
 * Upload the RFP, check the budget against it.
 *
 * Every suggestion shows the terms that produced it, because the matcher reads
 * words rather than meaning and the user has to be able to overrule it in one
 * glance. Nothing is applied automatically: each row is accepted or dismissed
 * by hand, and there is no "apply all".
 */
import { useRef, useState } from "react";
import {
  FileSearch,
  FileText,
  History,
  Languages,
  Loader2,
  Plus,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge, Button, Card, cx } from "./ui";
import { money } from "../lib/format";
import { useT, type StringKey } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { ScopeItem } from "../lib/types";
import {
  analyseRfp,
  detectLanguage,
  extractText,
  findPrecedents,
  type PrecedentMatch,
  type RfpAnalysis,
  type ScopeSuggestion,
} from "../lib/rfp";

export function RfpCheck() {
  const { t, tSection } = useT();
  const data = useStore((s) => s.data);
  const selections = useStore((s) => s.selections);
  const toggleItem = useStore((s) => s.toggleItem);
  const setRfp = useStore((s) => s.setRfp);
  const history = useStore((s) => s.history);
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<RfpAnalysis | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [precedents, setPrecedents] = useState<PrecedentMatch[]>([]);
  const [rfpLang, setRfpLang] = useState<ReturnType<typeof detectLanguage> | null>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setError("");
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 5));
  };

  async function run() {
    if (files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const docs = await Promise.all(files.map(extractText));
      const failed = docs.filter((d) => d.error);
      const empty = docs.filter((d) => !d.error && d.chars === 0);

      // A file that would not open is a different problem from one that opened
      // and held no text, so say which happened rather than blaming OCR for both.
      if (failed.length > 0) {
        setError(
          t("rfpFailed", {
            files: failed.map((d) => d.name).join(", "),
            reason: failed[0].error ?? "",
          })
        );
        setAnalysis(null);
        return;
      }
      if (empty.length === docs.length) {
        setError(t("rfpUnreadable"));
        setAnalysis(null);
        return;
      }
      const text = docs.map((d) => d.text).join("\n");
      // Remember it: the export files it with the budget, and the next RFP is
      // compared against it.
      setRfp(text, docs.map((d) => d.name));
      setAnalysis(analyseRfp(docs, data.sections, selections));
      setPrecedents(findPrecedents(text, history, data.sections, selections));
      setRfpLang(detectLanguage(text));
      setDismissed(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const visible = (list: ScopeSuggestion[]) =>
    list.filter((s) => !dismissed.has(s.item.id));

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set(prev).add(id));

  const accept = (s: ScopeSuggestion) => {
    toggleItem(s.item.id, s.item.defaultQty);
    dismiss(s.item.id);
  };

  const toAdd = analysis ? visible(analysis.add) : [];
  const toReview = analysis ? visible(analysis.review) : [];

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileSearch size={16} className="text-electric" />
            {t("rfpTitle")}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-lavender-light/60">
            {t("rfpSub")}
          </p>
        </div>
        <Button size="sm" onClick={run} disabled={busy || files.length === 0}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy ? t("rfpAnalysing") : t("rfpAnalyse")}
        </Button>
      </div>

      {/* files */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="mt-4 cursor-pointer rounded-xl border border-dashed border-lavender/25 px-4 py-5 text-center transition-colors hover:border-electric/50"
      >
        <FileText className="mx-auto mb-2 text-lavender-light/50" size={22} />
        <p className="text-sm text-white">{t("rfpDrop")}</p>
        <p className="mt-0.5 text-xs text-lavender-light/45">{t("rfpFormats")}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy/50 px-2.5 py-1.5 text-xs text-lavender-light"
            >
              <FileText size={13} className="shrink-0 text-lavender-light/50" />
              <span className="max-w-[220px] truncate">{f.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFiles((prev) => prev.filter((_, j) => j !== i));
                }}
                aria-label={t("rfpRemoveFile")}
                className="text-lavender-light/40 transition-colors hover:text-red-400"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {analysis && (
        <div className="mt-5 space-y-4 border-t border-white/5 pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-lavender-light/70">
              {t("rfpRead", {
                n: analysis.documents.length,
                chars: analysis.documents
                  .reduce((sum, d) => sum + d.chars, 0)
                  .toLocaleString("en-US"),
              })}
            </span>
            <span className="text-emerald-300">
              {t("rfpConfirmed", { n: analysis.confirmedCount })}
            </span>
          </div>

          {/* an Arabic RFP will barely match an English catalog: say so */}
          {rfpLang && rfpLang.lang !== "en" && (
            <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs leading-relaxed text-gold/90">
              <Languages size={12} className="me-1 inline" />
              {rfpLang.lang === "ar" ? t("rfpArabic") : t("rfpMixed")}
            </p>
          )}

          {precedents.length > 0 && (
            <Precedents
              matches={precedents}
              onAdd={(item) => toggleItem(item.id, item.defaultQty)}
              selections={selections}
              t={t}
            />
          )}

          {toAdd.length === 0 && toReview.length === 0 ? (
            <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
              {t("rfpNothingToChange")}
            </p>
          ) : (
            <>
              {toAdd.length > 0 && (
                <SuggestionGroup
                  tone="add"
                  title={t("rfpMissingTitle", { n: toAdd.length })}
                  body={t("rfpMissingBody")}
                >
                  {toAdd.map((s) => (
                    <SuggestionRow
                      key={s.item.id}
                      s={s}
                      sectionLabel={tSection(s.item.section)}
                      priceLabel={
                        s.item.isPriced ? money(s.item.unitPrice) : t("badgeUnpriced")
                      }
                      acceptLabel={t("rfpAdd")}
                      dismissLabel={t("rfpDismiss")}
                      matchedLabel={t("rfpMatchedOn")}
                      onAccept={() => accept(s)}
                      onDismiss={() => dismiss(s.item.id)}
                    />
                  ))}
                </SuggestionGroup>
              )}

              {toReview.length > 0 && (
                <SuggestionGroup
                  tone="review"
                  title={t("rfpExtraTitle", { n: toReview.length })}
                  body={t("rfpExtraBody")}
                >
                  {toReview.map((s) => (
                    <SuggestionRow
                      key={s.item.id}
                      s={s}
                      sectionLabel={tSection(s.item.section)}
                      priceLabel={
                        s.item.isPriced ? money(s.item.unitPrice) : t("badgeUnpriced")
                      }
                      acceptLabel={t("rfpRemove")}
                      dismissLabel={t("rfpKeep")}
                      matchedLabel={t("rfpMatchedOn")}
                      onAccept={() => accept(s)}
                      onDismiss={() => dismiss(s.item.id)}
                    />
                  ))}
                </SuggestionGroup>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function SuggestionGroup({
  tone,
  title,
  body,
  children,
}: {
  tone: "add" | "review";
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3
        className={cx(
          "flex items-center gap-2 text-xs font-semibold",
          tone === "add" ? "text-electric" : "text-gold"
        )}
      >
        {tone === "add" ? <Plus size={13} /> : <TriangleAlert size={13} />}
        {title}
      </h3>
      <p className="mb-2 mt-0.5 text-[11px] text-lavender-light/50">{body}</p>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function SuggestionRow({
  s,
  sectionLabel,
  priceLabel,
  acceptLabel,
  dismissLabel,
  matchedLabel,
  onAccept,
  onDismiss,
}: {
  s: ScopeSuggestion;
  sectionLabel: string;
  priceLabel: string;
  acceptLabel: string;
  dismissLabel: string;
  matchedLabel: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5",
        s.kind === "add"
          ? "border-electric/25 bg-electric/[0.06]"
          : "border-gold/25 bg-gold/[0.06]"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{s.item.name}</span>
          <Badge tone="neutral">{sectionLabel}</Badge>
          <span className="num text-xs text-lavender-light/60">{priceLabel}</span>
        </div>
        {s.matchedTerms.length > 0 && (
          <p className="mt-1 text-[11px] text-lavender-light/45">
            {matchedLabel}{" "}
            {s.matchedTerms.map((term) => (
              <span
                key={term}
                className="me-1 rounded bg-white/[0.07] px-1.5 py-0.5 text-lavender-light/70"
              >
                {term}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onDismiss}>
          {dismissLabel}
        </Button>
        <Button size="sm" onClick={onAccept}>
          {acceptLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Budgets already exported against a similar RFP.
 *
 * This is retrieval, not prediction: it does not guess what belongs in the
 * budget, it shows what a comparable budget actually contained and leaves the
 * call to the user. The shared words are on show, so a spurious match is
 * obvious rather than authoritative.
 */
function Precedents({
  matches,
  onAdd,
  selections,
  t,
}: {
  matches: PrecedentMatch[];
  onAdd: (item: ScopeItem) => void;
  selections: Record<string, unknown>;
  t: (k: StringKey, vars?: Record<string, string | number>) => string;
}) {
  return (
    <section className="rounded-xl border border-lavender/25 bg-lavender/[0.06] p-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-lavender-light">
        <History size={13} />
        {t("precedentTitle", { n: matches.length })}
      </h3>
      <p className="mb-2.5 mt-0.5 text-[11px] text-lavender-light/50">
        {t("precedentBody")}
      </p>

      <div className="space-y-2">
        {matches.map((m) => (
          <div
            key={m.entry.id}
            className="rounded-lg border border-white/10 bg-navy/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-white">
                {m.entry.title || t("untitledBudget")}
                {m.entry.client && (
                  <span className="ms-2 text-[11px] font-normal text-lavender-light/50">
                    {m.entry.client}
                  </span>
                )}
              </span>
              <span className="num text-xs text-lavender-light/60">
                {t("precedentSimilarity", { pct: Math.round(m.similarity * 100) })} ·{" "}
                {money(m.entry.grand)}
              </span>
            </div>

            {m.sharedTerms.length > 0 && (
              <p className="mt-1 text-[11px] text-lavender-light/45">
                {t("rfpMatchedOn")}{" "}
                {m.sharedTerms.map((w) => (
                  <span
                    key={w}
                    className="me-1 rounded bg-white/[0.07] px-1.5 py-0.5 text-lavender-light/70"
                  >
                    {w}
                  </span>
                ))}
              </p>
            )}

            <p className="mt-1.5 text-[11px] text-lavender-light/60">
              {t("precedentDiff", {
                same: m.overlap,
                missing: m.missing.length,
                extra: m.extra.length,
              })}
            </p>

            {m.missing.length > 0 && (
              <ul className="mt-2 space-y-1">
                {m.missing.slice(0, 8).map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 rounded-md bg-white/[0.03] px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-lavender-light">
                      {item.name}
                    </span>
                    <span className="num text-[11px] text-lavender-light/50">
                      {item.isPriced ? money(item.unitPrice) : t("badgeUnpriced")}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={Boolean(selections[item.id])}
                      onClick={() => onAdd(item)}
                    >
                      {selections[item.id] ? t("precedentAdded") : t("rfpAdd")}
                    </Button>
                  </li>
                ))}
                {m.missing.length > 8 && (
                  <li className="px-2 text-[11px] text-lavender-light/40">
                    {t("precedentMore", { n: m.missing.length - 8 })}
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
