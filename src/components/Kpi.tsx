import type { ReactNode } from "react";
import { Card, Diamond } from "./ui";

/** KPI stat card used on the dashboard overview. */
export function Kpi({
  label,
  value,
  sub,
  icon,
  accent = "brand-soft",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "brand-soft" | "warn" | "brand" | "ok";
}) {
  const accents: Record<string, string> = {
    "brand-soft": "text-ink-2",
    warn: "text-warn",
    brand: "text-brand",
    ok: "text-ok",
  };
  return (
    <Card className="p-4 relative overflow-hidden">
      {/* subtle corner wave accent */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-brand/10 blur-xl" />
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wider text-ink-2">
          {label}
        </span>
        {icon && <span className={accents[accent]}>{icon}</span>}
      </div>
      <div className={`mt-2 text-2xl font-bold num ${accents[accent]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-2">{sub}</div>}
    </Card>
  );
}

/** Bigger money KPI used for the running budget total. */
export function MoneyKpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`p-4 ${
        highlight ? "bg-brand border-brand/40" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-2">
        <Diamond className="!h-2 !w-2" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-ink num">
        {value} <span className="text-sm font-normal text-ink-2">SAR</span>
      </div>
    </Card>
  );
}
