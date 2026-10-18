/**
 * Step one of every budget: who it is for and what it is. Nothing can be
 * priced until this is filled, because the AI needs the brief and every saved
 * budget is filed under it.
 */
import { useState } from "react";
import { ArrowRight, Briefcase } from "lucide-react";
import { Button, Card, Diamond, cx } from "../components/ui";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";
import type { ProjectInfo } from "../lib/types";

export const PROJECT_TYPES = [
  "award",
  "training",
  "hackathon",
  "event",
  "program",
  "campaign",
  "platform",
  "consulting",
  "other",
] as const;

export function ProjectSetup({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const existing = useStore((s) => s.project);
  const setProject = useStore((s) => s.setProject);
  const [form, setForm] = useState<ProjectInfo>(
    existing ?? { title: "", client: "", projectType: "", description: "", startDate: "", endDate: "", location: "", rfpReference: "" }
  );
  const [touched, setTouched] = useState(false);

  const valid = form.title.trim() && form.client.trim() && form.projectType && form.description.trim();
  const set = <K extends keyof ProjectInfo>(k: K, v: ProjectInfo[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const months =
      form.startDate && form.endDate
        ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : undefined;
    setProject({ ...form, durationMonths: months });
    onDone();
  }

  const field = "mt-0.5 block w-full rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none";
  const bad = (v: string | undefined) => touched && !v?.trim() && "border-bad/60";

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Diamond />
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">{existing ? t("setupTitleEdit") : t("setupTitle")}</h1>
          <p className="text-sm text-ink-2">{t("setupSub")}</p>
        </div>
      </div>

      <form onSubmit={submit}>
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
            <Briefcase size={15} className="text-brand" /> {t("setupSection")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs text-ink-2">{t("projectLabel")} *</span>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("projectPlaceholder")} className={cx(field, bad(form.title))} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-2">{t("clientLabel")} *</span>
              <input value={form.client} onChange={(e) => set("client", e.target.value)} placeholder={t("clientPlaceholder")} className={cx(field, bad(form.client))} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-2">{t("setupType")} *</span>
              <select value={form.projectType} onChange={(e) => set("projectType", e.target.value)} className={cx(field, "cursor-pointer", bad(form.projectType))}>
                <option value="">{t("setupTypePlaceholder")}</option>
                {PROJECT_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {t(`ptype_${p}` as const)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-2">{t("setupStart")}</span>
              <input type="date" value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className={cx(field, !form.startDate && "is-empty")} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-2">{t("setupEnd")}</span>
              <input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className={cx(field, !form.endDate && "is-empty")} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-2">{t("setupLocation")}</span>
              <input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder={t("setupLocationPlaceholder")} className={field} />
            </label>
            <label className="block">
              <span className="text-xs text-ink-2">{t("setupRfp")}</span>
              <input value={form.rfpReference ?? ""} onChange={(e) => set("rfpReference", e.target.value)} placeholder={t("setupRfpPlaceholder")} className={field} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-ink-2">{t("projectDescLabel")} *</span>
              <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={t("setupDescPlaceholder")} className={cx(field, "resize-y leading-relaxed", bad(form.description))} />
            </label>
          </div>
          {touched && !valid && <p className="mt-3 text-sm text-bad">{t("setupRequired")}</p>}
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("setupCancel")}
            </Button>
            <Button type="submit">
              {existing ? t("setupSave") : t("setupContinue")} <ArrowRight size={15} />
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
