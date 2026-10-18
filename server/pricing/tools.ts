/**
 * The tools the pricing model works with, and what each one does on the server.
 *
 * Every tool input is validated with zod before it runs, because the stream
 * parser is tolerant and can hand back a truncated object that still looks
 * like JSON. Each executor returns plain text (JSON for the data tools), which
 * goes straight back to the model as the tool result.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  benchmarksOnFile,
  gapsFor,
  searchCatalog,
  searchPastProjects,
  searchVendorQuotes,
} from "./catalog";

export const SECTIONS = [
  "Marketing",
  "Event Management",
  "Logistics",
  "Video Productions",
  "Training & Capability Building",
  "Platforms & Technology",
  "Consulting & Resources",
  "Other",
] as const;

export const SOURCE_TYPES = ["database", "similar_project", "benchmark"] as const;

// ------------------------------------------------------------------ schemas
export const NoteProgress = z.object({
  step: z.number().int().min(1).max(4),
  note: z.string().min(1),
});

export const WbsItem = z.object({
  ref: z.string().min(1),
  section: z.enum(SECTIONS),
  name: z.string().min(1),
  unit: z.string().min(1),
  qty: z.number().min(0),
  scopeEvidence: z.string(),
});
export const ProposeWbs = z.object({
  analysis: z.string(),
  items: z.array(WbsItem).min(1),
});

export const SearchDb = z.object({
  query: z.string().min(1),
  section: z.string().optional(),
});
export const SearchPast = z.object({
  query: z.string().min(1),
  projectType: z.string().optional(),
});
export const Benchmarks = z.object({ topic: z.string().optional() });

export const PricedItem = z.object({
  ref: z.string().min(1),
  section: z.enum(SECTIONS),
  name: z.string().min(1),
  unit: z.string().min(1),
  qty: z.number().min(0),
  unitPrice: z.number().min(0).nullable(),
  sourceType: z.enum(SOURCE_TYPES),
  sourceRef: z.string(),
  matchedItemId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});
export const SubmitPricing = z.object({
  items: z.array(PricedItem).min(1),
  assumptions: z.array(z.string()),
  summary: z.string(),
});

export type WbsItemT = z.infer<typeof WbsItem>;
export type PricedItemT = z.infer<typeof PricedItem>;
export type SubmitPricingT = z.infer<typeof SubmitPricing>;

// ------------------------------------------------------------- definitions
const sectionEnum = { type: "string", enum: [...SECTIONS] };

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "note_progress",
    description:
      "Tell the user which step you are on and why, in one or two plain sentences. Call it when you start a step and whenever you make a decision worth explaining (a quantity assumption, a price you rejected, why an item is a benchmark). The user sees these notes live.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        step: { type: "integer", description: "1 analyse scope, 2 break down into items, 3 price items, 4 present" },
        note: { type: "string" },
      },
      required: ["step", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_wbs",
    description:
      "Record the work breakdown: the smallest items that can each be priced per unit. Call this once after analysing the scope and before any price search. Quantities must follow the scope (attendees, days, sessions); state the evidence for each item.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        analysis: { type: "string", description: "Three to six sentences on what the scope asks for, what is in and out, and the drivers of cost." },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string", description: "Short stable id, e.g. W1, W2" },
              section: sectionEnum,
              name: { type: "string" },
              unit: { type: "string", description: "Pricing unit, e.g. per day, per attendee, per sqm, per video, lump sum" },
              qty: { type: "number" },
              scopeEvidence: { type: "string", description: "The words in the scope this item comes from" },
            },
            required: ["ref", "section", "name", "unit", "qty", "scopeEvidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["analysis", "items"],
      additionalProperties: false,
    },
  },
  {
    name: "search_price_database",
    description:
      "Search TAM's price database: the scope catalog, the TAM master price list and the vendor quotes behind each line. Returns matches with unit, price (SAR, excluding VAT), source and notes. Use short, specific queries (e.g. 'LED screen', 'ushers', 'business class flight'). Search again with other words if the first pass is thin.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        section: { type: "string", description: "Optional section filter: Marketing, Event Management, Logistics, Video Productions" },
      },
      required: ["query", "section"],
      additionalProperties: false,
    },
  },
  {
    name: "search_past_projects",
    description:
      "Search lines priced on earlier TAM projects (Culinary Saudization Program, Filmmakers S5, and every budget saved in this app). Returns the project, client, date, quantity, unit and unit price actually used. Prefer same-type projects.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        projectType: { type: "string", description: "e.g. training, award, event, hackathon, program. Empty string if unknown." },
      },
      required: ["query", "projectType"],
      additionalProperties: false,
    },
  },
  {
    name: "benchmarks_on_file",
    description:
      "Return the research benchmarks TAM already holds (international and domestic flight fares, ground transport, delegate day rates). Call before any web search for travel or transport items.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { topic: { type: "string", description: "Optional topic word, e.g. flights, transport" } },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_pricing",
    description:
      "Submit the complete priced list. Every item from the work breakdown must appear. unitPrice is SAR excluding VAT and excluding TAM's management fee. sourceType must be 'database' when the price comes from search_price_database, 'similar_project' when from search_past_projects, 'benchmark' when estimated from benchmarks_on_file, web search or professional judgement. When the user asks for changes later, resubmit the whole list, not only the changed rows.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string" },
              section: sectionEnum,
              name: { type: "string" },
              unit: { type: "string" },
              qty: { type: "number" },
              unitPrice: { anyOf: [{ type: "number" }, { type: "null" }], description: "null only if no defensible price exists" },
              sourceType: { type: "string", enum: [...SOURCE_TYPES] },
              sourceRef: { type: "string", description: "Where the price came from: catalog item + source label, project + budget version, or the benchmark basis" },
              matchedItemId: { anyOf: [{ type: "string" }, { type: "null" }], description: "The id of the matched database item, if any" },
              confidence: { type: "number", description: "0 to 1" },
              rationale: { type: "string", description: "One to three sentences: why this price and this quantity" },
            },
            required: ["ref", "section", "name", "unit", "qty", "unitPrice", "sourceType", "sourceRef", "matchedItemId", "confidence", "rationale"],
            additionalProperties: false,
          },
        },
        assumptions: { type: "array", items: { type: "string" } },
        summary: { type: "string", description: "A short summary for the user: scope understood, total, and what to verify" },
      },
      required: ["items", "assumptions", "summary"],
      additionalProperties: false,
    },
  },
];

// --------------------------------------------------------------- executors
export interface ToolOutcome {
  /** Text handed back to the model. */
  result: string;
  /** One line for the live process panel. */
  summary: string;
  /** Structured data for the UI, when the tool produced any. */
  data?: unknown;
  isError?: boolean;
}

