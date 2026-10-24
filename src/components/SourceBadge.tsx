/** The label every priced row carries: where the number came from. */
import { Database, FolderClock, Pencil, Scale } from "lucide-react";
import { Badge } from "./ui";
import { useT } from "../lib/i18n";
import type { PriceSourceType } from "../lib/types";

export function SourceBadge({ type, compact }: { type: PriceSourceType; compact?: boolean }) {
  const { t } = useT();
  const map = {
    database: { tone: "exact" as const, icon: <Database size={11} />, label: t("srcDatabase") },
    similar_project: { tone: "close" as const, icon: <FolderClock size={11} />, label: t("srcSimilar") },
    benchmark: { tone: "warn" as const, icon: <Scale size={11} />, label: t("srcBenchmark") },
    manual: { tone: "neutral" as const, icon: <Pencil size={11} />, label: t("srcManual") },
  };
  const m = map[type] ?? map.manual;
  return (
    <Badge tone={m.tone} className={compact ? "px-1.5" : ""}>
      {m.icon}
      {!compact && m.label}
    </Badge>
  );
}
