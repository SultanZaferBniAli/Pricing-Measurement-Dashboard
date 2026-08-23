/** A single scope line rendered as a table-like row with selection + qty + math. */
import { AlertTriangle } from "lucide-react";
import { money } from "../lib/format";
import { computeLine } from "../lib/pricing";
import { useStore } from "../lib/store";
import type { ScopeItem } from "../lib/types";
import { Badge, MatchBadge, SelectToggle, cx } from "./ui";

export function ItemRow({ item }: { item: ScopeItem }) {
  const selection = useStore((s) => s.selections[item.id]);
  const toggleItem = useStore((s) => s.toggleItem);
  const setQty = useStore((s) => s.setQty);
  const setCustomPrice = useStore((s) => s.setCustomPrice);

  const selected = Boolean(selection);
  const line = computeLine(item, selection ?? { qty: item.defaultQty || 1 });
  const showsUnpriced = line.isUnpriced;

  return (
    <div
      className={cx(
        "grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl border transition-colors",
        selected
          ? "bg-electric/10 border-electric/30"
          : "bg-white/[0.02] border-transparent hover:bg-white/[0.04]"
      )}
    >
      {/* select + name */}
      <div className="col-span-12 md:col-span-5 flex items-start gap-3 min-w-0">
        <div className="pt-0.5">
          <SelectToggle
            checked={selected}
            onChange={() => toggleItem(item.id, item.defaultQty)}
            label={`Select ${item.name}`}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{item.name}</span>
            {showsUnpriced && (
              <Badge tone="missing">
                <AlertTriangle size={11} /> Unpriced
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-lavender-light/60">
            <span>{item.subCategory}</span>
            <span className="opacity-40">·</span>
            <span>{item.type}</span>
            {item.priceSource && (
              <>
                <span className="opacity-40">·</span>
                <Badge tone="source">{item.priceSource}</Badge>
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

      {/* qty */}
      <div className="col-span-3 md:col-span-1 flex flex-col">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">Qty</span>
        <input
          type="number"
          min={0}
          value={selected ? selection!.qty : item.defaultQty || ""}
          disabled={!selected}
          onChange={(e) => setQty(item.id, parseFloat(e.target.value))}
          className="num w-16 rounded-lg bg-navy/60 border border-white/10 px-2 py-1 text-sm text-white text-center disabled:opacity-40 focus:border-electric focus:outline-none"
        />
      </div>

      {/* unit price (or custom price input for unpriced) */}
      <div className="col-span-4 md:col-span-2 flex flex-col">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">Unit Price</span>
        {item.isPriced ? (
          <span className="num text-sm text-lavender-light text-right">
            {money(item.unitPrice)}
          </span>
        ) : (
          <input
            type="number"
            min={0}
            placeholder="Set price"
            value={selection?.customPrice ?? ""}
            onChange={(e) =>
              setCustomPrice(item.id, e.target.value === "" ? null : parseFloat(e.target.value))
            }
            className="num w-24 rounded-lg bg-gold/10 border border-gold/30 px-2 py-1 text-sm text-gold text-right placeholder:text-gold/40 focus:border-gold focus:outline-none"
            title="Enter a custom price to include this item in totals"
          />
        )}
      </div>

      {/* fee */}
      <div className="col-span-4 md:col-span-1 flex flex-col">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">Fee 15%</span>
        <span className="num text-sm text-lavender-light/70 text-right">
          {selected && !showsUnpriced ? money(line.fee) : "-"}
        </span>
      </div>

      {/* total */}
      <div className="col-span-4 md:col-span-2 flex flex-col">
        <span className="md:hidden text-[10px] uppercase text-lavender-light/40">Total</span>
        <span
          className={cx(
            "num text-sm font-semibold text-right",
            selected && !showsUnpriced ? "text-white" : "text-lavender-light/40"
          )}
        >
          {selected && !showsUnpriced ? money(line.totalCost) : "-"}
        </span>
      </div>

      <div className="hidden md:block md:col-span-1" />
    </div>
  );
}
