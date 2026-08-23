// Smoke-test the real export module against the bundled data.
import { writeFileSync } from "node:fs";
import { buildWorkbook } from "../src/lib/excelExport.ts";
import data from "../src/data/scopeData.json" with { type: "json" };

const d = data as any;
// pick a few items: 2 priced + 1 unpriced with a custom price + 1 unpriced without
const marketing = d.sections.find((s: any) => s.key === "MARKETING");
const priced = marketing.items.filter((i: any) => i.isPriced).slice(0, 2);
const unpriced = marketing.items.filter((i: any) => !i.isPriced).slice(0, 2);

const selections: Record<string, any> = {};
selections[priced[0].id] = { qty: 2 };
selections[priced[1].id] = { qty: 3, note: "confirm scope" };
selections[unpriced[0].id] = { qty: 1, customPrice: 5000 }; // becomes priced
selections[unpriced[1].id] = { qty: 4 }; // stays unpriced

const buf = await buildWorkbook(d, selections, "Smoke Test Budget", "2026-08-05");
const out = process.argv[2] || "test_budget.xlsx";
writeFileSync(out, Buffer.from(buf as ArrayBuffer));
console.log("wrote", out, "bytes:", (buf as ArrayBuffer).byteLength);
console.log("priced picked:", priced.map((i: any) => i.name));
console.log("unpriced picked:", unpriced.map((i: any) => i.name));
