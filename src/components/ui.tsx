/**
 * Small reusable UI primitives shared across screens, styled to the TAM brand.
 * Kept dependency-free (plain Tailwind) so the whole app is self-contained.
 */
import React from "react";
import { useT } from "../lib/i18n";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Brand card surface with soft radius and shadow. */
export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cx(
        "rounded-card bg-surface/90 border border-line shadow-card",
        className
      )}
      {...props}
    />
  );
}

/** A small rotated diamond marker used near section headings. */
export function Diamond({ className }: { className?: string }) {
  return (
    <span
      className={cx("tam-diamond bg-warn", className)}
      aria-hidden="true"
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "warn";
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  // emil-design-eng: name exact properties (never `transition: all`), give an
  // instant `:active` press response, and keep a visible keyboard focus ring.
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[transform,background-color,box-shadow,border-color] duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
  const sizes = { sm: "text-sm px-3 py-1.5", md: "text-sm px-4 py-2.5" };
  const variants = {
    primary:
      "bg-brand text-on-brand hover:bg-brand/90 shadow-[0_6px_20px_-8px_rgb(var(--brand)/0.55)]",
    secondary: "border border-line bg-surface text-ink hover:bg-hover",
    ghost: "bg-transparent text-ink-2 hover:bg-hover hover:text-ink",
    warn: "bg-warn text-on-brand hover:bg-warn/90 font-semibold",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...props} />
  );
}

/** Coloured status pill for match / source / priced flags. */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "exact" | "close" | "missing" | "warn" | "source";
  className?: string;
}) {
  const tones = {
    neutral: "bg-raised text-ink-2 border-line",
    exact: "bg-ok-bg text-ok border-ok/25",
    close: "bg-active text-brand border-brand/25",
    missing: "bg-warn-bg text-warn border-warn/30",
    warn: "bg-warn-bg text-warn border-warn/40",
    source: "bg-active text-brand border-brand/25",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Match-status badge with the right tone. */
export function MatchBadge({ status }: { status: string }) {
  const { tMatch } = useT();
  const s = (status || "").toUpperCase();
  if (s === "EXACT") return <Badge tone="exact">{tMatch(s)}</Badge>;
  if (s === "CLOSE") return <Badge tone="close">{tMatch(s)}</Badge>;
  if (s === "NOT IN MASTER") return <Badge tone="missing">{tMatch(s)}</Badge>;
  return status ? <Badge tone="neutral">{tMatch(s)}</Badge> : null;
}

/** Section-heading label with diamond markers. */
export function SectionHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Diamond />
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{children}</h2>
        {sub && <p className="text-sm text-ink-2">{sub}</p>}
      </div>
    </div>
  );
}

/** Simple accessible toggle/checkbox used to select an item. */
export function SelectToggle({
  checked,
  onChange,
  label,
  tabIndex,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
  /** -1 when an enclosing row already handles focus and keyboard activation. */
  tabIndex?: number;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? "Select item"}
      tabIndex={tabIndex}
      onClick={onChange}
      className={cx(
        // emil-design-eng: specific transitions + a quick press response.
        "h-5 w-5 shrink-0 rounded-md border transition-[background-color,border-color,transform] duration-150 ease-out active:scale-90 flex items-center justify-center",
        checked
          ? "bg-brand border-brand"
          : "bg-transparent border-brand-soft/40 hover:border-brand-soft"
      )}
    >
      {checked && (
        // "Nothing appears from nothing" - the tick scales/fades in, not a pop.
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          className="animate-check"
        >
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
