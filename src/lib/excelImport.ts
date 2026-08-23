/**
 * Excel import — lets an admin re-upload an updated
 * "Scope_of_Work_Priced_QTY.xlsx" and re-parse it at runtime, mirroring the
 * build-time Python parser (scripts/parse_excel.py).
 */
import ExcelJS from "exceljs";
import { enrichScopeData } from "./enrich";
import type { ScopeData, ScopeItem, Section } from "./types";

const SECTIONS = ["MARKETING", "EVENT MANAGEMENT", "LOGISTICS", "VIDEO PRODUCTIONS"];
const LABEL: Record<string, string> = {
  MARKETING: "Marketing",
  "EVENT MANAGEMENT": "Event Management",
  LOGISTICS: "Logistics",
  "VIDEO PRODUCTIONS": "Video Productions",
};

function clean(v: unknown): string {
  if (v == null) return "";
  let s = String(typeof v === "object" && "text" in (v as any) ? (v as any).text : v).trim();
  s = s.replace(/[—–]/g, "-"); // normalize em/en dashes to a plain hyphen
  return s;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function slugify(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function parseScopeWorkbook(file: File): Promise<Section[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet("Scope of Work") ?? wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found.");

  const sections: Section[] = [];
  let current: Section | null = null;
  let subCat = "General";
  const seen: Record<string, number> = {};

  ws.eachRow((row) => {
    const c = (i: number) => clean(row.getCell(i).value);
    const main = c(1);
    const sub = c(2);
    const mainUpper = main.toUpperCase();

    if (SECTIONS.includes(mainUpper) && !sub) {
      current = { id: slugify(main), key: mainUpper, name: LABEL[mainUpper], items: [] };
      sections.push(current);
      subCat = "General";
      return;
    }
    if (!current) return;
    if (mainUpper.endsWith("SUBTOTAL") || mainUpper === "GRAND TOTAL") return;
    if (["HOW TO USE:", "MAPPING SUMMARY"].includes(mainUpper) || mainUpper.startsWith("SCOPE LINES"))
      return;

    if (main) {
      subCat = main;
      if (!sub) return;
    }
    if (!sub) return;

    const type = c(3);
    const qty = num(row.getCell(4).value);
    const unitPriceRaw = num(row.getCell(5).value);
    const totalText = c(7);
    const sourceItem = c(8);
    const masterCat = c(9);
    const masterQtyUnit = c(10);
    const priceSource = c(11);
    const match = c(12);
    const note = c(13);

    const notInMaster =
      match.toUpperCase() === "NOT IN MASTER" ||
      note.includes("not in Pricing Master") ||
      totalText.includes("not in Pricing Master");
    const priced = unitPriceRaw != null && unitPriceRaw > 0 && !notInMaster;

    let id = slugify(current.key, subCat, sub);
    if (id in seen) {
      seen[id] += 1;
      id = `${id}-${seen[id]}`;
    } else {
      seen[id] = 0;
    }

    const item: ScopeItem = {
      id,
      section: current.name,
      sectionKey: current.key,
      subCategory: subCat,
      name: sub,
      type: type || "-",
      defaultQty: qty ? Math.round(qty) : priced ? 1 : 0,
      unitPrice: priced ? unitPriceRaw : null,
      sourceItem,
      masterCategory: masterCat,
      masterQtyUnit,
      priceSource,
      matchStatus: match || (priced ? "" : "NOT IN MASTER"),
      mappingNote: note,
      isPriced: priced,
    };
    current.items.push(item);
  });

  return sections;
}

/** Re-parse a file and fold it into a full ScopeData object (keeps master/reference). */
export async function importScopeData(file: File, base: ScopeData): Promise<ScopeData> {
  const sections = await parseScopeWorkbook(file);
  if (sections.length === 0) throw new Error("No sections detected. Is this the Scope of Work file?");
  // Apply the same research pricing layer used for the bundled data.
  return enrichScopeData({ ...base, sections });
}
