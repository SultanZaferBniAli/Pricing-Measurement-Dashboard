import type { ReactNode } from "react";
import { Card, Diamond } from "./ui";

/** KPI stat card used on the dashboard overview. */
export function Kpi({
  label,
  value,
  sub,
  icon,
  accent = "lavender",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "lavender" | "gold" | "electric" | "emerald";
}) {
  const accents: Record<string, string> = {
    lavender: "text-lavender-light",
    gold: "text-gold",
    electric: "text-electric",
    emerald: "text-emerald-300",
  };
  return (
    <Card className="p-4 relative overflow-hidden">
      {/* subtle corner wave accent */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-electric/10 blur-xl" />
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wider text-lavender-light/60">
          {label}
        </span>
        {icon && <span className={accents[accent]}>{icon}</span>}
      </div>
      <div className={`mt-2 text-2xl font-bold num ${accents[accent]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-lavender-light/60">{sub}</div>}
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
        highlight ? "bg-tam-gradient border-electric/40" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-lavender-light/70">
        <Diamond className="!h-2 !w-2" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-white num">
        {value} <span className="text-sm font-normal text-lavender-light/70">SAR</span>
      </div>
    </Card>
  );
}
