# TAM · Scope-Based Budget Builder

An internal **Pricing Measurement Dashboard** for **TAM Development Company —
شركة تام التنموية**. It turns TAM's priced scope-of-work spreadsheets into a
point-and-click budgeting tool: browse pricing by department, select the items
you need, adjust quantities, apply the standard **15% fee**, watch section and
grand totals update live, and export a clean, client-ready Excel workbook.

Built for non-technical users — you never have to open the source spreadsheets.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5183
```

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Requires Node 18+. Python 3 + `openpyxl` are only needed if you want to
**re-generate** the bundled data from the source workbooks (see below).

---

## What's in the box

| Screen | What it does |
| --- | --- |
| **Dashboard (single-page builder)** | Everything on one page: overview KPIs (sections, priced/unpriced, selected count, live Base / Fees / Grand totals), a spend-by-section chart, one global filter toolbar, and the four sections as **inline accordions**. Click a section header to expand it *in place* — no navigation — then select items, set quantities, and adjust prices. "Select all" per sub-category; "Expand/Collapse all". |
| **Budget summary** | Every selected line in one place — editable quantity, optional per-line note, remove button, section-aware totals, unpriced-items callout, **Export to Excel**, and Print. |
| **Admin** | Drag-and-drop re-upload of an updated `Scope_of_Work_Priced_QTY.xlsx` to re-parse the catalog at runtime. |

The single global filter toolbar (search + priced/unpriced + price source +
match type) applies across all sections at once; searching auto-expands only the
sections that contain matches. A sticky bottom bar keeps the running **Base /
Fees / Grand Total** and a "Review Budget" button visible. Selections and the
budget title persist to `localStorage`, so a work-in-progress budget survives a
refresh.

### Research pricing (flights & ground transport)

The source scope file intentionally left flights and detailed transport
**unpriced**. TAM's separate research workbooks do have benchmark figures, so a
thin enrichment layer (`src/data/researchPricing.ts` + `src/lib/enrich.ts`)
applies them on top of the catalog at load time — flagged with the
**`Research`** price source so they're visually distinct from TAM / Threelines
master prices:

- **Flights** — real prices filled into the existing flight lines by class:
  domestic Economy (521) & Business (1,408) as one-way averages from Riyadh;
  international Business (22,222) & First (46,750) as round-trip averages. Each
  keeps its min–max range in the note. Lines with no benchmark data (domestic
  First, international Economy / Premium Economy) stay unpriced.
- **Ground transport** — real, selectable options added to Logistics: a
  **Car with Driver (Chauffeur)** group (standard/executive/luxury sedan, SUV,
  van, minibus by duration) and a **Car Rental (Monthly)** group, from the
  Riyadh car-with-driver study.

This enrichment runs for both the bundled data and any admin re-upload, so they
behave identically.

---

## 1) File ingestion

The source workbooks live one directory up (the shared *Initiative - Pricing*
folder). They are parsed **at build time** into a single normalized JSON file
that ships with the app — so the dashboard loads instantly with no upload step.

```
scripts/parse_excel.py   ──►   src/data/scopeData.json
```

Re-generate after the spreadsheets change:

```bash
python scripts/parse_excel.py
```

Sources and how each is used:

- **`Scope_of_Work_Priced_QTY.xlsx`** — the operational source of truth. Drives
  every section, sub-category, line item, price, and all mapping metadata.
- **`Pricing_Master_Annotated.xlsx`** — the *Items & Pricing* reference library
  plus *Methodology* and *Gaps & Data Issues*, carried along as supporting
  reference data.
- **`Domestic Exercise.xlsx`** / **`Riyadh_Driver_Prices.xlsx`** — travel and
  ground-transport benchmarks, carried as reference for logistics pricing.

**Runtime re-upload:** the Admin screen re-parses an uploaded Scope of Work file
in the browser via `src/lib/excelImport.ts`, which mirrors the Python parser
exactly (same section detection, same unpriced rules).

### Parsing rules

- Section headers detected: `MARKETING`, `EVENT MANAGEMENT`, `LOGISTICS`,
  `VIDEO PRODUCTIONS`.
- A *Main Item* value marks a sub-category (it may share a row with the first
  item of that group); the *Sub-Item* column is the item name.
- Subtotal / grand-total / "How to use" / mapping-summary rows are ignored.
- Rows marked `NOT IN MASTER`, `GAP`, or with an empty price are kept but
  flagged **unpriced** — **no price is ever invented.**

The parse reconciles to the source's own mapping summary: **103 scope lines,
58 priced, 45 unpriced** across 4 sections.

---

## 2) Data structure

`scripts/parse_excel.py` emits `src/data/scopeData.json`, typed in
`src/lib/types.ts`:

```
ScopeData
├── meta        { project, currency, feeRate: 0.15, counts { sections, items, priced, unpriced } }
├── sections[]  { id, key, name, items[] }
│                └── ScopeItem { id, section, subCategory, name, type, defaultQty,
│                                unitPrice|null, sourceItem, masterCategory, masterQtyUnit,
│                                priceSource, matchStatus, mappingNote, isPriced }
├── pricingMaster { library[], gaps[][], methodology[][] }
└── reference     { ground_transport[][], domestic_flights[], notes[] }
```

`unitPrice: null` + `isPriced: false` is the single, explicit signal for an
unpriced item everywhere in the app.

State lives in a small **Zustand** store (`src/lib/store.ts`). It keeps the
catalog plus a `selections` map (`itemId → { qty, customPrice?, note? }`);
presence in the map means "selected". Only user-authored state is persisted.

---

## 3) Pricing logic

All math is centralized in `src/lib/pricing.ts` — one source of truth:

```
Base Cost  = Qty × Unit Price
Fee (15%)  = Base Cost × 0.15
Total Cost = Base Cost + Fee
```

- **Section totals** and the **grand total** sum the Base / Fee / Total of every
  selected, priced line (`sumLines`).
- **Unpriced items** contribute **0** and are excluded from totals. They stay
  visible and flagged. A user can type a **custom price** in the section view —
  that override promotes the line into the totals (shown as a `custom` badge and
  logged in the export).
- Effective unit price = `customPrice ?? unitPrice` (`effectiveUnitPrice`).

---

## 4) How export works

`src/lib/excelExport.ts` (ExcelJS, lazy-loaded on click) builds a styled,
brand-coloured workbook and triggers a download —
`TAM_Budget_<title>_<date>.xlsx`:

- **Sheet 1 · Budget Summary** — title, export date, currency, fee rate, grand
  totals (Base / Fees / Grand), and per-section breakdown.
- **Sheet 2 · Selected Items** — Main Section, Sub-Category, Item, Type, Qty,
  Unit Price, Base Cost, Fee (15%), Total Cost, Price Source, Match, Notes —
  with a totals footer. Custom-priced lines are visually flagged.
- **Sheet 3 · Unpriced Items** — selected lines still missing a price, with the
  reason / mapping note (never counted in totals).
- **Sheet 4 · Source Reference** — Source Item, Master Category, Master Qty Unit,
  Basis, Price Source, Match, Mapping Note for full provenance.

---

## Tech stack & structure

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** with the TAM brand palette baked into `tailwind.config.js`
  (deep navy background, dark-purple surfaces, electric-purple primary, gold
  accents, brand gradient, soft 16px radii, diamond markers).
- **Zustand** for state (with `localStorage` persistence).
- **ExcelJS** for import + export (code-split into its own chunk).
- **lucide-react** for thin line icons.
- No component-library dependency — clean, self-contained brand components live
  in `src/components/ui.tsx`.

```
src/
├── App.tsx                 # shell: top bar, routing, sticky budget bar
├── data/scopeData.json     # generated catalog (source of truth at runtime)
├── data/researchPricing.ts # benchmark flight + transport prices (layered on)
├── components/             # ui primitives, KPI cards, item row, chart, accordion, logo
├── screens/                # Dashboard (single-page builder), BudgetSummary, Admin
└── lib/                    # types, store, pricing, enrich, format, excelImport/Export, useTotals
scripts/
├── parse_excel.py          # build-time workbook → JSON parser
└── test_export.mts         # export smoke test (npx tsx)
```

### Notes

- **RTL / Arabic:** the font stack leads with *Helvetica Neue LT Arabic* and
  falls back to IBM Plex Sans Arabic / Noto Sans Arabic; numbers are pinned LTR
  with tabular figures for clean price columns. A language field exists in the
  store as the hook for a full Arabic/English toggle.
- The 15% fee rate is defined once (`FEE_RATE` in `src/lib/format.ts`).
