/** Optional Screen 4 — Admin: re-upload the Scope of Work workbook to re-parse. */
import { useRef, useState } from "react";
import { CheckCircle2, RotateCcw, Upload } from "lucide-react";
import { Button, Card, Diamond } from "../components/ui";
import { useStore } from "../lib/store";

export function Admin() {
  const data = useStore((s) => s.data);
  const replaceData = useStore((s) => s.replaceData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    { kind: "idle" | "ok" | "error"; msg: string }
  >({ kind: "idle", msg: "" });
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    setStatus({ kind: "idle", msg: "Parsing…" });
    try {
      // Lazy-load the ExcelJS-backed importer only when an admin uploads a file.
      const { importScopeData } = await import("../lib/excelImport");
      const next = await importScopeData(file, data);
      replaceData(next);
      setStatus({
        kind: "ok",
        msg: `Loaded ${next.meta.counts.items} items across ${next.meta.counts.sections} sections (${next.meta.counts.priced} priced, ${next.meta.counts.unpriced} unpriced). Selections were reset.`,
      });
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Diamond />
        <div>
          <h1 className="text-2xl font-bold text-white">Data Admin</h1>
          <p className="text-sm text-lavender-light/70">
            Re-upload an updated <code className="text-lavender-light">Scope_of_Work_Priced_QTY.xlsx</code> to
            re-parse the catalog at runtime.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          className="rounded-card border-2 border-dashed border-lavender/25 hover:border-electric/50 transition-colors p-10 text-center cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mx-auto text-lavender-light/60 mb-3" size={32} />
          <p className="text-white font-medium">Drop the workbook here or click to browse</p>
          <p className="text-xs text-lavender-light/50 mt-1">
            Expects the "Scope of Work" sheet layout · .xlsx
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </div>

        {status.kind !== "idle" || busy ? (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
              status.kind === "error"
                ? "bg-red-500/10 text-red-300 border border-red-500/30"
                : status.kind === "ok"
                ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                : "bg-white/5 text-lavender-light"
            }`}
          >
            {status.kind === "ok" && <CheckCircle2 size={16} className="mt-0.5" />}
            <span>{busy ? "Parsing…" : status.msg}</span>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between text-xs text-lavender-light/60">
          <span>
            Currently loaded: <b className="text-white">{data.meta.counts.items}</b> items ·{" "}
            <b className="text-white">{data.meta.counts.sections}</b> sections
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={14} /> Reset to bundled data
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-white mb-2">Parsing rules</h3>
        <ul className="space-y-1.5 text-sm text-lavender-light/70 list-disc list-inside">
          <li>Section headers detected: MARKETING, EVENT MANAGEMENT, LOGISTICS, VIDEO PRODUCTIONS.</li>
          <li>Subtotal and grand-total rows are ignored for item parsing.</li>
          <li>Rows marked NOT IN MASTER / empty price are kept but flagged unpriced.</li>
          <li>No prices are invented. Unpriced items stay out of totals until a custom price is set.</li>
        </ul>
      </Card>
    </div>
  );
}
