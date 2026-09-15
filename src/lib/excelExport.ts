/**
 * Excel export - produces a clean, client-ready workbook from the current
 * selection using ExcelJS (styled headers, TAM brand colours, four sheets).
 *
 *   Sheet 1: Budget Summary  - title, date, totals, per-section breakdown
 *   Sheet 2: Selected Items  - every priced selected line with full detail
 *   Sheet 3: Unpriced Items  - selected lines still missing a price
 *   Sheet 4: Source Reference - pricing-master provenance for each line
 */
import ExcelJS from "exceljs";
import { FEE_RATE } from "./format";
import { allSelectedLines, sumLines } from "./pricing";
import type { ComputedLine, ScopeData, Selection } from "./types";

// Brand colours as ARGB (ExcelJS wants no leading #)
const NAVY = "FF222242";
const ELECTRIC = "FF5E45FF";
const SURFACE = "FF2A2756";
const GOLD = "FFEBA036";
const WHITE = "FFFFFFFF";
const LIGHT = "FFEDECFB";

function titleRow(
  ws: ExcelJS.Worksheet,
  text: string,
  span: number,
  fill = ELECTRIC
) {
  const row = ws.addRow([text]);
  ws.mergeCells(row.number, 1, row.number, span);
  const cell = row.getCell(1);
  cell.font = { bold: true, size: 14, color: { argb: WHITE } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  row.height = 26;
  return row;
}

function headerRow(ws: ExcelJS.Worksheet, headers: string[]) {
  const row = ws.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: ELECTRIC } } };
  });
  row.height = 22;
  return row;
}

function money(cell: ExcelJS.Cell) {
  cell.numFmt = "#,##0.00";
  cell.alignment = { horizontal: "right" };
}

export async function buildWorkbook(
  data: ScopeData,
  selections: Record<string, Selection>,
  budgetTitle: string,
  dateStr: string,
  client = ""
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TAM Scope-Based Budget Builder";
  wb.created = new Date(dateStr);

  const lines = allSelectedLines(data.sections, selections);
  const priced = lines.filter((l) => !l.isUnpriced);
  const unpriced = lines.filter((l) => l.isUnpriced);
  const totals = sumLines(priced);

  // ---------- Sheet 1: Budget Summary ----------
  const s1 = wb.addWorksheet("Budget Summary", {
    properties: { defaultColWidth: 22 },
  });
  s1.columns = [{ width: 34 }, { width: 20 }, { width: 20 }, { width: 20 }];
  titleRow(s1, "TAM Development Company Budget Summary", 4);
  s1.addRow([]);
  s1.addRow(["Budget Title", budgetTitle]);
  s1.addRow(["Client", client || "-"]);
  s1.addRow(["Export Date", dateStr]);
  s1.addRow(["Currency", data.meta.currency]);
  s1.addRow(["Fee Rate", `${FEE_RATE * 100}%`]);
  s1.addRow(["Selected Items", priced.length + unpriced.length]);
  s1.addRow(["Unpriced (excluded)", unpriced.length]);
  s1.addRow([]);

  headerRow(s1, ["Grand Totals", "Amount (SAR)", "", ""]);
  const t1 = s1.addRow(["Total Base Cost", totals.base]);
  money(t1.getCell(2));
  const t2 = s1.addRow(["Total Fees (15%)", totals.fee]);
  money(t2.getCell(2));
  const t3 = s1.addRow(["Grand Total", totals.grand]);
  money(t3.getCell(2));
  t3.eachCell((c) => {
    c.font = { bold: true, color: { argb: NAVY } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
  });
  s1.addRow([]);

  headerRow(s1, ["Section", "Base Cost", "Fees (15%)", "Grand Total"]);
  for (const section of data.sections) {
    const sl = lines.filter(
      (l) => l.item.sectionKey === section.key && !l.isUnpriced
    );
    if (sl.length === 0) continue;
    const st = sumLines(sl);
    const r = s1.addRow([section.name, st.base, st.fee, st.grand]);
    money(r.getCell(2));
    money(r.getCell(3));
    money(r.getCell(4));
  }

  // ---------- Sheet 2: Selected Items ----------
  const s2 = wb.addWorksheet("Selected Items");
  const cols2 = [
    "Main Section",
    "Sub-Category",
    "Item",
    "Type",
    "Qty",
    "Unit Price (SAR)",
    "Base Cost",
    "Fee (15%)",
    "Total Cost (SAR)",
    "Price Source",
    "Match",
    "Notes / Mapping Note",
  ];
  s2.columns = cols2.map((h, i) => ({
    width: i === 2 ? 34 : i === 11 ? 40 : 16,
  }));
  titleRow(s2, "Selected Items", cols2.length);
  headerRow(s2, cols2);
  addLineRows(s2, priced);
  // totals footer
  const foot = s2.addRow([
    "",
    "",
    "",
    "",
    "",
    "TOTAL",
    totals.base,
    totals.fee,
    totals.grand,
    "",
    "",
    "",
  ]);
  [7, 8, 9].forEach((i) => money(foot.getCell(i)));
  foot.eachCell((c) => {
    c.font = { bold: true, color: { argb: WHITE } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SURFACE } };
  });

  // ---------- Sheet 3: Unpriced / Excluded ----------
  const s3 = wb.addWorksheet("Unpriced Items");
  const cols3 = [
    "Main Section",
    "Sub-Category",
    "Item",
    "Type",
    "Qty",
    "Match",
    "Reason / Mapping Note",
  ];
  s3.columns = cols3.map((_, i) => ({ width: i === 2 ? 34 : i === 6 ? 50 : 16 }));
  titleRow(s3, "Unpriced / Excluded Items (no price applied)", cols3.length, GOLD)
    .getCell(1).font = { bold: true, size: 14, color: { argb: NAVY } };
  headerRow(s3, cols3);
  if (unpriced.length === 0) {
    s3.addRow(["No unpriced items in this budget."]);
  } else {
    for (const l of unpriced) {
      const isPercent = l.item.percentBasis != null;
      s3.addRow([
        l.item.section,
        l.item.subCategory,
        l.item.name,
        isPercent ? "Contingency (rate not set)" : l.item.type,
        isPercent ? "-" : l.qty,
        l.item.matchStatus,
        l.item.mappingNote,
      ]);
    }
  }

  // ---------- Sheet 4: Source Reference ----------
  const s4 = wb.addWorksheet("Source Reference");
  const cols4 = [
    "Item",
    "Source Item (Pricing Master)",
    "Master Category",
    "Master Qty Unit",
    "Basis / Type",
    "Price Source",
    "Match",
    "Mapping Note",
  ];
  s4.columns = cols4.map((_, i) => ({ width: i === 7 ? 50 : 22 }));
  titleRow(s4, "Source Reference & Provenance", cols4.length);
  headerRow(s4, cols4);
  for (const l of lines) {
    s4.addRow([
      l.item.name,
      l.item.sourceItem || "-",
      l.item.masterCategory || "-",
      l.item.masterQtyUnit || "-",
      l.item.type,
      l.item.priceSource || "-",
      l.item.matchStatus,
      l.item.mappingNote,
    ]);
  }

  return wb.xlsx.writeBuffer();
}

