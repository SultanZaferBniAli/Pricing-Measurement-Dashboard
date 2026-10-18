/**
 * The AI pricing endpoints. Each run streams its events back over SSE on the
 * POST response itself, so the UI sees the step, the reasoning and every tool
 * call as they happen rather than waiting for the end.
 */
import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { config, isAllowedModel } from "../config";
import { collection, newId, type AiSession } from "../db/store";
import { runMockPricing } from "../pricing/mock";
import { providerStatus, runPricing, type AttachmentT, type PricingEvent } from "../pricing/pipeline";
import { logUsage } from "./usage";

export const aiRouter = Router();
aiRouter.use(requireAuth);

const Project = z.object({
  title: z.string().default(""),
  client: z.string().default(""),
  projectType: z.string().default(""),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  durationMonths: z.number().optional(),
  location: z.string().optional(),
  description: z.string().default(""),
  rfpReference: z.string().optional(),
});
const Attachment = z.union([
  z.object({ name: z.string(), text: z.string().max(400_000) }),
  z.object({
    name: z.string(),
    image: z.object({
      mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
      // 5 MB is the API's per-image limit; base64 adds a third.
      data: z.string().max(7_000_000),
    }),
  }),
]);

function sse(res: Response) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  return {
    send(e: PricingEvent) {
      res.write(`data: ${JSON.stringify(e)}\n\n`);
    },
    end() {
      clearInterval(ping);
      res.end();
    },
  };
}

async function runAndStream(res: Response, session: AiSession, userText: string, attachments: AttachmentT[], isFirst: boolean) {
  const out = sse(res);
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  const run = config.LLM_PROVIDER === "mock" ? runMockPricing : runPricing;
  try {
    await run({ session, userText, attachments, isFirst, emit: out.send, signal: controller.signal });
  } catch (err) {
    out.send({ type: "error", message: (err as Error).message });
  } finally {
    out.end();
  }
}

aiRouter.get("/status", (_req, res) => res.json(providerStatus()));

/** Start a pricing run for a project. */
aiRouter.post("/sessions", async (req, res) => {
  const body = z
    .object({ project: Project, scopeText: z.string().default(""), attachments: z.array(Attachment).default([]), model: z.string().optional() })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid request", issues: body.error.issues });
  if (!body.data.scopeText.trim() && body.data.attachments.length === 0) {
    return res.status(400).json({ error: "Describe the scope or attach RFP material" });
  }
  const status = providerStatus();
  if (!status.ready) return res.status(503).json({ error: "No Anthropic API key configured. Open Developer settings." });

  const model = body.data.model && isAllowedModel(body.data.model) ? body.data.model : config.LLM_MODEL;
  const session: AiSession = {
    id: newId("ses"),
    userId: req.user.id,
    project: body.data.project,
    model,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usage: { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheWrite: 0, turns: 0 },
  };
  collection("aiSessions").insert(session);
  logUsage({ userId: req.user.id, userEmail: req.user.email, action: "ai_run", projectTitle: session.project.title, client: session.project.client, sessionId: session.id });
  await runAndStream(res, session, body.data.scopeText, body.data.attachments, true);
});

/** Continue the conversation: changes, questions, more scope. */
aiRouter.post("/sessions/:id/messages", async (req, res) => {
  const session = collection("aiSessions").get(req.params.id);
  if (!session || session.userId !== req.user.id) return res.status(404).json({ error: "Session not found" });
  const body = z.object({ text: z.string().min(1), attachments: z.array(Attachment).default([]) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "A message is required" });
  logUsage({ userId: req.user.id, userEmail: req.user.email, action: "ai_followup", projectTitle: session.project.title, client: session.project.client, sessionId: session.id });
  await runAndStream(res, session, body.data.text, body.data.attachments, false);
});

aiRouter.get("/sessions/:id", (req, res) => {
  const session = collection("aiSessions").get(req.params.id);
  if (!session || session.userId !== req.user.id) return res.status(404).json({ error: "Session not found" });
  res.json({ session: { id: session.id, project: session.project, model: session.model, pricing: session.pricing, wbs: session.wbs, usage: session.usage, createdAt: session.createdAt, updatedAt: session.updatedAt } });
});
