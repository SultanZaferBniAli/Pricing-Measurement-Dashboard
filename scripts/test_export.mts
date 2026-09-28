// Smoke-test the real pricing + export modules against the bundled data.
// Run: npx tsx scripts/test_export.mts [out.xlsx]
import { writeFileSync } from "node:fs";
import { buildWorkbook } from "../src/lib/excelExport.ts";
import { enrichScopeData } from "../src/lib/enrich.ts";
import { resolveBudget, sumLines } from "../src/lib/pricing.ts";
import raw from "../src/data/scopeData.json" with { type: "json" };

const d = enrichScopeData(raw as any) as any;

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

function eq(actual: number, expected: number, what: string) {
  if (Math.abs(actual - expected) > 0.005) {
    fail(`${what}: expected ${expected}, got ${actual}`);
  }
  console.log(`  ok  ${what} = ${actual}`);
}

// ---------- catalog counts after enrichment ----------
console.log("Catalog:", d.meta.counts);

const byId = (id: string) => {
  for (const s of d.sections) for (const i of s.items) if (i.id === id) return i;
  return null;
};

// ---------- derived + research prices landed ----------
console.log("\nGap closures:");
const expectPrice: [string, number, string][] = [
  ["event-management-venue-setup-main-stage-build-layout", 16000, "Derived"],
  ["event-management-staffing-onsite-technical-security-cleaning-teams", 5030, "Derived"],
  ["marketing-branding-collateral-printed-materials-for-trips-closing-event", 14, "Derived"],
  ["logistics-visa-airport-services-airport-lounge-access", 7000, "Research"],
];
for (const [id, price, source] of expectPrice) {
  const it = byId(id);
  if (!it) fail(`missing item ${id}`);
  if (!it.isPriced) fail(`${it.name} should be priced`);
  eq(it.unitPrice, price, `${it.name} (${it.priceSource})`);
  if (it.priceSource !== source) fail(`${it.name}: source ${it.priceSource} != ${source}`);
}

// ---------- contingencies carry a basis but no price ----------
console.log("\nContingencies:");
const sectionCont = byId("logistics-onsite-logistics-additional-transfer-contingencies");
const budgetCont = byId("logistics-onsite-logistics-operational-contingency-reserve");
if (sectionCont.percentBasis !== "section") fail("transfer contingency basis");
if (budgetCont.percentBasis !== "budget") fail("operational contingency basis");
if (sectionCont.isPriced || budgetCont.isPriced) fail("contingencies must start unpriced");
console.log("  ok  both contingencies are unpriced until a rate is set");

// ---------- the math ----------
// One Marketing line and one Logistics line, then both contingencies on top.
const marketing = d.sections.find((s: any) => s.key === "MARKETING");
const logistics = d.sections.find((s: any) => s.key === "LOGISTICS");
const mItem = marketing.items.find((i: any) => i.isPriced);
const lItem = logistics.items.find((i: any) => i.isPriced && !i.percentBasis);

const selections: Record<string, any> = {
  [mItem.id]: { qty: 2 },
  [lItem.id]: { qty: 3 },
  [sectionCont.id]: { qty: 1, percentRate: 10 },
  [budgetCont.id]: { qty: 1, percentRate: 5 },
};

const mBase = mItem.unitPrice * 2;
const lBase = lItem.unitPrice * 3;

const resolved = resolveBudget(d.sections, selections);
const lineFor = (id: string) => resolved.lines.find((l) => l.item.id === id)!;

console.log(`\n  ${mItem.name} x2 = ${mBase}`);
console.log(`  ${lItem.name} x3 = ${lBase}`);

// Section contingency charges the Logistics base only.
eq(lineFor(sectionCont.id).baseCost, lBase * 0.1, "transfer contingency (10% of Logistics)");
// Budget contingency charges every ordinary line, and never another contingency.
eq(lineFor(budgetCont.id).baseCost, (mBase + lBase) * 0.05, "operational reserve (5% of budget)");

const totals = sumLines(resolved.lines.filter((l) => !l.isUnpriced));
const expectedBase = mBase + lBase + lBase * 0.1 + (mBase + lBase) * 0.05;
eq(totals.base, expectedBase, "grand base");
eq(totals.fee, expectedBase * 0.15, "fee at 15%");
eq(totals.grand, expectedBase * 1.15, "subtotal incl. fee");
// VAT applies to the fee as well as the scope, so it is 15% of base+fee
eq(totals.vat, expectedBase * 1.15 * 0.15, "VAT at 15% of subtotal");
eq(totals.total, expectedBase * 1.15 * 1.15, "final total incl. VAT");

// An unset rate must keep the line out of the totals.
const noRate = resolveBudget(d.sections, {
  [mItem.id]: { qty: 2 },
  [sectionCont.id]: { qty: 1 },
});
const unratedLine = noRate.lines.find((l) => l.item.id === sectionCont.id)!;
if (!unratedLine.isUnpriced) fail("a contingency with no rate must stay unpriced");
eq(sumLines(noRate.lines.filter((l) => !l.isUnpriced)).base, mBase, "unrated contingency excluded");

// ---------- export still builds ----------
const buf = await buildWorkbook(d, selections, "Smoke Test Budget", "2026-09-14");
const out = process.argv[2] || "test_budget.xlsx";
writeFileSync(out, Buffer.from(buf as ArrayBuffer));
console.log(`\nwrote ${out} (${(buf as ArrayBuffer).byteLength} bytes)`);
console.log("\nAll checks passed.");