function compact(n: number | null | undefined) {
  return n == null ? null : Math.round(n * 100) / 100;
}

/** Keep tool results short: they sit in the conversation for every later turn. */
function short(text: string | null | undefined, max = 140): string | null {
  if (!text) return null;
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export function runTool(name: string, rawInput: unknown): ToolOutcome {
  switch (name) {
    case "note_progress": {
      const p = NoteProgress.safeParse(rawInput);
      if (!p.success) return invalid(rawInput);
      return { result: "ok", summary: p.data.note, data: p.data };
    }
    case "propose_wbs": {
      const p = ProposeWbs.safeParse(rawInput);
      if (!p.success) return invalid(rawInput);
      return {
        result: `Recorded ${p.data.items.length} items. Now price each one: search the database first, then past projects, then benchmark.`,
        summary: `Work breakdown: ${p.data.items.length} items`,
        data: p.data,
      };
    }
    case "search_price_database": {
      const p = SearchDb.safeParse(rawInput);
      if (!p.success) return invalid(rawInput);
      const section = p.data.section?.trim() || undefined;
      const hits = searchCatalog(p.data.query, section, 6).map((h) => ({
        id: h.id,
        section: h.section,
        category: h.category,
        name: h.name,
        unit: h.unit,
        unitPriceSar: compact(h.unitPrice),
        source: h.source,
        priceBasis: h.priceBasis,
        matchStatus: h.matchStatus,
        notes: short(h.notes ?? h.mappingNote),
        vendorQuotes: h.vendorQuotes.slice(0, 4).map((q) => ({ vendor: q.vendor, unitPrice: compact(q.unitPrice), unit: q.unit, basis: q.basis, notes: short(q.notes, 100) })),
        lowestVendorQuote: compact(h.lowestVendorQuote),
        highestVendorQuote: compact(h.highestVendorQuote),
      }));
      const vendorOnly = searchVendorQuotes(p.data.query, 4).map((q) => ({
        vendor: `${q.vendor} ${q.cardVersion ?? ""}`.trim(),
        item: q.item,
        section: q.section,
        unit: q.unit,
        unitPriceSar: compact(q.unitPrice),
        priceBasis: q.priceBasis,
        notes: short([q.priceAsWritten, q.notes, q.description].filter(Boolean).join(" · "), 120),
      }));
      const gaps = gapsFor(p.data.query).slice(0, 2).map((g) => ({ item: g.item, lowest: g.lowestVendorQuote, highest: g.highestVendorQuote, passThroughPct: g.passThroughPct, benchmark: short(g.benchmark, 100) }));
      const priced = hits.filter((h) => h.unitPriceSar != null).length;
      return {
        result: JSON.stringify({ query: p.data.query, catalogMatches: hits, vendorCardLines: vendorOnly, knownGaps: gaps }, null, 0),
        summary: `Database: "${p.data.query}" → ${hits.length} catalog matches (${priced} priced), ${vendorOnly.length} vendor lines`,
        data: { query: p.data.query, hits, vendorOnly, gaps },
      };
    }
    case "search_past_projects": {
      const p = SearchPast.safeParse(rawInput);
      if (!p.success) return invalid(rawInput);
      const hits = searchPastProjects(p.data.query, p.data.projectType?.trim() || undefined, 6).map((h) => ({
        id: h.id, project: h.project, client: h.client, projectType: h.projectType, date: h.date,
        item: h.item, description: short(h.description, 120), qty: h.qty, unit: h.unit,
        unitPriceSar: compact(h.unitPrice), totalSar: compact(h.total), origin: h.origin, userAdjusted: h.userAdjusted ?? false,
      }));
      return {
        result: JSON.stringify({ query: p.data.query, matches: hits }),
        summary: `Past projects: "${p.data.query}" → ${hits.length} matches`,
        data: { query: p.data.query, hits },
      };
    }
    case "benchmarks_on_file": {
      const p = Benchmarks.safeParse(rawInput);
      if (!p.success) return invalid(rawInput);
      const all = benchmarksOnFile();
      const topic = (p.data.topic ?? "").toLowerCase();
      const rows = topic ? all.filter((b) => JSON.stringify(b).toLowerCase().includes(topic)) : all;
      return {
        result: JSON.stringify({ benchmarks: rows.length ? rows : all }),
        summary: `Benchmarks on file: ${rows.length || all.length} rows`,
        data: { rows: rows.length ? rows : all },
      };
    }
    case "submit_pricing": {
      const p = SubmitPricing.safeParse(rawInput);
      if (!p.success) return invalid(rawInput);
      const base = p.data.items.reduce((s, it) => s + (it.unitPrice ?? 0) * it.qty, 0);
      const unpriced = p.data.items.filter((it) => it.unitPrice == null).length;
      return {
        result: `Pricing recorded: ${p.data.items.length} items, base ${Math.round(base).toLocaleString("en-US")} SAR excluding fee and VAT${unpriced ? `, ${unpriced} without a price` : ""}. Finish with a short message to the user.`,
        summary: `Priced ${p.data.items.length} items, base ${Math.round(base).toLocaleString("en-US")} SAR`,
        data: p.data,
      };
    }
    default:
      return { result: `Unknown tool ${name}`, summary: `Unknown tool ${name}`, isError: true };
  }
}

function invalid(rawInput: unknown): ToolOutcome {
  return {
    result: JSON.stringify({ INVALID_JSON: JSON.stringify(rawInput).slice(0, 2000) }),
    summary: "Tool input did not match the schema; asked the model to retry",
    isError: true,
  };
}
