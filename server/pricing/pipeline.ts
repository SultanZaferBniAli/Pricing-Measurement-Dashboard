/**
 * The pricing run: one streaming conversation with Claude, tools executed
 * here, every step reported as it happens.
 *
 * The loop is the manual streaming loop from the Claude API docs: stream a
 * turn, collect the final message, run any tool calls, append the results and
 * go again until the model ends its turn. The conversation is append-only and
 * stored whole on the session, thinking blocks included, so a follow-up
 * question continues the same context.
 */
import Anthropic from "@anthropic-ai/sdk";
import { config, getAnthropicKey, isAllowedModel, modelOptions } from "../config";
import { collection, type AiSession } from "../db/store";
import { firstUserMessage, followUpMessage, systemPrompt, type AttachmentIn } from "./prompts";

export type AttachmentT = AttachmentIn;
import { TOOLS, runTool, type SubmitPricingT } from "./tools";

export type PricingEvent =
  | { type: "status"; phase: "starting" | "running" | "done"; provider: string; model: string }
  | { type: "step"; step: 1 | 2 | 3 | 4; state: "active" | "done" }
  | { type: "thinking"; text: string }
  | { type: "text"; text: string }
  | { type: "note"; step: number; note: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; name: string; summary: string; data?: unknown; isError?: boolean }
  | { type: "web_search"; query: string }
  | { type: "wbs"; analysis: string; items: unknown[] }
  | { type: "pricing"; pricing: SubmitPricingT }
  | { type: "usage"; inputTokens: number; outputTokens: number; cacheRead: number; cacheWrite: number }
  | { type: "done"; sessionId: string; stopReason: string | null }
  | { type: "error"; message: string };

export interface RunOptions {
  session: AiSession;
  /** The new user turn. For the first run this is built from the brief. */
  userText: string;
  attachments?: AttachmentIn[];
  isFirst: boolean;
  emit: (e: PricingEvent) => void;
  signal?: AbortSignal;
}

export function providerStatus() {
  const key = getAnthropicKey();
  return {
    provider: config.LLM_PROVIDER,
    model: config.LLM_MODEL,
    models: modelOptions(),
    effort: config.LLM_EFFORT,
    webSearch: config.LLM_WEB_SEARCH,
    hasKey: Boolean(key),
    keyHint: key ? `${key.slice(0, 10)}…${key.slice(-4)}` : null,
    ready: config.LLM_PROVIDER === "mock" || Boolean(key),
  };
}

const MAX_TURNS = 40;

