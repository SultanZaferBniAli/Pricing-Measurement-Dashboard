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
import type {
  BudgetHistoryEntry,
  ScopeData,
  Section,
  Selection,
} from "./types";

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
  /** A few lines on what this budget is meant to cover. */
  budgetNotes: string;
  language: "en" | "ar";

  /** The one section the builder is showing. */
  activeSection: string;
  /** Budgets that have been exported, newest first. */
  history: BudgetHistoryEntry[];

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
  setBudgetNotes: (text: string) => void;
  setActiveSection: (key: string) => void;
  saveToHistory: (entry: Omit<BudgetHistoryEntry, "id" | "exportedAt">) => void;
  restoreFromHistory: (id: string) => void;
  removeFromHistory: (id: string) => void;
  setLanguage: (lang: "en" | "ar") => void;
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
      budgetNotes: "",
      language: "en",
      activeSection: initialData.sections[0]?.key ?? "",
      history: [],

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
      setBudgetNotes: (budgetNotes) => set({ budgetNotes }),

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
          return { history: [next, ...rest].slice(0, 30) };
        }),

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
        budgetNotes: state.budgetNotes,
        language: state.language,
        history: state.history,
      }),
    }
  )
);
