/**
 * Admin: who used the dashboard and what they priced, the accounts, the
 * developer connection to Claude, and the scope workbook re-upload.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Plus, RotateCcw, Trash2, Upload, Users, Activity, Database } from "lucide-react";
import { KpiTile, Panel, StatusBadge } from "../components/dashboard";
import { OwnerChip } from "../components/OwnerChip";
import { Badge, Button, Card, Diamond, cx } from "../components/ui";
import { admin as adminApi, type AiStatus, type UsageReport } from "../lib/api";
import { compact, money } from "../lib/format";
import { useT } from "../lib/i18n";
import { useStore } from "../lib/store";

type Tab = "usage" | "users" | "developer" | "catalog";

export function Admin() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("usage");
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Diamond />
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">{t("adminTitle")}</h1>
          <p className="text-sm text-ink-2">{t("adminSub2")}</p>
        </div>
      </div>
      <div role="tablist" className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
        {(
          [
            ["usage", <Activity size={14} />, t("adminTabUsage")],
            ["users", <Users size={14} />, t("adminTabUsers")],
            ["developer", <KeyRound size={14} />, t("adminTabDev")],
            ["catalog", <Database size={14} />, t("adminTabCatalog")],
          ] as [Tab, React.ReactNode, string][]
        ).map(([k, icon, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cx("flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-medium", tab === k ? "bg-active text-brand" : "text-ink-2 hover:text-ink")}
          >
            {icon} {label}
          </button>
        ))}
      </div>
      {tab === "usage" && <UsageTab />}
      {tab === "users" && <UsersTab />}
      {tab === "developer" && <DeveloperTab />}
      {tab === "catalog" && <CatalogTab />}
    </div>
  );
}

function UsageTab() {
  const { t } = useT();
  const [report, setReport] = useState<UsageReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminApi.usage().then(setReport).catch((e) => setError((e as Error).message));
  }, []);
  if (error) return <p className="text-sm text-bad">{error}</p>;
  if (!report)
    return (
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <Loader2 size={15} className="animate-spin" /> {t("budgetsLoading")}
      </p>
    );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile label={t("admUsers")} value={report.summary.users} icon={<Users size={16} />} />
        <KpiTile label={t("admAiRuns")} value={report.summary.aiRuns} icon={<Activity size={16} />} tone="brand" />
        <KpiTile label={t("admBudgets")} value={report.summary.budgets} icon={<Database size={16} />} />
        <KpiTile label={t("admObservations")} value={report.summary.observations} hint={t("admObservationsHint")} icon={<Database size={16} />} tone="ok" />
        <KpiTile label={t("admTotalPriced")} value={compact(report.summary.totalPriced)} unit="SAR" icon={<Activity size={16} />} />
      </div>

      <Panel title={t("admPerUser")} bodyClassName="px-0 pb-0">
        <table className="w-full text-sm">
          <thead className="bg-bg/60 text-[10px] uppercase tracking-wider text-ink-2">
            <tr>
              <th className="px-5 py-2 text-start">{t("loginEmail")}</th>
              <th className="px-2 py-2 text-end">{t("admLogins")}</th>
              <th className="px-2 py-2 text-end">{t("admAiRuns")}</th>
              <th className="px-2 py-2 text-end">{t("admBudgets")}</th>
              <th className="px-2 py-2 text-end">{t("admTotalPriced")}</th>
              <th className="px-2 py-2 text-end">{t("admTokens")}</th>
              <th className="px-5 py-2 text-end">{t("admLastLogin")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.perUser.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-2">
                  <span className="flex items-center gap-2">
                    <OwnerChip name={u.name} email={u.email} picture={u.picture} compact />
                    <span>
                      <span className="block text-ink">{u.name}</span>
                      <span className="block text-xs text-ink-muted">{u.email} · {u.role}</span>
                    </span>
                  </span>
                </td>
                <td className="num px-2 py-2 text-end text-ink-2">{u.logins}</td>
                <td className="num px-2 py-2 text-end text-ink-2">{u.aiRuns}{u.followUps ? ` (+${u.followUps})` : ""}</td>
                <td className="num px-2 py-2 text-end text-ink-2">{u.budgetsSaved}</td>
                <td className="num px-2 py-2 text-end font-medium text-ink">{money(u.totalPriced)}</td>
                <td className="num px-2 py-2 text-end text-ink-2">{compact(u.tokens)}</td>
                <td className="num px-5 py-2 text-end text-xs text-ink-muted">{u.lastLoginAt?.slice(0, 16).replace("T", " ") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title={t("admWhatPriced")} bodyClassName="px-0 pb-0">
        {report.budgets.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-ink-2">{t("budgetsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {report.budgets.slice(0, 50).map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{b.project.title}</span>
                  <span className="block truncate text-xs text-ink-muted">{b.project.client} · {b.lineCount} {t("budgetsLines")}</span>
                </span>
                <span className="w-36 shrink-0">
                  <OwnerChip name={b.userName} email={b.userEmail} picture={b.userPicture} />
                </span>
                <StatusBadge tone={b.aiSessionId ? "info" : "neutral"}>{b.aiSessionId ? t("budgetsAi") : t("budgetsManual")}</StatusBadge>
                <span className="num w-28 text-end text-sm font-semibold text-ink">{money(b.totals.total)}</span>
                <span className="num hidden w-20 text-end text-xs text-ink-muted sm:block">{b.updatedAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t("admActivity")} bodyClassName="px-0 pb-0">
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {report.events.slice(0, 100).map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-2 text-xs">
              <span className="num w-32 shrink-0 text-ink-muted">{e.at.slice(0, 16).replace("T", " ")}</span>
              <span className="w-40 shrink-0 truncate text-ink-2">{e.userEmail}</span>
              <Badge tone={e.action === "ai_run" ? "close" : e.action === "budget_saved" ? "exact" : "neutral"}>{e.action}</Badge>
              <span className="min-w-0 flex-1 truncate text-ink">{e.projectTitle ?? ""}{e.client ? ` · ${e.client}` : ""}</span>
              {e.total != null && <span className="num text-ink-2">{money(e.total)}</span>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function UsersTab() {
  const { t } = useT();
  const me = useStore((s) => s.user);
  const [users, setUsers] = useState<{ id: string; email: string; name: string; role: string; picture?: string | null; provider?: string; lastLoginAt?: string; hasPassword: boolean }[]>([]);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "user" as "user" | "admin" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => adminApi.users().then((r) => setUsers(r.users)).catch(() => undefined);
  useEffect(() => {
    load();
  }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await adminApi.addUser({ ...form, password: form.password || undefined });
      setForm({ email: "", name: "", password: "", role: "user" });
      setMsg({ ok: true, text: t("admUserAdded") });
      load();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }
  const field = "mt-0.5 block w-full rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Panel className="lg:col-span-3" title={t("adminTabUsers")} bodyClassName="px-0 pb-0">
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-5 py-2.5">
              <OwnerChip name={u.name} email={u.email} picture={u.picture} compact />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{u.name}</span>
                <span className="block text-xs text-ink-muted">
                  {u.email} · {u.provider === "google" ? "Google" : t("loginPassword")}
                  {!u.lastLoginAt && <span> · {t("admNeverSignedIn")}</span>}
                </span>
              </span>
              {u.id === me?.id ? (
                <Badge tone="close">{t("roleAdmin")}</Badge>
              ) : (
                <select
                  value={u.role}
                  onChange={(e) =>
                    adminApi
                      .setRole(u.id, e.target.value as "admin" | "user")
                      .then(load)
                      .catch((err) => setMsg({ ok: false, text: (err as Error).message }))
                  }
                  title={t("admRole")}
                  className={cx(
                    "cursor-pointer rounded-control border px-2 py-1 text-xs focus:outline-none",
                    u.role === "admin" ? "border-brand/40 bg-active text-brand" : "border-line bg-bg/60 text-ink-2"
                  )}
                >
                  <option value="user">{t("roleUser")}</option>
                  <option value="admin">{t("roleAdmin")}</option>
                </select>
              )}
              <span className="num hidden w-20 text-end text-xs text-ink-muted sm:block">{u.lastLoginAt?.slice(0, 10) ?? "—"}</span>
              {u.id !== me?.id && (
                <button onClick={() => adminApi.removeUser(u.id).then(load)} title={t("historyDelete")} className="rounded-md p-1.5 text-ink-muted hover:text-bad">
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="lg:col-span-2" title={t("admAddUser")} subtitle={t("admAddUserSub")}>
        <form onSubmit={add} className="space-y-3">
          <label className="block">
            <span className="text-xs text-ink-2">{t("loginEmail")}</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} dir="ltr" />
          </label>
          <label className="block">
            <span className="text-xs text-ink-2">{t("admName")}</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
          </label>
          <label className="block">
            <span className="text-xs text-ink-2">{t("loginPassword")} <span className="text-ink-muted">({t("admPasswordOptional")})</span></span>
            <input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={field} dir="ltr" />
            <span className="mt-1 block text-[11px] text-ink-muted">{t("admPasswordHint")}</span>
          </label>
          <label className="block">
            <span className="text-xs text-ink-2">{t("admRole")}</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "user" | "admin" })} className={field}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          {msg && <p className={cx("text-sm", msg.ok ? "text-ok" : "text-bad")}>{msg.text}</p>}
          <Button type="submit" className="w-full">
            <Plus size={15} /> {t("admAddUser")}
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function DeveloperTab() {
  const { t } = useT();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    adminApi.devStatus().then(setStatus).catch(() => undefined);
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      setStatus(await adminApi.setKey(key.trim()));
      setKey("");
      setMsg({ ok: true, text: t("devKeySaved") });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={t("devTitle")} subtitle={t("devSub")}>
        {status && (
          <dl className="mb-4 space-y-1.5 text-sm">
            <Row k={t("devProvider")} v={status.provider} />
            <Row k={t("devModel")} v={status.model} />
            <Row k={t("devEffort")} v={status.effort} />
            <Row k={t("devWebSearch")} v={status.webSearch ? t("devOn") : t("devOff")} />
            <Row
              k={t("devKey")}
              v={
                status.hasKey ? (
                  <span className="flex items-center gap-1.5 text-ok">
                    <CheckCircle2 size={14} /> <span className="num">{status.keyHint}</span>
                  </span>
                ) : (
                  <span className="text-warn">{t("devNoKey")}</span>
                )
              }
            />
          </dl>
        )}
        <form onSubmit={save} className="space-y-3">
          <label className="block">
            <span className="text-xs text-ink-2">{t("devKeyLabel")}</span>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-…"
              className="mt-0.5 block w-full rounded-lg border border-line bg-bg/50 px-3 py-2 font-mono text-sm text-ink focus:border-brand focus:outline-none"
              dir="ltr"
              autoComplete="off"
            />
          </label>
          {msg && <p className={cx("text-sm", msg.ok ? "text-ok" : "text-bad")}>{msg.text}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || key.trim().length < 20}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} {t("devSaveKey")}
            </Button>
            {status?.hasKey && (
              <Button type="button" variant="ghost" onClick={() => adminApi.clearKey().then(setStatus)}>
                {t("devClearKey")}
              </Button>
            )}
          </div>
        </form>
      </Panel>
      <Panel title={t("devHowTitle")}>
        <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-ink-2">
          <li>{t("devHow1")}</li>
          <li>{t("devHow2")}</li>
          <li>{t("devHow3")}</li>
          <li>{t("devHow4")}</li>
        </ol>
      </Panel>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-2">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  );
}

function CatalogTab() {
  const { t } = useT();
  const data = useStore((s) => s.data);
  const replaceData = useStore((s) => s.replaceData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "error"; msg: string }>({ kind: "idle", msg: "" });
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    adminApi.catalogMeta().then(setMeta).catch(() => undefined);
  }, []);

  async function onFile(file: File) {
    setBusy(true);
    setStatus({ kind: "idle", msg: t("adminParsing") });
    try {
      const { importScopeData } = await import("../lib/excelImport");
      const next = await importScopeData(file, data);
      replaceData(next);
      setStatus({ kind: "ok", msg: t("adminLoaded", { items: next.meta.counts.items, sections: next.meta.counts.sections, priced: next.meta.counts.priced, unpriced: next.meta.counts.unpriced }) });
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  const counts = (meta?.counts ?? {}) as Record<string, number>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={t("admDbTitle")} subtitle={t("admDbSub")}>
        {meta ? (
          <dl className="space-y-1.5 text-sm">
            <Row k={t("admDbMaster")} v={<span className="num">{counts.masterPriced} / {counts.masterItems}</span>} />
            <Row k={t("admDbScope")} v={<span className="num">{String(meta.scopePriced)} / {String(meta.scopeItems)}</span>} />
            <Row k={t("admDbVendor")} v={<span className="num">{counts.vendorQuotesPriced} / {counts.vendorQuotes}</span>} />
            <Row k={t("admDbMedia")} v={<span className="num">{counts.mediaRates}</span>} />
            <Row k={t("admDbPast")} v={<span className="num">{counts.pastBudgetLines}</span>} />
            <Row k={t("admObservations")} v={<span className="num">{String(meta.observations)}</span>} />
            <Row k={t("admDbBuilt")} v={<span className="num">{String(meta.builtOn)}</span>} />
          </dl>
        ) : (
          <p className="text-sm text-ink-2">…</p>
        )}
        <p className="mt-3 text-xs text-ink-muted">{t("admDbRebuild")}</p>
      </Panel>
      <Card className="p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink">{t("adminTitle")}</h2>
        <p className="mb-4 text-sm text-ink-2">{t("adminSub")}</p>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-card border-2 border-dashed border-line px-6 py-8 text-center transition-colors hover:border-brand/50 hover:bg-hover"
        >
          <Upload className="mx-auto mb-2 text-ink-muted" size={28} />
          <p className="text-sm text-ink">{t("adminDrop")}</p>
          <p className="mt-1 text-xs text-ink-muted">{t("adminExpects")}</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
        {status.msg && (
          <p className={cx("mt-3 flex items-center gap-2 text-sm", status.kind === "ok" ? "text-ok" : status.kind === "error" ? "text-bad" : "text-ink-2")}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : status.kind === "ok" ? <CheckCircle2 size={14} /> : null}
            {status.msg}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
          <span>
            {t("adminCurrent")}: <span className="num">{data.meta.counts.items}</span> {t("adminItemsWord")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RotateCcw size={13} /> {t("adminReset")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
