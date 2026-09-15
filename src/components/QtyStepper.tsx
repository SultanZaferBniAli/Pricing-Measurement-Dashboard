/**
 * Quantity control: minus / value / plus, where the value is still a real text
 * field. Stepping is for the common case of nudging by one; typing is for when
 * you want 100 and are not going to press a button a hundred times.
 *
 * The field keeps its own draft string while focused so that clearing it to
 * retype does not momentarily read as 0 and recompute the budget.
 */
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useT } from "../lib/i18n";
import { cx } from "./ui";

export function QtyStepper({
  value,
  onChange,
  disabled,
  min = 0,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  min?: number;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState<string | null>(null);

  // Follow the store while not being edited (select-all, clear, reset).
  useEffect(() => {
    if (draft !== null) setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    onChange(Number.isFinite(n) ? Math.max(min, n) : min);
    setDraft(null);
  };

  const step = (delta: number) => onChange(Math.max(min, (value || 0) + delta));

  return (
    <div
      className={cx(
        // self-start, or the flex column this sits in stretches it edge to edge
        "inline-flex w-fit shrink-0 self-start items-center rounded-lg border border-white/10 bg-navy/60",
        disabled && "opacity-40"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <StepButton
        label={t("decrease")}
        disabled={disabled || value <= min}
        onClick={() => step(-1)}
      >
        <Minus size={13} />
      </StepButton>

      <input
        type="text"
        inputMode="decimal"
        aria-label={t("colQty")}
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "ArrowUp") {
            e.preventDefault();
            step(1);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            step(-1);
          }
        }}
        className="num w-10 border-x border-white/10 bg-transparent py-1 text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-electric disabled:cursor-not-allowed"
      />

      <StepButton label={t("increase")} disabled={disabled} onClick={() => step(1)}>
        <Plus size={13} />
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="px-1.5 py-1.5 text-lavender-light/70 transition-colors duration-150 hover:text-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}