/** Spell out how a contingency line was arrived at, for the Notes column. */
function contingencyBasisNote(l: ComputedLine): string {
  const scope = l.item.percentBasis === "budget" ? "budget" : "section";
  return `${l.percentRate}% of the ${scope} base (${moneyText(
    l.percentOfBase ?? 0
  )} SAR).`;
}

function moneyText(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function addLineRows(ws: ExcelJS.Worksheet, lines: ComputedLine[]) {
  for (const l of lines) {
    const isPercent = l.item.percentBasis != null;
    const notes = [
      l.note,
      isPercent ? contingencyBasisNote(l) : null,
      l.item.mappingNote,
    ]
      .filter(Boolean)
      .join(" ");

    const r = ws.addRow([
      l.item.section,
      l.item.subCategory,
      l.item.name,
      // A contingency has no unit basis, so name the rate in the Type column.
      isPercent ? `Contingency (${l.percentRate}%)` : l.item.type,
      isPercent ? "-" : l.qty,
      l.unitPrice ?? 0,
      l.baseCost,
      l.fee,
      l.totalCost,
      l.item.priceSource || "-",
      l.item.matchStatus,
      notes,
    ]);
    [6, 7, 8, 9].forEach((i) => money(r.getCell(i)));
    r.getCell(5).alignment = { horizontal: "center" };
    if (l.customPrice || isPercent) {
      r.getCell(6).font = { color: { argb: "FF9A6B00" }, italic: true };
    }
  }
}

/** Trigger a browser download of the generated workbook. */
export async function downloadBudget(
  data: ScopeData,
  selections: Record<string, Selection>,
  budgetTitle: string,
  client = ""
) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const buffer = await buildWorkbook(data, selections, budgetTitle, dateStr, client);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const slug = (v: string) => v.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  const safe = [client, budgetTitle]
    .filter(Boolean)
    .map((v) => slug(v).slice(0, 30))
    .filter(Boolean)
    .join("_") || "Budget";
  a.download = `TAM_Budget_${safe}_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
