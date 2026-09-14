/** Optional Screen 4 - Admin: re-upload the Scope of Work workbook to re-parse. */
import { useRef, useState } from "react";
import { CheckCircle2, RotateCcw, Upload } from "lucide-react";
import { Button, Card, Diamond } from "../components/ui";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";

export function Admin() {
  const { t } = useT();
  const data = useStore((s) => s.data);
  const replaceData = useStore((s) => s.replaceData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    { kind: "idle" | "ok" | "error"; msg: string }
  >({ kind: "idle", msg: "" });
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    setStatus({ kind: "idle", msg: t("adminParsing") });
    try {
      // Lazy-load the ExcelJS-backed importer only when an admin uploads a file.
      const { importScopeData } = await import("../lib/excelImport");
      const next = await importScopeData(file, data);
      replaceData(next);
      setStatus({
        kind: "ok",
        msg: t("adminLoaded", {
          items: next.meta.counts.items,
          sections: next.meta.counts.sections,
          priced: next.meta.counts.priced,
          unpriced: next.meta.counts.unpriced,
        }),
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
          <h1 className="text-2xl font-bold text-white">{t("adminTitle")}</h1>
          <p className="text-sm text-lavender-light/70">
            {t("adminSub")}
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
          <p className="text-white font-medium">{t("adminDrop")}</p>
          <p className="text-xs text-lavender-light/50 mt-1">
            {t("adminExpects")}
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
            <span>{busy ? t("adminParsing") : status.msg}</span>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between text-xs text-lavender-light/60">
          <span>
            {t("adminCurrent")} <b className="text-white">{data.meta.counts.items}</b>{" "}
            {t("adminItemsWord")} · <b className="text-white">{data.meta.counts.sections}</b>{" "}
            {t("adminSectionsWord")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={14} /> {t("adminReset")}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-white mb-2">{t("adminRulesTitle")}</h3>
        <ul className="space-y-1.5 text-sm text-lavender-light/70 list-disc list-inside marker:text-lavender-light/40">
          <li>{t("adminRule1")}</li>
          <li>{t("adminRule2")}</li>
          <li>{t("adminRule3")}</li>
          <li>{t("adminRule4")}</li>
        </ul>
      </Card>
    </div>
  );
}
