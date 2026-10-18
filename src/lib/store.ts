/**
 * Global application state (Zustand).
 *
 * Holds the parsed scope data plus the user's selections. Selections, the
 * budget heading and the language persist to localStorage so a work-in-progress
 * budget survives a page refresh. Admin re-uploads can replace the scope data
 * at runtime.
 *
 * The builder shows one section at a time, so `activeSection` is UI state and is
 * deliberately NOT persisted. Exported budgets are, in `history`.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import rawData from "../data/scopeData.json";
import { enrichScopeData } from "./enrich";
import type { PricingEvent } from "./api";
import type {
  AiLine,
  AiPricing,
  AiStepState,
  AiUsage,
  AuthUser,
  BudgetHistoryEntry,
  ChatMessage,
  ProcessEntry,
  ProjectInfo,
  ScopeData,
  Section,
  Selection,
  WbsEntry,
} from "./types";

/** Live state of an AI pricing run. Not persisted: it is a view of a stream. */
export interface AiRunState {
  running: boolean;
  steps: Record<1 | 2 | 3 | 4, AiStepState>;
  log: ProcessEntry[];
  /** The model's summarised thinking for the current turn. */
  thinking: string;
  chat: ChatMessage[];
  usage: AiUsage;
  error: string | null;
  provider: string | null;
}

const EMPTY_RUN: AiRunState = {
  running: false,
  steps: { 1: "pending", 2: "pending", 3: "pending", 4: "pending" },
  log: [],
  thinking: "",
  chat: [],
  usage: { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheWrite: 0 },
  error: null,
  provider: null,
};

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const TOOL_TITLES: Record<string, string> = {
  note_progress: "Note",
  propose_wbs: "Work breakdown",
  search_price_database: "Searched the price database",
  search_past_projects: "Searched past projects",
  benchmarks_on_file: "Checked benchmarks on file",
  submit_pricing: "Submitted pricing",
  web_search: "Web search",
};

// Layer research pricing (flights + transport) onto the bundled catalog.
const initialData = enrichScopeData(rawData as unknown as ScopeData);

interface AppState {
  data: ScopeData;
  /** Map of item id -> selection state. Presence == selected. */
  selections: Record<string, Selection>;
  budgetTitle: string;
  /** Who the budget is being prepared for. Appears on the export. */
  client: string;
  /** Date the project or RFP was established (ISO yyyy-mm-dd). */
  projectDate: string;
  /** A few lines on what the project is. */
  projectDescription: string;
  /**
   * Text of the RFP most recently analysed, and the file names it came from.
   * Held here so the export can file it alongside the budget: a past budget is
   * only useful as precedent if you know what it was priced against.
   */
  rfpText: string;
  rfpFiles: string[];
  language: "en" | "ar";
  /** Light is the default; the choice persists. */
  theme: "light" | "dark";

  /** The one section the builder is showing. */
  activeSection: string;
  /** Budgets that have been exported, newest first. */
  history: BudgetHistoryEntry[];

  // ---- v2: account, project, AI pricing ----
  user: AuthUser | null;
  /** Entered on "New budget" before any pricing happens. */
  project: ProjectInfo | null;
  /** Lines priced by the AI (or added by hand in the AI workspace). */
  aiLines: AiLine[];
  aiSessionId: string | null;
  wbs: { analysis: string; items: WbsEntry[] } | null;
  assumptions: string[];
  /** The server id of this budget once saved, so a re-save updates it. */
  savedBudgetId: string | null;
  /** Live run state, never persisted. */
  ai: AiRunState;

  setUser: (u: AuthUser | null) => void;
  setProject: (p: ProjectInfo) => void;
  setPricing: (p: AiPricing) => void;
  updateAiLine: (id: string, patch: Partial<AiLine>) => void;
  removeAiLine: (id: string) => void;
  addManualLine: (line: Omit<AiLine, "id" | "included" | "sourceType" | "sourceRef">) => void;
  setSavedBudgetId: (id: string | null) => void;
  aiBegin: (userText: string, attachments: string[]) => void;
  aiApply: (e: PricingEvent) => void;
  aiFinish: (error?: string) => void;
  aiReset: () => void;
  /**
   * The budget just exported, so the builder can say where it went after
   * clearing the desk. Not persisted: it is a message, not a record.
   */
  lastExport: { id: string; title: string } | null;

