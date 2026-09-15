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
  Loader2,
  Plus,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge, Button, Card, cx } from "./ui";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import { analyseRfp, extractText, type RfpAnalysis, type ScopeSuggestion } from "../lib/rfp";

export function RfpCheck() {
  const { t, tSection } = useT();
  const data = useStore((s) => s.data);
  const selections = useStore((s) => s.selections);
  const toggleItem = useStore((s) => s.toggleItem);
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<RfpAnalysis | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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
      setAnalysis(analyseRfp(docs, data.sections, selections));
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
