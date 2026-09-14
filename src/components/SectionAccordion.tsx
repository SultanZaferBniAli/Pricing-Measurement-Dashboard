/**
 * An inline, collapsible section card. Click the header to expand it in place
 * and select items, without navigating away.
 */
import { useMemo } from "react";
import { CheckCheck, ChevronDown, TriangleAlert } from "lucide-react";
import { ItemRow } from "./ItemRow";
import { Badge, Card, Diamond, cx } from "./ui";
import { money } from "../lib/format";
import { sectionLines, sumLines } from "../lib/pricing";
import { useStore } from "../lib/store";
import type { ScopeItem, Section } from "../lib/types";

export function SectionAccordion({
  section,
  visibleItems,
  expanded,
  onToggle,
}: {
  section: Section;
  visibleItems: ScopeItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const selections = useStore((s) => s.selections);
  const allSections = useStore((s) => s.data.sections);
  const selectMany = useStore((s) => s.selectMany);
  const clearSection = useStore((s) => s.clearSection);

  const lines = sectionLines(section, selections, allSections);
  const lineById = useMemo(
    () => new Map(lines.map((l) => [l.item.id, l])),
    [lines]
  );
  const totals = sumLines(lines.filter((l) => !l.isUnpriced));
  const selectedCount = lines.length;
  const unpricedSelected = lines.filter((l) => l.isUnpriced).length;
  const pricedAvailable = section.items.filter((i) => i.isPriced).length;

  const groups = useMemo(() => {
    const map = new Map<string, ScopeItem[]>();
    for (const it of visibleItems) {
      if (!map.has(it.subCategory)) map.set(it.subCategory, []);
      map.get(it.subCategory)!.push(it);
    }
    return Array.from(map.entries());
  }, [visibleItems]);

  return (
    <Card className={cx("overflow-hidden", expanded && "border-electric/30")}>
      {/* header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors duration-150"
      >
        <Diamond />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-white">{section.name}</h3>
            <Badge tone="neutral">{section.items.length} items</Badge>
            <Badge tone="exact">{pricedAvailable} priced</Badge>
            {selectedCount > 0 && <Badge tone="gold">{selectedCount} selected</Badge>}
            {unpricedSelected > 0 && (
              <Badge tone="missing">
                <TriangleAlert size={11} /> {unpricedSelected} need price
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-lavender-light/50">
            Subtotal (incl. fee)
          </div>
          <div className="text-lg font-bold text-gold num">{money(totals.grand)}</div>
        </div>
        <ChevronDown
          size={20}
          className={cx(
            "text-lavender-light/60 transition-transform shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* body */}
      {expanded && (
        <div className="px-3 pb-4 pt-1 border-t border-white/5 animate-fade-in">
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-lavender-light/40">
            <div className="col-span-5">Item</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-1 text-right">Fee 15%</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1" />
          </div>

          {groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-lavender-light/50">
              No items match the current filters.
            </p>
          ) : (
            <div className="space-y-4 mt-2">
              {groups.map(([sub, items]) => {
                const ids = items.map((i) => i.id);
                const defaultQtys = Object.fromEntries(
                  items.map((i) => [i.id, i.defaultQty || 1])
                );
                const allSelected = ids.every((id) => selections[id]);
                return (
                  <div key={sub}>
                    <div className="flex items-center justify-between mb-1.5 px-2">
                      <div className="flex items-center gap-2">
                        <span className="tam-diamond bg-lavender/60" />
                        <h4 className="text-sm font-semibold text-lavender-light">{sub}</h4>
                        <span className="text-xs text-lavender-light/40">({items.length})</span>
                      </div>
                      <button
                        onClick={() =>
                          allSelected
                            ? clearSection(section.key, ids)
                            : selectMany(ids, defaultQtys)
                        }
                        className={cx(
                          "text-xs flex items-center gap-1.5 rounded-lg px-2.5 py-1 border transition-colors",
                          allSelected
                            ? "border-white/10 text-lavender-light/60 hover:bg-white/5"
                            : "border-electric/30 text-lavender-light hover:bg-electric/10"
                        )}
                      >
                        <CheckCheck size={13} />
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    <Card className="p-2 space-y-1">
                      {items.map((it) => (
                        <ItemRow key={it.id} item={it} resolvedLine={lineById.get(it.id)} />
                      ))}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
