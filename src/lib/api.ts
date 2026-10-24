/**
 * The browser side of the API. Plain fetch with the session cookie, plus a
 * small SSE reader for the pricing stream (fetch can stream a POST response,
 * which EventSource cannot).
 */
import type { AiLine, AiPricing, AuthUser, ProjectInfo, WbsEntry } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

// ------------------------------------------------------------------- auth
export const auth = {
  config: () => api.get<{ google: boolean; password: boolean; domains: string[] }>("/api/auth/config"),
  me: () => api.get<{ user: AuthUser | null }>("/api/auth/me"),
  login: (email: string, password: string) => api.post<{ user: AuthUser }>("/api/auth/login", { email, password }),
  logout: () => api.post<{ ok: true }>("/api/auth/logout"),
};

// ------------------------------------------------------------------- AI
export type PricingEvent =
  | { type: "status"; phase: "starting" | "running" | "done"; provider: string; model: string }
  | { type: "step"; step: 1 | 2 | 3 | 4; state: "active" | "done" }
  | { type: "thinking"; text: string }
  | { type: "text"; text: string }
  | { type: "note"; step: number; note: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; name: string; summary: string; data?: unknown; isError?: boolean }
  | { type: "web_search"; query: string }
  | { type: "wbs"; analysis: string; items: WbsEntry[] }
  | { type: "pricing"; pricing: AiPricing }
  | { type: "usage"; inputTokens: number; outputTokens: number; cacheRead: number; cacheWrite: number }
  | { type: "done"; sessionId: string; stopReason: string | null }
  | { type: "error"; message: string };

export type Attachment =
  | { name: string; text: string }
  | { name: string; image: { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string } };

export interface AiStatus {
  provider: string;
  model: string;
  models: { id: string; label: string }[];
  effort: string;
  webSearch: boolean;
  hasKey: boolean;
  keyHint: string | null;
  ready: boolean;
}

/** POST, then read the SSE body event by event until the server closes it. */
async function streamEvents(path: string, body: unknown, onEvent: (e: PricingEvent) => void, signal?: AbortSignal) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        try {
          onEvent(JSON.parse(line.slice(5)) as PricingEvent);
        } catch {
          /* ignore malformed */
        }
      }
    }
  }
}

export const ai = {
  status: () => api.get<AiStatus>("/api/ai/status"),
  start: (
    project: ProjectInfo,
    scopeText: string,
    attachments: Attachment[],
    onEvent: (e: PricingEvent) => void,
    signal?: AbortSignal,
    model?: string
  ) => streamEvents("/api/ai/sessions", { project, scopeText, attachments, model }, onEvent, signal),
  continue: (sessionId: string, text: string, attachments: Attachment[], onEvent: (e: PricingEvent) => void, signal?: AbortSignal) =>
    streamEvents(`/api/ai/sessions/${sessionId}/messages`, { text, attachments }, onEvent, signal),
};

// --------------------------------------------------------------- budgets
export interface SavedBudgetSummary {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userPicture?: string | null;
  project: ProjectInfo;
  totals: { base: number; fee: number; grand: number; vat: number; total: number };
  aiSessionId?: string | null;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface SavedBudget extends Omit<SavedBudgetSummary, "lineCount"> {
  lines: Omit<AiLine, "id" | "included">[];
}

export const budgets = {
  list: () => api.get<{ budgets: SavedBudgetSummary[] }>("/api/budgets"),
  get: (id: string) => api.get<{ budget: SavedBudget }>(`/api/budgets/${id}`),
  save: (body: {
    id?: string;
    project: ProjectInfo;
    lines: Omit<AiLine, "id" | "included">[];
    totals: { base: number; fee: number; grand: number; vat: number; total: number };
    aiSessionId?: string | null;
  }) => api.post<{ budget: SavedBudget; observations: number }>("/api/budgets", body),
  remove: (id: string) => api.del<{ ok: true }>(`/api/budgets/${id}`),
};

// ----------------------------------------------------------------- admin
export interface UsageReport {
  summary: { users: number; budgets: number; aiRuns: number; observations: number; totalPriced: number };
  perUser: {
    id: string; email: string; name: string; picture?: string | null; role: string; lastLoginAt: string | null;
    logins: number; aiRuns: number; followUps: number; budgetsSaved: number; totalPriced: number; tokens: number;
  }[];
  events: { id: string; at: string; userEmail: string; action: string; projectTitle?: string; client?: string; total?: number }[];
  budgets: SavedBudgetSummary[];
}

export const admin = {
  usage: () => api.get<UsageReport>("/api/admin/usage"),
  users: () => api.get<{ users: (AuthUser & { createdAt: string; lastLoginAt?: string; hasPassword: boolean })[] }>("/api/auth/users"),
  addUser: (u: { email: string; name: string; password?: string; role: "admin" | "user" }) => api.post<{ user: AuthUser }>("/api/auth/users", u),
  setRole: (id: string, role: "admin" | "user") =>
    fetch(`/api/auth/users/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) }).then(async (r) => {
      if (!r.ok) throw new ApiError(r.status, ((await r.json().catch(() => ({}))) as { error?: string }).error ?? r.statusText);
      return (await r.json()) as { user: AuthUser };
    }),
  removeUser: (id: string) => api.del<{ ok: boolean }>(`/api/auth/users/${id}`),
  devStatus: () => api.get<AiStatus>("/api/dev/status"),
  setKey: (key: string) => api.post<AiStatus>("/api/dev/anthropic-key", { key }),
  clearKey: () => api.del<AiStatus>("/api/dev/anthropic-key"),
  catalogMeta: () => api.get<Record<string, unknown>>("/api/catalog/meta"),
};
