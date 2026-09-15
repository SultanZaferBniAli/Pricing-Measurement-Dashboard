/** A single scope line rendered as a table-like row with selection + qty + math. */
import { AlertTriangle, Percent } from "lucide-react";
import { QtyStepper } from "./QtyStepper";
import { money } from "../lib/format";
import { useT } from "../lib/i18n";
import { computeLine } from "../lib/pricing";
import { useStore } from "../lib/store";
import type { ComputedLine, ScopeItem } from "../lib/types";
import { Badge, MatchBadge, SelectToggle, cx } from "./ui";

/**
 * A single scope line. Contingency lines take a percentage instead of a unit
 * price, so their resolved line is passed down from the section (it depends on
 * the rest of the budget) rather than computed here.
 */
export function ItemRow({
  item,
  resolvedLine,
}: {
  item: ScopeItem;
  resolvedLine?: ComputedLine;
}) {
  const { t, tSubCategory, tType, tSource } = useT();
  const selection = useStore((s) => s.selections[item.id]);
  const toggleItem = useStore((s) => s.toggleItem);
  const setQty = useStore((s) => s.setQty);
  const setCustomPrice = useStore((s) => s.setCustomPrice);
  const setPercentRate = useStore((s) => s.setPercentRate);

  const selected = Boolean(selection);
  const isPercent = item.percentBasis != null;
  const line =
    resolvedLine ?? computeLine(item, selection ?? { qty: item.defaultQty || 1 });
  const showsUnpriced = line.isUnpriced;

  return (
    /**
     * The whole row toggles selection, so the target is the line you are reading
     * rather than a 20px box beside it. The quantity, price and rate controls
     * stop the click, since editing a value is not choosing the line.
     */
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => toggleItem(item.id, item.defaultQty)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleItem(item.id, item.defaultQty);
        }
      }}
      className={cx(
        "grid cursor-pointer grid-cols-12 items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender/50",
        selected
          ? "border-electric/30 bg-electric/10"
          : "border-transparent bg-white/[0.02] hover:bg-white/[0.06]"
      )}
    >
      {/* select + name */}
      <div className="col-span-12 md:col-span-5 flex items-start gap-3 min-w-0">
        {/* the box toggles on its own; without this the click would also reach
            the row handler and cancel itself out */}
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <SelectToggle
            checked={selected}
            onChange={() => toggleItem(item.id, item.defaultQty)}
            label={t("selectItem", { name: item.name })}
            tabIndex={-1}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{item.name}</span>
            {showsUnpriced && (
              <Badge tone="missing">
                <AlertTriangle size={11} />{" "}
                {isPercent ? t("badgeSetRate") : t("badgeUnpriced")}
              </Badge>
            )}
            {isPercent && !showsUnpriced && (
              <Badge tone="gold">
                <Percent size={11} />{" "}
                {item.percentBasis === "budget"
                  ? t("ofBudgetBase")
                  : t("ofSectionBase")}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-lavender-light/60">
            <span>{tSubCategory(item.subCategory)}</span>
            <span className="opacity-40">·</span>
            <span>{tType(item.type)}</span>
            {item.priceSource && (
              <>
                <span className="opacity-40">·</span>
                <Badge tone="source">{tSource(item.priceSource)}</Badge>
              </>
            )}
            <MatchBadge status={item.matchStatus} />
          </div>
          {item.mappingNote && (
            <p className="mt-1 text-[11px] leading-snug text-lavender-light/40 max-w-xl">
              {item.mappingNote}
            </p>
          )}
        </div>
      </div>

      {/* qty (a contingency is always a single line, so no quantity applies) */}
      <div className="col-span-5 md:col-span-2 flex flex-col gap-1">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">
          {isPercent ? t("colRate") : t("colQty")}
        </span>
        {isPercent ? (
          <span className="num text-sm text-lavender-light/40 text-center">-</span>
        ) : (
          <QtyStepper
            value={selected ? selection!.qty : item.defaultQty || 1}
            disabled={!selected}
            onChange={(n) => setQty(item.id, n)}
          />
        )}
      </div>

      {/* unit price, a custom price for unpriced lines, or a % rate */}
      <div className="col-span-7 md:col-span-2 flex flex-col gap-1">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">
          {isPercent ? t("colRatePct") : t("colUnitPrice")}
        </span>
        {isPercent ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder={t("setPercent")}
              value={selection?.percentRate ?? ""}
              onChange={(e) =>
                setPercentRate(
                  item.id,
                  e.target.value === "" ? null : parseFloat(e.target.value)
                )
              }
              onClick={(e) => e.stopPropagation()}
              className="num w-20 rounded-lg bg-gold/10 border border-gold/30 px-2 py-1 text-sm text-gold text-end placeholder:text-gold/40 focus:border-gold focus:outline-none"
              title={t("percentHint")}
            />
            <span className="text-xs text-gold/70">%</span>
          </div>
        ) : item.isPriced ? (
          <span className="num text-sm text-lavender-light text-end">
            {money(item.unitPrice)}
          </span>
        ) : (
          <input
            type="number"
            min={0}
            placeholder={t("setPrice")}
            value={selection?.customPrice ?? ""}
            onChange={(e) =>
              setCustomPrice(item.id, e.target.value === "" ? null : parseFloat(e.target.value))
            }
            onClick={(e) => e.stopPropagation()}
            className="num w-24 rounded-lg bg-gold/10 border border-gold/30 px-2 py-1 text-sm text-gold text-end placeholder:text-gold/40 focus:border-gold focus:outline-none"
            title={t("customPriceHint")}
          />
        )}
      </div>

      {/* fee */}
      <div className="col-span-5 md:col-span-1 flex flex-col gap-1">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">{t("colFee")}</span>
        <span className="num text-sm text-lavender-light/70 text-end">
          {selected && !showsUnpriced ? money(line.fee) : "-"}
        </span>
      </div>

      {/* total */}
      <div className="col-span-7 md:col-span-2 flex flex-col gap-1">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">{t("colTotal")}</span>
        <span
          className={cx(
            "num text-sm font-semibold text-end",
            selected && !showsUnpriced ? "text-white" : "text-lavender-light/40"
          )}
        >
          {selected && !showsUnpriced ? money(line.totalCost) : "-"}
        </span>
      </div>
    </div>
  );
}
