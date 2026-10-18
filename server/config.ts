/**
 * Server configuration, read once from the environment and validated.
 *
 * The app fails fast with a clear message when a required value is missing.
 * ANTHROPIC_API_KEY is optional at startup on purpose: the developer version
 * lets the key be entered from the UI (see routes/dev.ts), and the server is
 * still useful for the manual catalog without it.
 */
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  /** Where the JSON database and uploaded files live. */
  DATA_DIR: z.string().default("./server/data"),
  /** Secret used to sign session cookies. Any long random string. */
  SESSION_SECRET: z.string().min(16).default("dev-only-change-me-please-0123456789"),
  /** Comma-separated origins allowed by CORS (the Vite dev server by default). */
  CORS_ORIGINS: z.string().default("http://localhost:5183,http://127.0.0.1:5183"),
  /** Only emails on these domains may be created as users. */
  ALLOWED_EMAIL_DOMAINS: z.string().default("tamhub.com"),
  /** Google OAuth client file downloaded from Google Cloud (web application type). */
  GOOGLE_CLIENT_FILE: z.string().default("./server/data/google-client.json"),
  /** Or the two values directly; they win over the file when set. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Where Google sends the user back. Must match the OAuth client exactly. */
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:5183/api/auth/google/callback"),
  /** Comma-separated emails that get the admin role when they sign in with Google. */
  ADMIN_EMAILS: z.string().default("a.alomerene@tamhub.com"),
  /** Keep the seeded email + password login available (developer version). */
  AUTH_PASSWORD_LOGIN: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),

  ANTHROPIC_API_KEY: z.string().optional(),
  /** `anthropic` calls the Claude API; `mock` walks the same pipeline without a model. */
  LLM_PROVIDER: z.enum(["anthropic", "mock"]).default("anthropic"),
  /** Default model for a new pricing run. Users can pick another from LLM_MODEL_OPTIONS per run. */
  LLM_MODEL: z.string().default("claude-sonnet-5-5"),
  /** Comma-separated id=label pairs offered in the UI. */
  LLM_MODEL_OPTIONS: z
    .string()
    .default("claude-sonnet-5-5=Sonnet 5.5 (standard),claude-opus-5-5=Opus 5.5 (complex RFPs)"),
  LLM_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),
  /** Let the model run web searches for benchmark prices (costs extra). */
  LLM_WEB_SEARCH: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  LLM_MAX_WEB_SEARCHES: z.coerce.number().int().min(0).max(20).default(3),

  /** Seeded accounts for the developer version. Format: email:password:role,... */
  SEED_USERS: z
    .string()
    .default("admin@tamhub.com:admin12345:admin,user@tamhub.com:user12345:user"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;

/**
 * The API key can be set after startup from the developer settings screen, so
 * it lives in a mutable holder rather than being read from `config` directly.
 */
let runtimeApiKey: string | undefined = config.ANTHROPIC_API_KEY;
export function getAnthropicKey(): string | undefined {
  return runtimeApiKey;
}
export function setAnthropicKey(key: string | undefined) {
  runtimeApiKey = key?.trim() || undefined;
}

/** The models a user may choose for a run, in display order. */
export function modelOptions(): { id: string; label: string }[] {
  return config.LLM_MODEL_OPTIONS.split(",")
    .map((pair) => pair.split("="))
    .filter(([id]) => id?.trim())
    .map(([id, label]) => ({ id: id.trim(), label: (label ?? id).trim() }));
}
export function isAllowedModel(id: string): boolean {
  return modelOptions().some((m) => m.id === id);
}
