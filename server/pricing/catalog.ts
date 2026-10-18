/**
 * The price database as the AI sees it.
 *
 * Three corpora, all read-only here:
 *   - the scope catalog the manual builder uses (same ids, so an AI line can
 *     point at the exact catalog item the user would have ticked by hand)
 *   - the TAM master price list with every vendor quote behind it
 *   - past project lines: seeded from the Culinary and Filmmakers budgets, and
 *     grown by every budget saved in this app (see db/observations)
 *
 * Search is lexical: tokens, a light stemmer, and a synonym table for the
 * vocabulary that differs between an RFP and a price card. The model drives
 * it, so it can rephrase and search again when the first pass is thin.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enrichScopeData } from "../../src/lib/enrich";
import type { ScopeData, ScopeItem } from "../../src/lib/types";
import { collection, type PriceObservation } from "../db/store";

const here = path.dirname(fileURLToPath(import.meta.url));

interface Seed {
  meta: { builtOn: string; counts: Record<string, number>; sources: string[] };
  rules: { rule: string; value: string; appliesTo: string; source: string }[];
  masterItems: MasterItem[];
  vendorQuotes: VendorQuote[];
  mediaRates: MediaRate[];
  pastBudgetLines: PastLine[];
  gaps: Gap[];
  sowMappings: SowMapping[];
  benchmarks: Record<string, unknown>[];
}
export interface MasterItem {
  id: string; section: string; category: string; name: string; key: string;
  unit: string | null; unitPrice: number | null; priceBasis: string;
  priceAsWritten: string | null; source: string | null; status: string;
  notes: string | null; vendorsQuoting: number; lowestVendorQuote: number | null;
  highestVendorQuote: number | null; reviewFlag: string | null;
}
export interface VendorQuote {
  id: string; vendor: string; vendorType: string; cardVersion: string; catalogKey: string | null;
  match: string | null; section: string; item: string; description: string | null;
  deliveryModel: string | null; unit: string | null; priceBasis: string | null;
  unitPrice: number | null; priceAsWritten: string | null; notes: string | null; tamPrice: number | null;
}
export interface MediaRate { id: string; vendor: string; category: string; item: string; qty: number | null; priceBasis: string | null; unitPrice: number | null; }
export interface PastLine {
  id: string; project: string; budgetVersion: string; item: string; description: string | null;
  total: number | null; qty: number | null; qtyUnit: string | null; unitPrice: number | null;
  unitBasis: string | null; notes: string | null; projectType: string; client: string; date: string;
}
export interface Gap { group: string; section: string; item: string; catalogKey: string | null; why: string; lowestVendorQuote: number | null; highestVendorQuote: number | null; passThroughPct: number | null; benchmark: string | null; nextStep: string | null; }
export interface SowMapping { section: string; mainItem: string; subItem: string; catalogKey: string | null; confidence: string; tamPrice: number | null; unit: string | null; source: string | null; status: string; notes: string | null; }

const seed: Seed = JSON.parse(
  fs.readFileSync(path.resolve(here, "../db/seed/catalog.json"), "utf8")
);

const scopeRaw = JSON.parse(
  fs.readFileSync(path.resolve(here, "../../src/data/scopeData.json"), "utf8")
) as ScopeData;
const scope = enrichScopeData(scopeRaw);
export const scopeItems: ScopeItem[] = scope.sections.flatMap((s) => s.items);

export const catalogMeta = {
  ...seed.meta,
  scopeItems: scopeItems.length,
  scopePriced: scopeItems.filter((i) => i.isPriced).length,
};
export const pricingRules = seed.rules;

// ---------------------------------------------------------------- tokenizer
const STOP = new Set(
  "the a an of and or for to in on at by with per from into as is are be this that these those its it each any all x".split(" ")
);
const SYNONYMS: Record<string, string[]> = {
  led: ["screen", "screens", "display"], screen: ["led", "display", "screens"],
  av: ["audio", "visual", "audio-visual", "sound"], audiovisual: ["audio", "visual", "sound"],
  venue: ["hall", "ballroom", "room"], hall: ["venue", "ballroom"],
  hotel: ["accommodation", "room", "lodging"], accommodation: ["hotel", "lodging"],
  flight: ["ticket", "airfare", "air"], ticket: ["flight", "airfare"],
  bus: ["transport", "transfer", "shuttle", "coach"], transport: ["transfer", "bus", "car", "shuttle"],
  photo: ["photography", "photographer"], photography: ["photo", "photographer"],
  video: ["videography", "videographer", "film", "filming"], videography: ["video", "film"],
  film: ["video", "documentary"], documentary: ["video", "film"],
  stream: ["streaming", "broadcast", "live"], broadcast: ["streaming", "live"],
  badge: ["badges", "lanyard", "lanyards"], lanyard: ["badge", "badges"],
  giveaway: ["gift", "giveaways", "merchandise", "promotional"], gift: ["giveaway", "giveaways"],
  catering: ["food", "meal", "meals", "lunch", "dinner", "buffet", "hospitality"],
  meal: ["catering", "food", "lunch", "dinner"], coffee: ["break", "breaks", "refreshment"],
  usher: ["ushers", "hostess", "hostesses", "staff"], hostess: ["usher", "ushers"],
  security: ["guard", "guards"], cleaning: ["cleaner", "cleaners", "housekeeping"],
  trainer: ["training", "expert", "instructor", "facilitator"], workshop: ["training", "session", "masterclass"],
  training: ["workshop", "course", "trainer"], expert: ["trainer", "speaker", "consultant"],
  social: ["media", "instagram", "snapchat", "tiktok", "content"], influencer: ["influencers", "kol"],
  ad: ["ads", "advertising", "advert", "campaign", "media"], advertising: ["ad", "ads", "media", "campaign"],
  billboard: ["ooh", "outdoor", "signage", "mezah", "megacom", "unipole"], ooh: ["billboard", "outdoor"],
  sign: ["signage", "signs", "wayfinding"], signage: ["sign", "signs", "wayfinding"],
  print: ["printed", "printing", "collateral"], printed: ["print", "printing"],
  backdrop: ["stage", "banner"], stage: ["podium", "backdrop", "rigging", "platform"],
  interpretation: ["interpreter", "translation", "translator"], translation: ["interpretation", "interpreter"],
  visa: ["visas", "immigration"], permit: ["permits", "license", "licence"],
  certificate: ["certificates", "award", "trophy"], trophy: ["trophies", "plaque", "award"],
  drone: ["aerial"], edit: ["editing", "editor", "post-production"], editing: ["edit", "editor"],
  website: ["web", "microsite", "platform", "portal"], platform: ["website", "portal", "system"],
  registration: ["registeration", "register", "check-in"], registeration: ["registration"],
  report: ["reporting", "deck"], design: ["creative", "artwork", "graphic"],
  car: ["cars", "vehicle", "sedan", "suv", "transport"], vip: ["protocol", "dignitary"],
  lunch: ["meal", "catering"], dinner: ["meal", "gala", "catering"], gala: ["dinner", "reception"],
};

function stem(w: string): string {
  if (w.length <= 3) return w;
  return w.replace(/(ies)$/, "y").replace(/(sses|ches|shes)$/, (m) => m.slice(0, -2)).replace(/(ings?|ers?|ed|s)$/, "");
}

export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .split(/[\s/]+/)
    .filter((w) => w && !STOP.has(w));
}

function expand(tokens: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(stem(t));
    for (const s of SYNONYMS[t] ?? []) out.add(stem(s));
  }
  return out;
}

/** Share of query tokens present in the text, with a bonus for phrase hits. */
function score(queryTokens: string[], queryExpanded: Set<string>, text: string, phrase: string): number {
  const lower = text.toLowerCase();
  if (phrase && lower.includes(phrase)) return 1;
  const textStems = new Set(tokenize(text).map(stem));
  let direct = 0;
  let viaSyn = 0;
  for (const q of queryTokens) {
    const s = stem(q);
    if (textStems.has(s)) direct++;
    else if ([...(SYNONYMS[q] ?? [])].some((syn) => textStems.has(stem(syn)))) viaSyn++;
  }
  const denom = Math.max(1, queryTokens.length);
  const base = (direct + 0.6 * viaSyn) / denom;
  // Tiny tie-breaker for texts that share more of the expanded vocabulary.
  let overlap = 0;
  for (const s of textStems) if (queryExpanded.has(s)) overlap++;
  return base + Math.min(0.1, overlap * 0.01);
}

