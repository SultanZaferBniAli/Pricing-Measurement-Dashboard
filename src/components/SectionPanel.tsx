/**
 * The body of the section currently selected in the tab strip.
 *
 * There is no header and no collapse control here: the tabs above decide what
 * is on screen, and exactly one section is, so a panel never has to compete for
 * vertical space with three others.
 */
import { useMemo } from "react";
import { CheckCheck } from "lucide-react";
import { ItemRow } from "./ItemRow";
import { Card, cx } from "./ui";
import { useT } from "../lib/i18n";
import { sectionLines } from "../lib/pricing";
import { useStore } from "../lib/store";
import type { ScopeItem, Section } from "../lib/types";

export function SectionPanel({
  section,
  visibleItems,
  filtering,
  onClearFilters,
}: {
  section: Section;
  visibleItems: ScopeItem[];
  filtering: boolean;
  onClearFilters: () => void;
}) {
  const { t, tSubCategory } = useT();
  const selections = useStore((s) => s.selections);
  const allSections = useStore((s) => s.data.sections);
  const selectMany = useStore((s) => s.selectMany);
  const clearSection = useStore((s) => s.clearSection);

  const lines = sectionLines(section, selections, allSections);
  const lineById = useMemo(() => new Map(lines.map((l) => [l.item.id, l])), [lines]);

  const groups = useMemo(() => {
    const map = new Map<string, ScopeItem[]>();
    for (const it of visibleItems) {
      if (!map.has(it.subCategory)) map.set(it.subCategory, []);
      map.get(it.subCategory)!.push(it);
    }
    return Array.from(map.entries());
  }, [visibleItems]);

  if (groups.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-lavender-light/50">
        {t("noFilterMatches")}{" "}
        {filtering && (
          <button className="text-electric underline" onClick={onClearFilters}>
            {t("clearFilters")}
          </button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([sub, items]) => {
        const ids = items.map((i) => i.id);
        const defaultQtys = Object.fromEntries(items.map((i) => [i.id, i.defaultQty || 1]));
        const allSelected = ids.every((id) => selections[id]);
        const chosen = ids.filter((id) => selections[id]).length;

        return (
          <section key={sub}>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h3 className="flex items-baseline gap-2 text-sm font-semibold text-white">
                {tSubCategory(sub)}
                <span className="num text-xs font-normal text-lavender-light/40">
                  {chosen > 0 ? `${chosen}/${items.length}` : items.length}
                </span>
              </h3>
              <button
                onClick={() =>
                  allSelected ? clearSection(section.key, ids) : selectMany(ids, defaultQtys)
                }
                className={cx(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors",
                  allSelected
                    ? "border-white/10 text-lavender-light/60 hover:bg-white/5"
                    : "border-electric/30 text-lavender-light hover:bg-electric/10"
                )}
              >
                <CheckCheck size={13} />
                {allSelected ? t("deselectAll") : t("selectAll")}
              </button>
            </div>

            <Card className="p-2">
              {/* column headings sit with the rows they describe */}
              <div className="hidden grid-cols-12 gap-2 px-3 pb-1 pt-1 text-[10px] text-lavender-light/40 md:grid">
                <div className="col-span-5">{t("colItem")}</div>
                <div className="col-span-2">{t("colQty")}</div>
                <div className="col-span-2 text-end">{t("colUnitPrice")}</div>
                <div className="col-span-1 text-end">{t("colFee")}</div>
                <div className="col-span-2 text-end">{t("colTotal")}</div>
              </div>
              <div className="space-y-1">
                {items.map((it) => (
                  <ItemRow key={it.id} item={it} resolvedLine={lineById.get(it.id)} />
                ))}
              </div>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