export async function runPricing(opts: RunOptions): Promise<void> {
  const { session, emit, signal } = opts;
  const key = getAnthropicKey();
  if (!key) {
    emit({ type: "error", message: "No Anthropic API key is configured. Add it under Developer settings." });
    return;
  }
  const client = new Anthropic({ apiKey: key, maxRetries: 2 });
  const sessions = collection("aiSessions");
  const model = session.model && isAllowedModel(session.model) ? session.model : config.LLM_MODEL;

  const userContent = opts.isFirst
    ? firstUserMessage(session.project, opts.userText, opts.attachments ?? [])
    : followUpMessage(opts.userText, opts.attachments ?? []);

  const messages = session.messages as Anthropic.MessageParam[];
  messages.push({ role: "user", content: userContent });

  const tools: Anthropic.ToolUnion[] = [...TOOLS];
  if (config.LLM_WEB_SEARCH) {
    tools.push({
      type: "web_search_20260209",
      name: "web_search",
      max_uses: config.LLM_MAX_WEB_SEARCHES,
      user_location: { type: "approximate", country: "SA", city: "Riyadh", timezone: "Asia/Riyadh" },
    });
  }
  // Cache the stable prefix: tools then system. The last tool carries the
  // breakpoint so the whole tool list plus the system prompt is served from cache.
  const lastTool = tools[tools.length - 1] as Anthropic.Tool;
  if ("input_schema" in lastTool) lastTool.cache_control = { type: "ephemeral" };

  emit({ type: "status", phase: "running", provider: "anthropic", model });
  if (opts.isFirst) emit({ type: "step", step: 1, state: "active" });

  let totalIn = 0, totalOut = 0, cacheRead = 0, cacheWrite = 0;
  let stopReason: string | null = null;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (signal?.aborted) break;
    // Cache the whole conversation so far. The breakpoint moves to the end of
    // the newest message every turn: the prefix before it is read from cache
    // at a fraction of the price, and only the new part is written. This is
    // what keeps a long RFP and a growing pile of tool results from being
    // re-billed in full on every one of the loop's turns.
    moveCacheBreakpoint(messages);
    const stream = client.messages.stream(
      {
        model,
        max_tokens: 32000,
        system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: config.LLM_EFFORT },
        tools,
        messages,
      },
      { signal }
    );

    stream.on("text", (delta) => emit({ type: "text", text: delta }));
    stream.on("streamEvent", (ev) => {
      if (ev.type === "content_block_delta" && ev.delta.type === "thinking_delta" && ev.delta.thinking) {
        emit({ type: "thinking", text: ev.delta.thinking });
      }
      if (ev.type === "content_block_start" && ev.content_block.type === "server_tool_use") {
        const q = (ev.content_block.input as { query?: string })?.query;
        if (q) emit({ type: "web_search", query: q });
      }
    });

    let message: Anthropic.Message;
    try {
      message = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        emit({ type: "error", message: `Claude API error ${err.status}: ${err.message}` });
      } else if ((err as Error).name === "AbortError") {
        emit({ type: "error", message: "Run cancelled." });
      } else {
        emit({ type: "error", message: (err as Error).message });
      }
      await persist();
      return;
    }

    totalIn += message.usage.input_tokens;
    totalOut += message.usage.output_tokens;
    cacheRead += message.usage.cache_read_input_tokens ?? 0;
    cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
    emit({ type: "usage", inputTokens: totalIn, outputTokens: totalOut, cacheRead, cacheWrite });

    // Web searches that completed in this turn show up as server tool blocks.
    for (const block of message.content) {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        const q = (block.input as { query?: string })?.query;
        if (q) emit({ type: "tool_result", id: block.id, name: "web_search", summary: `Web search: "${q}"` });
      }
    }

    messages.push({ role: "assistant", content: message.content });
    stopReason = message.stop_reason;

    if (message.stop_reason === "pause_turn") continue;
    if (message.stop_reason === "refusal") {
      emit({ type: "error", message: "The model declined this request." });
      break;
    }
    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) break;
    if (message.stop_reason === "max_tokens") {
      emit({ type: "error", message: "The model ran out of output tokens mid tool call. Ask it to continue." });
      break;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      emit({ type: "tool_call", id: tu.id, name: tu.name, input: tu.input });
      const out = await runTool(tu.name, tu.input);
      emit({ type: "tool_result", id: tu.id, name: tu.name, summary: out.summary, data: out.data, isError: out.isError });
      afterTool(tu.name, out.data, session, emit);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out.result, is_error: out.isError });
    }
    messages.push({ role: "user", content: results });
    await persist();
  }

  session.usage.inputTokens += totalIn;
  session.usage.outputTokens += totalOut;
  session.usage.cacheRead += cacheRead;
  session.usage.cacheWrite += cacheWrite;
  session.usage.turns += 1;
  await persist();
  emit({ type: "status", phase: "done", provider: "anthropic", model });
  emit({ type: "done", sessionId: session.id, stopReason });

  async function persist() {
    session.updatedAt = new Date().toISOString();
    await sessions.update(session.id, { messages, pricing: session.pricing, wbs: session.wbs, usage: session.usage, updatedAt: session.updatedAt });
  }
}

/**
 * Strip every cache_control from the messages, then mark the last content
 * block of the last message. The API allows at most four breakpoints per
 * request, so old ones must go before the new one is placed.
 */
function moveCacheBreakpoint(messages: Anthropic.MessageParam[]) {
  for (const m of messages) {
    if (typeof m.content === "string") continue;
    for (const block of m.content) {
      if ("cache_control" in block) delete (block as { cache_control?: unknown }).cache_control;
    }
  }
  const last = messages[messages.length - 1];
  if (!last) return;
  if (typeof last.content === "string") {
    last.content = [{ type: "text", text: last.content, cache_control: { type: "ephemeral" } }];
    return;
  }
  const block = last.content[last.content.length - 1];
  if (block && block.type !== "thinking" && block.type !== "redacted_thinking") {
    (block as { cache_control?: { type: "ephemeral" } }).cache_control = { type: "ephemeral" };
  }
}

/** Turn tool side effects into UI events and session state. */
export function afterTool(name: string, data: unknown, session: AiSession, emit: (e: PricingEvent) => void) {
  if (!data) return;
  if (name === "note_progress") {
    const d = data as { step: number; note: string };
    emit({ type: "note", step: d.step, note: d.note });
    emit({ type: "step", step: d.step as 1 | 2 | 3 | 4, state: "active" });
    for (let s = 1; s < d.step; s++) emit({ type: "step", step: s as 1 | 2 | 3 | 4, state: "done" });
  }
  if (name === "propose_wbs") {
    const d = data as { analysis: string; items: unknown[] };
    session.wbs = d;
    emit({ type: "step", step: 1, state: "done" });
    emit({ type: "step", step: 2, state: "done" });
    emit({ type: "step", step: 3, state: "active" });
    emit({ type: "wbs", analysis: d.analysis, items: d.items });
  }
  if (name === "submit_pricing") {
    session.pricing = data;
    emit({ type: "step", step: 3, state: "done" });
    emit({ type: "step", step: 4, state: "done" });
    emit({ type: "pricing", pricing: data as SubmitPricingT });
  }
}