// ------------------------------------------------------------------ search
export interface CatalogHit {
  id: string;
  kind: "scope" | "master";
  section: string;
  category: string;
  name: string;
  unit: string | null;
  unitPrice: number | null;
  source: string | null;
  priceBasis?: string;
  notes?: string | null;
  matchStatus?: string;
  mappingNote?: string;
  vendorQuotes: { vendor: string; unitPrice: number | null; unit: string | null; basis: string | null; notes: string | null }[];
  lowestVendorQuote?: number | null;
  highestVendorQuote?: number | null;
  score: number;
}

function quotesFor(key: string | null | undefined): CatalogHit["vendorQuotes"] {
  if (!key) return [];
  return seed.vendorQuotes
    .filter((q) => q.catalogKey === key && (q.unitPrice != null || q.priceAsWritten))
    .map((q) => ({
      vendor: `${q.vendor} ${q.cardVersion ?? ""}`.trim(),
      unitPrice: q.unitPrice,
      unit: q.unit,
      basis: q.priceBasis,
      notes: [q.priceAsWritten, q.notes, q.description].filter(Boolean).join(" · ") || null,
    }));
}

export function searchCatalog(query: string, section?: string, limit = 8): CatalogHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const expanded = expand(tokens);
  const phrase = tokens.join(" ");
  const hits: CatalogHit[] = [];

  for (const it of scopeItems) {
    if (section && !it.section.toLowerCase().includes(section.toLowerCase())) continue;
    const text = `${it.name} ${it.subCategory} ${it.sourceItem}`;
    const s = score(tokens, expanded, text, phrase);
    if (s < 0.34) continue;
    const key = it.sourceItem && !it.sourceItem.startsWith("-") ? it.sourceItem.toLowerCase() : null;
    hits.push({
      id: it.id, kind: "scope", section: it.section, category: it.subCategory, name: it.name,
      unit: it.type, unitPrice: it.unitPrice, source: it.priceSource || null,
      matchStatus: it.matchStatus, mappingNote: it.mappingNote, notes: null,
      vendorQuotes: quotesFor(key), score: s,
    });
  }
  for (const m of seed.masterItems) {
    const text = `${m.name} ${m.category} ${m.section}`;
    const s = score(tokens, expanded, text, phrase);
    if (s < 0.34) continue;
    hits.push({
      id: m.id, kind: "master", section: m.section, category: m.category, name: m.name,
      unit: m.unit, unitPrice: m.unitPrice, source: m.source, priceBasis: m.priceBasis,
      notes: [m.priceAsWritten, m.notes, m.reviewFlag].filter(Boolean).join(" · ") || null,
      vendorQuotes: quotesFor(m.key), lowestVendorQuote: m.lowestVendorQuote,
      highestVendorQuote: m.highestVendorQuote, score: s,
    });
  }
  // Priced hits first within the same score band, then by score.
  hits.sort((a, b) => b.score - a.score || Number(b.unitPrice != null) - Number(a.unitPrice != null));
  return hits.slice(0, limit);
}

