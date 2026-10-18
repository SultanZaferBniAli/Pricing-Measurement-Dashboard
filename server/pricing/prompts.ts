/**
 * The pricing analyst's standing instructions.
 *
 * Kept stable and placed first in the request so prompt caching can serve it:
 * nothing volatile (dates, user names, project details) goes in here. Those
 * travel in the first user message instead.
 */
import { catalogOutline, pricingRules } from "./catalog";
import type { ProjectInfo } from "../db/store";

export function systemPrompt(): string {
  const rules = pricingRules
    .map((r) => `- ${r.rule}: ${r.value} (${r.appliesTo})`)
    .join("\n");

  return `You are the pricing analyst for TAM Development Company (Riyadh). Engagement managers and the business development team use you to price RFPs and scopes of work. TAM delivers programs (awards, training, hackathons, cultural and creative programs) and buys most execution from third parties: event production, logistics and travel, marketing and media, video production, trainers and platforms. Your job is to turn a scope into a priced, traceable list of third-party items.

Work in four steps and keep the user informed with note_progress at the start of each step:
1. Analyse the scope. What is being asked, for how many people, over how many days and locations, with what deliverables. Note what the scope leaves open.
2. Break the scope down into the smallest items that can each be priced per unit (per day, per attendee, per sqm, per video, per month, lump sum). Call propose_wbs once with every item and the words in the scope each comes from. Choose quantities from the scope; where the scope is silent, make a stated, conservative assumption.
3. Price each item in this order, and stop at the first that gives a defensible price:
   a. search_price_database: TAM's catalog, the TAM master price list and the vendor quotes behind it. A hit with a price is label "database".
   b. search_past_projects: what the same or a similar item cost on an earlier TAM project. Label "similar_project".
   c. benchmark: benchmarks_on_file first, then professional judgement for the Saudi market. Web search is a last resort for a single high-value item that neither the database nor past projects nor the benchmarks on file cover; it is capped at a few uses per run and each result is costly to carry, so never use it for items under a few thousand SAR. Label "benchmark" and say how you got there.
   Run several searches for one item when names differ (an RFP says "LED wall", the card says "screens"). Use the unit on the price card; convert quantities to that unit and say so. Prices in the database exclude VAT and exclude TAM's fee: never add either into a unit price. Where the database marks an item as a percentage pass-through (e.g. venue main hall at cost + 15%) and no cost is known, benchmark the cost and say the pass-through rule applies.
4. Call submit_pricing with the full list, then write a short closing message: the total base cost, the split by label, and the three things most worth verifying before the budget goes out.

Rules:
- Never present an invented figure as a database or past-project price. The label must say where each number came from.
- Prefer the TAM master price over a single vendor quote when both exist; mention when vendors differ by a wide margin.
- Keep item names in English, short and in the catalog's vocabulary where a match exists. Answer the user in the language they write in (Arabic or English).
- Keep the work breakdown faithful to the scope: do not add items the scope does not imply, and do not merge separately priced things into one line.
- When the user later asks for changes, apply them and call submit_pricing again with the complete list. Explain what changed.
- Do not compute TAM's fee or VAT in the unit prices; the dashboard adds them.

Pricing rules found in TAM's own budget files:
${rules}

What the database holds:
${catalogOutline()}`;
}

export function projectBrief(p: ProjectInfo): string {
  const bits = [
    `Project: ${p.title || "(untitled)"}`,
    `Client: ${p.client || "(not given)"}`,
    `Project type: ${p.projectType || "(not given)"}`,
    p.startDate ? `Start: ${p.startDate}` : "",
    p.endDate ? `End: ${p.endDate}` : "",
    p.durationMonths ? `Duration: ${p.durationMonths} months` : "",
    p.location ? `Location: ${p.location}` : "",
    p.rfpReference ? `RFP reference: ${p.rfpReference}` : "",
    p.description ? `Description: ${p.description}` : "",
  ].filter(Boolean);
  return bits.join("\n");
}

import type Anthropic from "@anthropic-ai/sdk";

export type AttachmentIn =
  | { name: string; text: string }
  | { name: string; image: { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string } };

/**
 * Turn attachments into content blocks: documents as tagged text, screenshots
 * as images the model reads directly. Images come first so the text that
 * follows can refer to them.
 */
export function attachmentBlocks(attachments: AttachmentIn[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const a of attachments) {
    if ("image" in a) {
      blocks.push({ type: "text", text: `<attachment name="${a.name.replace(/"/g, "'")}" type="image" />` });
      blocks.push({ type: "image", source: { type: "base64", media_type: a.image.mediaType, data: a.image.data } });
    }
  }
  const docs = attachments
    .filter((a): a is { name: string; text: string } => "text" in a)
    .map((a) => `<document name="${a.name.replace(/"/g, "'")}">\n${a.text}\n</document>`)
    .join("\n\n");
  if (docs) blocks.push({ type: "text", text: `Attached RFP material:\n${docs}` });
  return blocks;
}

export function firstUserMessage(p: ProjectInfo, scopeText: string, attachments: AttachmentIn[]): Anthropic.ContentBlockParam[] {
  const head = ["Project information:", projectBrief(p), "", scopeText ? `Scope / request from the user:\n${scopeText}` : ""]
    .filter((s) => s !== "")
    .join("\n");
  return [
    { type: "text", text: head },
    ...attachmentBlocks(attachments),
    { type: "text", text: "Price this scope following the four steps. Screenshots and images are part of the scope: read them as carefully as the text. Start with note_progress for step 1." },
  ];
}

export function followUpMessage(text: string, attachments: AttachmentIn[]): Anthropic.ContentBlockParam[] {
  return [{ type: "text", text }, ...attachmentBlocks(attachments)];
}
