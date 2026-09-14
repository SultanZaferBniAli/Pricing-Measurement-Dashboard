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
        "rounded-card bg-surface/90 border border-white/5 shadow-card",
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
      className={cx("tam-diamond bg-gold", className)}
      aria-hidden="true"
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "gold";
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
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[transform,background-color,box-shadow,border-color] duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
  const sizes = { sm: "text-sm px-3 py-1.5", md: "text-sm px-4 py-2.5" };
  const variants = {
    primary:
      "bg-electric hover:bg-electric/90 text-white shadow-[0_6px_20px_-8px_rgba(94,69,255,0.9)]",
    secondary:
      "bg-transparent border border-lavender/40 text-lavender-light hover:bg-white/5",
    ghost: "bg-transparent text-lavender-light hover:bg-white/5",
    gold: "bg-gold hover:bg-gold/90 text-navy font-semibold",
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
  tone?: "neutral" | "exact" | "close" | "missing" | "gold" | "source";
  className?: string;
}) {
  const tones = {
    neutral: "bg-white/8 text-lavender-light border-white/10",
    exact: "bg-emerald-400/15 text-emerald-300 border-emerald-400/25",
    close: "bg-lavender/15 text-lavender-light border-lavender/30",
    missing: "bg-gold/15 text-gold border-gold/30",
    gold: "bg-gold/20 text-gold border-gold/40",
    source: "bg-electric/15 text-lavender-light border-electric/30",
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
        <h2 className="text-lg font-semibold tracking-tight text-white">{children}</h2>
        {sub && <p className="text-sm text-lavender-light/70">{sub}</p>}
      </div>
    </div>
  );
}

/** Simple accessible toggle/checkbox used to select an item. */
export function SelectToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? "Select item"}
      onClick={onChange}
      className={cx(
        // emil-design-eng: specific transitions + a quick press response.
        "h-5 w-5 shrink-0 rounded-md border transition-[background-color,border-color,transform] duration-150 ease-out active:scale-90 flex items-center justify-center",
        checked
          ? "bg-electric border-electric"
          : "bg-transparent border-lavender/40 hover:border-lavender"
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