  // ---- selection actions ----
  toggleItem: (id: string, defaultQty?: number) => void;
  setQty: (id: string, qty: number) => void;
  setCustomPrice: (id: string, price: number | null) => void;
  setPercentRate: (id: string, rate: number | null) => void;
  setNote: (id: string, note: string) => void;
  selectMany: (ids: string[], defaultQtys: Record<string, number>) => void;
  clearSection: (sectionKey: string, ids: string[]) => void;
  clearAll: () => void;

  // ---- meta actions ----
  setBudgetTitle: (title: string) => void;
  setClient: (client: string) => void;
  setProjectDate: (date: string) => void;
  setProjectDescription: (text: string) => void;
  setRfp: (text: string, files: string[]) => void;
  setActiveSection: (key: string) => void;
  saveToHistory: (entry: Omit<BudgetHistoryEntry, "id" | "exportedAt">) => void;
  restoreFromHistory: (id: string) => void;
  removeFromHistory: (id: string) => void;
  /** Clear the working budget and its brief, keeping history. */
  startNewBudget: () => void;
  dismissLastExport: () => void;
  setLanguage: (lang: "en" | "ar") => void;
  setTheme: (theme: "light" | "dark") => void;
  replaceData: (data: ScopeData) => void;

  // ---- selectors ----
  sections: () => Section[];
  isSelected: (id: string) => boolean;
}

