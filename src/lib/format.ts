/** Formatting helpers shared across the UI and export. */

export const FEE_RATE = 0.15;

/**
 * Saudi VAT, charged on the whole invoice value: the scope cost plus TAM's fee.
 * It is a pass-through tax, not revenue, which is why it sits apart from the
 * fee in every total rather than being folded into it.
 */
export const VAT_RATE = 0.15;

const sarFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format a number as an SAR amount, e.g. 17135 -> "17,135". */
export function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return sarFormatter.format(value);
}

/** Format with the SAR suffix, e.g. "17,135 SAR". */
export function sar(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${sarFormatter.format(value)} SAR`;
}

/** Compact form for KPI cards, e.g. 261338 -> "261.3K". */
export function compact(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return sarFormatter.format(value);
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