/** Vendor card lines that match no catalog key but still carry a price. */
export function searchVendorQuotes(query: string, limit = 6) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const expanded = expand(tokens);
  const phrase = tokens.join(" ");
  const out: (VendorQuote & { score: number })[] = [];
  for (const q of seed.vendorQuotes) {
    if (q.unitPrice == null && !q.priceAsWritten) continue;
    const s = score(tokens, expanded, `${q.item} ${q.description ?? ""} ${q.section}`, phrase);
    if (s >= 0.4) out.push({ ...q, score: s });
  }
  for (const m of seed.mediaRates) {
    const s = score(tokens, expanded, `${m.item} ${m.category}`, phrase);
    if (s >= 0.5) {
      out.push({
        id: m.id, vendor: "Veyron", vendorType: "Media", cardVersion: "16.06.2026", catalogKey: null, match: null,
        section: m.category, item: m.item, description: null, deliveryModel: null, unit: "2 weeks",
        priceBasis: m.priceBasis ?? "Fixed", unitPrice: m.unitPrice, priceAsWritten: null, notes: null, tamPrice: null, score: s,
      });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

export interface PastHit {
  id: string;
  project: string;
  client: string;
  projectType: string;
  date: string;
  item: string;
  description: string | null;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number | null;
  origin: "seed" | "saved_budget";
  userAdjusted?: boolean;
  score: number;
}

export function searchPastProjects(query: string, projectType?: string, limit = 8): PastHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const expanded = expand(tokens);
  const phrase = tokens.join(" ");
  const out: PastHit[] = [];
  for (const p of seed.pastBudgetLines) {
    const s = score(tokens, expanded, `${p.item} ${p.description ?? ""}`, phrase);
    if (s < 0.34) continue;
    out.push({
      id: p.id, project: p.project, client: p.client, projectType: p.projectType, date: p.date,
      item: p.item, description: p.description, qty: p.qty, unit: p.unitBasis ?? p.qtyUnit,
      unitPrice: p.unitPrice, total: p.total, origin: "seed", score: s,
    });
  }
  const observations: PriceObservation[] = collection("observations").all();
  for (const o of observations) {
    const s = score(tokens, expanded, `${o.item} ${o.section}`, phrase);
    if (s < 0.34) continue;
    out.push({
      id: o.id, project: o.project, client: o.client, projectType: o.projectType, date: o.date,
      item: o.item, description: null, qty: o.qty, unit: o.unit, unitPrice: o.unitPrice,
      total: o.unitPrice * o.qty, origin: "saved_budget", userAdjusted: o.userAdjusted, score: s,
    });
  }
  // Same project type first, then newest, then score.
  out.sort((a, b) => {
    const t = Number(b.projectType === projectType) - Number(a.projectType === projectType);
    if (t) return t;
    if (b.score !== a.score) return b.score - a.score;
    return b.date.localeCompare(a.date);
  });
  return out.slice(0, limit);
}

export function benchmarksOnFile() {
  return seed.benchmarks;
}

export function gapsFor(query: string): Gap[] {
  const tokens = tokenize(query);
  const expanded = expand(tokens);
  const phrase = tokens.join(" ");
  return seed.gaps.filter((g) => score(tokens, expanded, g.item, phrase) >= 0.5).slice(0, 4);
}

/** A compact, section-grouped list of catalog item names, for the system prompt. */
export function catalogOutline(): string {
  const bySection = new Map<string, string[]>();
  for (const it of scopeItems) {
    const list = bySection.get(it.section) ?? [];
    list.push(`${it.name}${it.isPriced ? "" : " (no price on file)"}`);
    bySection.set(it.section, list);
  }
  const lines: string[] = [];
  for (const [section, names] of bySection) lines.push(`${section}: ${names.join("; ")}`);
  const masterCats = new Map<string, number>();
  for (const m of seed.masterItems) masterCats.set(m.category, (masterCats.get(m.category) ?? 0) + 1);
  lines.push(
    `TAM master price list categories (${seed.masterItems.length} lines): ` +
      [...masterCats.entries()].map(([c, n]) => `${c} (${n})`).join(", ")
  );
  lines.push(
    `Vendor price cards on file: Threelines (events), Guru V2 (events + marketing), Zebra (video), Tura (video/TVC), Veyron (media buying, ${seed.mediaRates.length} OOH/digital lines).`
  );
  lines.push(
    `Past project budgets on file: ${[...new Set(seed.pastBudgetLines.map((p) => p.project))].join(", ")}, plus every budget saved in this app.`
  );
  return lines.join("\n");
}
