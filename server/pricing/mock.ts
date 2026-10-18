/**
 * A model-free walk through the same four steps.
 *
 * Used when LLM_PROVIDER=mock, so the whole pipeline (events, tools, the live
 * process panel, saving, learning) can be exercised without an API key. It is
 * deliberately simple: one line of scope becomes one item, priced by the first
 * database hit, then the first past-project hit, else left for a benchmark.
 * It never pretends to be the real analyst.
 */
import { collection, type AiSession } from "../db/store";
import { afterTool, type PricingEvent, type RunOptions } from "./pipeline";
import { runTool, type PricedItemT, SECTIONS } from "./tools";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function guessSection(text: string): (typeof SECTIONS)[number] {
  const t = text.toLowerCase();
  if (/(video|film|photo|documentary|stream|edit)/.test(t)) return "Video Productions";
  if (/(flight|hotel|visa|transport|bus|car|accommodation|travel|meal|catering|lounge)/.test(t)) return "Logistics";
  if (/(social|ad|campaign|influencer|brand|print|giveaway|media|content|design)/.test(t)) return "Marketing";
  if (/(train|workshop|expert|course|masterclass|mentor)/.test(t)) return "Training & Capability Building";
  if (/(platform|website|portal|system|app)/.test(t)) return "Platforms & Technology";
  return "Event Management";
}

export async function runMockPricing(opts: RunOptions): Promise<void> {
  const { session, emit, userText, attachments = [] } = opts;
  const sessions = collection("aiSessions");
  const messages = session.messages as unknown[];
  messages.push({ role: "user", content: userText });
  emit({ type: "status", phase: "running", provider: "mock", model: "mock" });

  const say = (text: string) => emit({ type: "text", text });
  const note = async (step: number, text: string) => {
    const out = runTool("note_progress", { step, note: text });
    emit({ type: "tool_call", id: `m${Date.now()}`, name: "note_progress", input: { step, note: text } });
    afterTool("note_progress", out.data, session, emit);
    await sleep(250);
  };

  if (!opts.isFirst) {
    say("Mock mode: follow-up messages are recorded but not reasoned about. Add an Anthropic API key to use the real analyst.\n");
    messages.push({ role: "assistant", content: "Mock mode acknowledged." });
    sessions.update(session.id, { messages, updatedAt: new Date().toISOString() });
    emit({ type: "done", sessionId: session.id, stopReason: "end_turn" });
    return;
  }

  emit({ type: "step", step: 1, state: "active" });
  await note(1, "Reading the scope and the attached material (mock analyst: no model behind this run).");
  const corpus = [userText, ...attachments.map((a) => ("text" in a ? a.text : `[image: ${a.name}]`))].join("\n");
  const candidates = corpus
    .split(/\n|[.;•]|\d+\)\s|\d+\.\s/)
    .map((s) => s.replace(/^[-*\s]+/, "").trim())
    .filter((s) => s.length > 3 && s.length < 120)
    .slice(0, 25);

  await note(2, `Breaking the scope into ${candidates.length} priceable items, one per line of the request.`);
  const items = candidates.map((c, i) => ({
    ref: `W${i + 1}`,
    section: guessSection(c),
    name: c.replace(/\s+/g, " ").slice(0, 80),
    unit: "each",
    qty: (c.match(/\b(\d{1,4})\b/) ? Number(c.match(/\b(\d{1,4})\b/)![1]) : 1) || 1,
    scopeEvidence: c,
  }));
  const wbsOut = runTool("propose_wbs", { analysis: "Mock analysis: items taken line by line from the request.", items });
  emit({ type: "tool_call", id: "m-wbs", name: "propose_wbs", input: { items } });
  emit({ type: "tool_result", id: "m-wbs", name: "propose_wbs", summary: wbsOut.summary });
  afterTool("propose_wbs", wbsOut.data, session, emit);

  await note(3, "Pricing each item: database first, then past projects, then benchmark.");
  const priced: PricedItemT[] = [];
  for (const it of items) {
    const q = it.name.replace(/\b\d+\b/g, "").trim();
    const id = `m-db-${it.ref}`;
    emit({ type: "tool_call", id, name: "search_price_database", input: { query: q, section: "" } });
    const db = runTool("search_price_database", { query: q, section: "" });
    emit({ type: "tool_result", id, name: "search_price_database", summary: db.summary, data: db.data });
    const hits = (db.data as { hits: { id: string; name: string; unitPriceSar: number | null; unit: string | null; source: string | null }[] }).hits;
    const hit = hits.find((h) => h.unitPriceSar != null);
    if (hit) {
      priced.push({ ...it, unit: hit.unit ?? it.unit, unitPrice: hit.unitPriceSar, sourceType: "database", sourceRef: `${hit.name} (${hit.source ?? "TAM"})`, matchedItemId: hit.id, confidence: 0.6, rationale: `Mock: first priced database match for "${q}".` });
      await sleep(120);
      continue;
    }
    const pid = `m-past-${it.ref}`;
    emit({ type: "tool_call", id: pid, name: "search_past_projects", input: { query: q, projectType: session.project.projectType } });
    const past = runTool("search_past_projects", { query: q, projectType: session.project.projectType });
    emit({ type: "tool_result", id: pid, name: "search_past_projects", summary: past.summary, data: past.data });
    const ph = (past.data as { hits: { id: string; project: string; item: string; unitPriceSar: number | null; unit: string | null }[] }).hits.find((h) => h.unitPriceSar != null);
    if (ph) {
      priced.push({ ...it, unit: ph.unit ?? it.unit, unitPrice: ph.unitPriceSar, sourceType: "similar_project", sourceRef: `${ph.project}: ${ph.item}`, matchedItemId: ph.id, confidence: 0.5, rationale: `Mock: taken from ${ph.project}.` });
    } else {
      priced.push({ ...it, unitPrice: null, sourceType: "benchmark", sourceRef: "No database or past-project match; needs a benchmark", matchedItemId: null, confidence: 0.2, rationale: "Mock mode does not benchmark. The real analyst would search benchmarks on file and the web." });
    }
    await sleep(120);
  }

  await note(4, "Presenting the priced list.");
  const sub = runTool("submit_pricing", { items: priced, assumptions: ["Mock run: quantities read from numbers in each line, else 1."], summary: "Mock pricing complete." });
  emit({ type: "tool_call", id: "m-sub", name: "submit_pricing", input: { count: priced.length } });
  emit({ type: "tool_result", id: "m-sub", name: "submit_pricing", summary: sub.summary });
  afterTool("submit_pricing", sub.data, session, emit);
  say(`Mock run finished: ${priced.length} items. ${priced.filter((p) => p.unitPrice != null).length} priced from the database or past projects, ${priced.filter((p) => p.unitPrice == null).length} left for a benchmark.`);
  messages.push({ role: "assistant", content: "Mock pricing submitted." });
  session.usage.turns += 1;
  sessions.update(session.id, { messages, pricing: session.pricing, wbs: session.wbs, usage: session.usage, updatedAt: new Date().toISOString() });
  emit({ type: "status", phase: "done", provider: "mock", model: "mock" });
  emit({ type: "done", sessionId: session.id, stopReason: "end_turn" });
}

export type { PricingEvent };
