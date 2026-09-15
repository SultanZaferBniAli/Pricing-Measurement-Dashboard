/**
 * Global application state (Zustand).
 *
 * Holds the parsed scope data plus the user's selections. Selections, the
 * budget heading and the language persist to localStorage so a work-in-progress
 * budget survives a page refresh. Admin re-uploads can replace the scope data
 * at runtime.
 *
 * Which sections are open is UI state shared by the sidebar and the builder, so
 * it lives here too, but it is deliberately NOT persisted.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import rawData from "../data/scopeData.json";
import { enrichScopeData } from "./enrich";
import type { ScopeData, Section, Selection } from "./types";

// Layer research pricing (flights + transport) onto the bundled catalog.
const initialData = enrichScopeData(rawData as unknown as ScopeData);

interface AppState {
  data: ScopeData;
  /** Map of item id -> selection state. Presence == selected. */
  selections: Record<string, Selection>;
  budgetTitle: string;
  /** Who the budget is being prepared for. Appears on the export. */
  client: string;
  language: "en" | "ar";

  /** Section keys currently expanded in the builder. */
  expanded: string[];
  /**
   * Bumped when the sidebar asks the builder to jump to a section. The builder
   * watches the counter so repeat clicks on the same section still scroll.
   */
  focus: { key: string; nonce: number } | null;

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
  toggleSection: (key: string) => void;
  setExpanded: (keys: string[]) => void;
  focusSection: (key: string) => void;
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
      budgetTitle: initialData.meta.project,
      client: "",
      language: "en",
      expanded: [],
      focus: null,

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

      toggleSection: (key) =>
        set((state) => ({
          expanded: state.expanded.includes(key)
            ? state.expanded.filter((k) => k !== key)
            : [...state.expanded, key],
        })),

      setExpanded: (keys) => set({ expanded: keys }),

      focusSection: (key) =>
        set((state) => ({
          expanded: state.expanded.includes(key)
            ? state.expanded
            : [...state.expanded, key],
          focus: { key, nonce: (state.focus?.nonce ?? 0) + 1 },
        })),
      setLanguage: (language) => set({ language }),
      replaceData: (data) =>
        set({ data, selections: {}, budgetTitle: data.meta.project, expanded: [] }),

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
        language: state.language,
      }),
    }
  )
);
