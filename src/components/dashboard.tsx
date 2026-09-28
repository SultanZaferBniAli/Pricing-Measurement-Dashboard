/**
 * The dashboard's reusable pieces: panel, KPI tile, status badge, donut,
 * category legend and a compact table shell.
 *
 * They exist so the overview, the vendor view and the history listing are built
 * from the same parts rather than each inventing its own card. Everything here
 * is theme-agnostic: colours come from the tokens, so light and dark are free.
 */
import type { ReactNode } from "react";
import { cx } from "./ui";

/* ------------------------------------------------------------------ panel */

/** A titled card. The optional action sits opposite the title. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cx(
        "min-w-0 rounded-card border border-line bg-surface shadow-card",
        className
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-ink">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className={cx("px-5 pb-5", !title && "pt-5", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- kpi */

export type KpiTone = "brand" | "ok" | "warn" | "bad" | "neutral";

const KPI_TONE: Record<KpiTone, { icon: string; value: string }> = {
  brand: { icon: "bg-active text-brand", value: "text-ink" },
  ok: { icon: "bg-ok-bg text-ok", value: "text-ink" },
  warn: { icon: "bg-warn-bg text-warn", value: "text-warn" },
  bad: { icon: "bg-bad-bg text-bad", value: "text-bad" },
  neutral: { icon: "bg-raised text-ink-2", value: "text-ink" },
};

/**
 * One figure, one label, one icon.
 *
 * `hint` is for a fact that qualifies the number ("4 need a price"), not a
 * decorative trend: this tool has no time series to trend against, and a fake
 * "+12%" on a budget figure would be a lie.
 */
export function KpiTile({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: KpiTone;
}) {
  const t = KPI_TONE[tone];
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface p-4 shadow-card transition-colors duration-150 hover:border-brand/30">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-ink-2">{label}</span>
        <span
          className={cx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-control",
            t.icon
          )}
        >
          {icon}
        </span>
      </div>
      <p className={cx("num mt-2 text-2xl font-bold leading-tight", t.value)}>
        {value}
        {unit && (
          <span className="ms-1 text-sm font-normal text-ink-2">{unit}</span>
        )}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------- badge */

export type StatusTone = "info" | "ok" | "warn" | "bad" | "neutral";

const STATUS_TONE: Record<StatusTone, string> = {
  info: "bg-active text-brand border-brand/20",
  ok: "bg-ok-bg text-ok border-ok/25",
  warn: "bg-warn-bg text-warn border-warn/25",
  bad: "bg-bad-bg text-bad border-bad/25",
  neutral: "bg-raised text-ink-2 border-line",
};

export function StatusBadge({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STATUS_TONE[tone]
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** The coloured initial square used beside a project name. */
export function ProjectMark({ name }: { name: string }) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  // stable colour per name, from the category family
  const shades = ["bg-c1", "bg-c2", "bg-c3", "bg-c4", "bg-c5"];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cx(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-xs font-bold text-on-brand",
        shades[h % shades.length]
      )}
    >
      {letter}
    </span>
  );
}

/* ----------------------------------------------------------------- donut */

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * A donut drawn as stroked arcs on one circle.
 *
 * SVG rather than a chart library: five arcs and a label do not justify a
 * dependency, and this way the colours are the same tokens as everything else.
 */
export function Donut({
  slices,
  centerValue,
  centerLabel,
  size = 176,
}: {
  slices: Slice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = total > 0 ? s.value / total : 0;
      const arc = { ...s, dash: frac * c, offset };
      offset += frac * c;
      return arc;
    });

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${centerLabel}: ${centerValue}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-line"
        />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            stroke={a.color}
            strokeDasharray={`${a.dash} ${c - a.dash}`}
            strokeDashoffset={-a.offset}
            className="transition-[stroke-dasharray,stroke-dashoffset] duration-500 ease-out"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="num text-xl font-bold text-ink">{centerValue}</span>
        <span className="mt-0.5 px-4 text-[11px] leading-tight text-ink-2">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

/** Colour, name, amount, share. One row per slice. */
export function Legend({
  slices,
  total,
  emptyLabel,
  format,
}: {
  slices: Slice[];
  total: number;
  emptyLabel: string;
  format: (n: number) => string;
}) {
  if (total <= 0) {
    return <p className="text-sm text-ink-2">{emptyLabel}</p>;
  }
  return (
    <ul className="min-w-0 flex-1 space-y-2.5">
      {slices.map((s) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {s.label}
            </span>
            <span className="num shrink-0 text-sm font-semibold text-ink">
              {format(s.value)}
            </span>
            <span className="num hidden w-12 shrink-0 text-end text-xs text-ink-2 sm:block">
              {pct.toFixed(0)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ tabs */

export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <div
      role="tablist"
      className="flex flex-wrap gap-1 rounded-control bg-raised p-1"
    >
      {options.map(([v, label]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={cx(
            "rounded-[9px] px-2.5 py-1.5 text-xs font-medium transition-colors duration-150",
            value === v
              ? "bg-surface text-brand shadow-sm"
              : "text-ink-2 hover:text-ink"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