/** A sensible default qty: 1 for priced items, 1 for unpriced when toggled on. */
function defaultFor(qty?: number): number {
  return qty && qty > 0 ? qty : 1;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      data: initialData,
      selections: {},
      budgetTitle: "",
      client: "",
      projectDate: "",
      projectDescription: "",
      rfpText: "",
      rfpFiles: [],
      language: "en",
      theme: "light",
      activeSection: initialData.sections[0]?.key ?? "",
      history: [],
      lastExport: null,
      user: null,
      project: null,
      aiLines: [],
      aiSessionId: null,
      wbs: null,
      assumptions: [],
      savedBudgetId: null,
      ai: EMPTY_RUN,

      setUser: (user) => set({ user }),
      setProject: (project) => set({ project, budgetTitle: project.title, client: project.client, projectDate: project.startDate ?? "", projectDescription: project.description }),

      setPricing: (p) =>
        set((state) => {
          // Keep the user's own edits on lines the model resubmits unchanged
          // by ref, and mark what the model changed.
          const prev = new Map(state.aiLines.map((l) => [l.ref, l]));
          const aiLines: AiLine[] = p.items.map((it) => {
            const old = prev.get(it.ref);
            return {
              ...it,
              id: old?.id ?? uid("ai"),
              included: old?.included ?? true,
              aiUnitPrice: it.unitPrice,
              aiQty: it.qty,
              userAdjusted: false,
            };
          });
          return { aiLines, assumptions: p.assumptions };
        }),

      updateAiLine: (id, patch) =>
        set((state) => ({
          aiLines: state.aiLines.map((l) => {
            if (l.id !== id) return l;
            const next = { ...l, ...patch };
            const adjusted =
              (patch.unitPrice !== undefined && patch.unitPrice !== l.aiUnitPrice) ||
              (patch.qty !== undefined && patch.qty !== l.aiQty);
            return adjusted ? { ...next, userAdjusted: true } : next;
          }),
        })),

      removeAiLine: (id) => set((state) => ({ aiLines: state.aiLines.filter((l) => l.id !== id) })),

      addManualLine: (line) =>
        set((state) => ({
          aiLines: [
            ...state.aiLines,
            { ...line, id: uid("ai"), included: true, sourceType: "manual", sourceRef: "Entered by user", userAdjusted: true },
          ],
        })),

      setSavedBudgetId: (savedBudgetId) => set({ savedBudgetId }),

      aiBegin: (userText, attachments) =>
        set((state) => ({
          ai: {
            ...state.ai,
            running: true,
            error: null,
            thinking: "",
            steps: state.aiSessionId ? state.ai.steps : { 1: "pending", 2: "pending", 3: "pending", 4: "pending" },
            chat: [
              ...state.ai.chat,
              { id: uid("c"), role: "user", text: userText, attachments, at: Date.now() },
              { id: uid("c"), role: "assistant", text: "", at: Date.now(), pending: true },
            ],
          },
        })),

      aiApply: (e) =>
        set((state) => {
          const ai = { ...state.ai, log: state.ai.log, chat: state.ai.chat };
          const push = (entry: Omit<ProcessEntry, "id" | "at">) => {
            ai.log = [...ai.log, { id: uid("p"), at: Date.now(), ...entry }];
          };
          const appendAssistant = (text: string) => {
            const chat = [...ai.chat];
            const last = chat[chat.length - 1];
            if (last && last.role === "assistant" && last.pending) chat[chat.length - 1] = { ...last, text: last.text + text };
            else chat.push({ id: uid("c"), role: "assistant", text, at: Date.now(), pending: true });
            ai.chat = chat;
          };
          switch (e.type) {
            case "status":
              ai.provider = `${e.provider} · ${e.model}`;
              if (e.phase === "running") push({ kind: "status", title: `Connected to ${e.model}` });
              break;
            case "step":
              ai.steps = { ...ai.steps, [e.step]: e.state === "done" ? "done" : ai.steps[e.step] === "done" ? "done" : "active" };
              break;
            case "thinking":
              ai.thinking = ai.thinking + e.text;
              break;
            case "text":
              appendAssistant(e.text);
              break;
            case "note":
              push({ kind: "note", step: e.step, title: e.note });
              break;
            case "tool_call":
              if (e.name !== "note_progress") {
                const input = e.input as Record<string, unknown>;
                const q = typeof input?.query === "string" ? `"${input.query}"` : "";
                push({ kind: "tool", title: `${TOOL_TITLES[e.name] ?? e.name} ${q}`.trim(), data: e.input });
              }
              break;
            case "tool_result":
              if (e.name !== "note_progress") push({ kind: "result", title: e.summary, data: e.data, isError: e.isError });
              break;
            case "web_search":
              push({ kind: "web", title: `Web search: "${e.query}"` });
              break;
            case "wbs":
              push({ kind: "wbs", title: `Work breakdown: ${e.items.length} items`, detail: e.analysis, data: e.items });
              return { ai, wbs: { analysis: e.analysis, items: e.items } };
            case "pricing": {
              push({ kind: "pricing", title: `Pricing submitted: ${e.pricing.items.length} items`, detail: e.pricing.summary });
              const prev = new Map(state.aiLines.map((l) => [l.ref, l]));
              const aiLines: AiLine[] = e.pricing.items.map((it) => ({
                ...it,
                id: prev.get(it.ref)?.id ?? uid("ai"),
                included: prev.get(it.ref)?.included ?? true,
                aiUnitPrice: it.unitPrice,
                aiQty: it.qty,
                userAdjusted: false,
              }));
              return { ai, aiLines, assumptions: e.pricing.assumptions };
            }
            case "usage":
              ai.usage = { inputTokens: e.inputTokens, outputTokens: e.outputTokens, cacheRead: e.cacheRead, cacheWrite: e.cacheWrite };
              break;
            case "error":
              ai.error = e.message;
              push({ kind: "error", title: e.message, isError: true });
              break;
            case "done":
              return { ai, aiSessionId: e.sessionId };
          }
          return { ai };
        }),

      aiFinish: (error) =>
        set((state) => ({
          ai: {
            ...state.ai,
            running: false,
            error: error ?? state.ai.error,
            chat: state.ai.chat.map((m) => (m.pending ? { ...m, pending: false, text: m.text || (error ? "" : m.text) } : m)),
          },
        })),

      aiReset: () => set({ ai: EMPTY_RUN }),

      toggleItem: (id, defaultQty) =>
        set((state) => {
          const next = { ...state.selections };
          if (next[id]) {
            delete next[id];
          } else {
            next[id] = { qty: defaultFor(defaultQty) };
          }
          return { selections: next };
        }),

      setQty: (id, qty) =>
        set((state) => {
          const cur = state.selections[id];
          if (!cur) return {};
          return {
            selections: {
              ...state.selections,
              [id]: { ...cur, qty: Math.max(0, qty || 0) },
            },
          };
        }),

      setCustomPrice: (id, price) =>
        set((state) => {
          const cur = state.selections[id] ?? { qty: 1 };
          return {
            selections: {
              ...state.selections,
              [id]: { ...cur, customPrice: price },
            },
          };
        }),

      setPercentRate: (id, rate) =>
        set((state) => {
          const cur = state.selections[id] ?? { qty: 1 };
          return {
            selections: {
              ...state.selections,
              [id]: { ...cur, percentRate: rate },
            },
          };
        }),

      setNote: (id, note) =>
        set((state) => {
          const cur = state.selections[id];
          if (!cur) return {};
          return {
            selections: {
              ...state.selections,
              [id]: { ...cur, note },
            },
          };
        }),

      selectMany: (ids, defaultQtys) =>
        set((state) => {
          const next = { ...state.selections };
          for (const id of ids) {
            if (!next[id]) next[id] = { qty: defaultFor(defaultQtys[id]) };
          }
          return { selections: next };
        }),

      clearSection: (_sectionKey, ids) =>
        set((state) => {
          const next = { ...state.selections };
          for (const id of ids) delete next[id];
          return { selections: next };
        }),

      clearAll: () => set({ selections: {} }),

      setBudgetTitle: (title) => set({ budgetTitle: title }),
      setClient: (client) => set({ client }),
      setProjectDate: (projectDate) => set({ projectDate }),
      setProjectDescription: (projectDescription) => set({ projectDescription }),
      // Capped: this lands in localStorage, and a 200-page RFP would not fit.
      setRfp: (text, files) => set({ rfpText: text.slice(0, 60000), rfpFiles: files }),

      setActiveSection: (key) => set({ activeSection: key }),

      saveToHistory: (entry) =>
        set((state) => {
          const next: BudgetHistoryEntry = {
            ...entry,
            id:
              globalThis.crypto?.randomUUID?.() ??
              `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            exportedAt: new Date().toISOString(),
          };
          // Re-exporting the same title replaces that entry rather than piling
          // up near-identical rows, and the list is capped so it stays scannable.
          const rest = state.history.filter(
            (h) => h.title.trim().toLowerCase() !== next.title.trim().toLowerCase()
          );
          return {
            history: [next, ...rest].slice(0, 30),
            lastExport: { id: next.id, title: next.title },
          };
        }),

      /**
       * Wipe the desk for the next budget. Safe because export has already
       * filed this one under history, selections and all, so nothing here is
       * the only copy.
       */
      startNewBudget: () =>
        set({
          selections: {},
          budgetTitle: "",
          client: "",
          projectDate: "",
          projectDescription: "",
          rfpText: "",
          rfpFiles: [],
          project: null,
          aiLines: [],
          aiSessionId: null,
          wbs: null,
          assumptions: [],
          savedBudgetId: null,
          ai: EMPTY_RUN,
        }),

      dismissLastExport: () => set({ lastExport: null }),

      restoreFromHistory: (id) =>
        set((state) => {
          const entry = state.history.find((h) => h.id === id);
          if (!entry) return {};
          return {
            selections: { ...entry.selections },
            budgetTitle: entry.title,
            client: entry.client,
          };
        }),

      removeFromHistory: (id) =>
        set((state) => ({ history: state.history.filter((h) => h.id !== id) })),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      replaceData: (data) =>
        set({
          data,
          selections: {},
          budgetTitle: "",
          activeSection: data.sections[0]?.key ?? "",
        }),

      sections: () => get().data.sections,
      isSelected: (id) => Boolean(get().selections[id]),
    }),
    {
      name: "tam-budget-builder",
      // Only persist user-authored state, not the (large) source dataset.
      partialize: (state) => ({
        selections: state.selections,
        budgetTitle: state.budgetTitle,
        client: state.client,
        projectDate: state.projectDate,
        projectDescription: state.projectDescription,
        rfpText: state.rfpText,
        rfpFiles: state.rfpFiles,
        language: state.language,
        theme: state.theme,
        history: state.history,
        project: state.project,
        aiLines: state.aiLines,
        aiSessionId: state.aiSessionId,
        wbs: state.wbs,
        assumptions: state.assumptions,
        savedBudgetId: state.savedBudgetId,
      }),
    }
  )
);
