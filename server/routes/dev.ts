/**
 * Developer settings: the Anthropic key for the local version.
 *
 * The key entered here is kept in server memory and written to the local .env
 * so it survives a restart. It is never sent back to the browser in full.
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth";
import { config, setAnthropicKey } from "../config";
import { providerStatus } from "../pricing/pipeline";

export const devRouter = Router();
devRouter.use(requireAdmin);

devRouter.get("/status", (_req, res) => res.json(providerStatus()));

devRouter.post("/anthropic-key", async (req, res) => {
  const body = z.object({ key: z.string().min(20) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "That does not look like an API key" });
  const key = body.data.key.trim();
  // Verify before storing: a cheap models.list call fails fast on a bad key.
  try {
    await new Anthropic({ apiKey: key }).models.list({ limit: 1 });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return res.status(401).json({ error: "Anthropic rejected this key" });
    return res.status(502).json({ error: `Could not reach the Claude API: ${(err as Error).message}` });
  }
  setAnthropicKey(key);
  if (config.NODE_ENV !== "production") writeEnv("ANTHROPIC_API_KEY", key);
  res.json(providerStatus());
});

devRouter.delete("/anthropic-key", (_req, res) => {
  setAnthropicKey(undefined);
  if (config.NODE_ENV !== "production") writeEnv("ANTHROPIC_API_KEY", "");
  res.json(providerStatus());
});

function writeEnv(name: string, value: string) {
  const file = path.resolve(process.cwd(), ".env");
  let text = "";
  try { text = fs.readFileSync(file, "utf8"); } catch { /* new file */ }
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(file, text);
}
