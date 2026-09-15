# TAM · Scope-Based Budget Builder

An internal **Pricing Measurement Dashboard** for **TAM Development Company (شركة تام التنموية)**.
It turns TAM's priced scope-of-work spreadsheets into a point-and-click budgeting
tool: browse pricing by department, select the items you need, adjust quantities,
apply the standard **15% fee**, watch section and grand totals update live, and
export a clean, client-ready Excel workbook.

Built for non-technical users, so you never have to open the source spreadsheets.

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

Requires Node 18+. Python 3 with `openpyxl` is only needed if you want to
**re-generate** the bundled data from the source workbooks (see below).

---

## What's in the box

A persistent **sidebar** (right-hand side in Arabic) holds navigation, the
budgets you have already exported, and the running grand total. An **English /
Arabic** toggle sits in its footer.

| View | What it does |
| --- | --- |
| **Overview** | The builder. The four departments sit side by side as **tabs**, and only the chosen one's items are on screen, so picking items in Logistics never means scrolling past everything in Marketing. Each tab carries its own selected count and subtotal. Above them: a stacked bar showing how the budget splits across sections, and a search / filter row that applies to every section. |
| **Vendors** | Who stands behind the prices. A card per supplier, with its logo; open one to see exactly which selected lines it prices. Leads with how much of the budget was quoted versus assumed. |
| **Budget** | The project brief, the RFP check, then every selected line grouped by section with its own subtotal: editable quantity, optional per-line note, remove button, **Export to Excel**, and Print. |
| **Admin** | Drag-and-drop re-upload of an updated `Scope_of_Work_Priced_QTY.xlsx` to re-parse the catalog at runtime. |

There is no "Budget" nav item: the sidebar's **Review budget** button already
goes there. The running Base / Fees / Grand total appears exactly once, in the
sidebar, and nowhere else on the page.

Quantities use a stepper that is still a real text field, so 100 is one
keystroke rather than a hundred clicks, and clicking anywhere on a line toggles
it rather than only its checkbox.

Selections, the brief, the language and the exported-budget history persist to
`localStorage`, so a work-in-progress budget survives a refresh.

### Exported budgets

Exporting to Excel files the budget in the sidebar under its title, with its
client, date and grand total. Clicking one loads it back, selections and all, so
a past budget can be reopened and revised rather than rebuilt. Re-exporting the
same title replaces that entry instead of piling up near-identical rows, the list
caps at 30, and deleting asks for a second click.

### Project brief and the RFP check

The Budget view opens with a **project brief**: project / RFP, client, established
date, and a short description of the project. All of it persists and all of it
lands on the export's summary sheet.

Below that sits **Check against the RFP** (`src/lib/rfp.ts` + `components/RfpCheck.tsx`).
Drop in the RFP as PDF, Word, or plain text; it extracts the text in the browser
and compares it against all 116 catalog lines, then proposes two lists: lines the
RFP asks for that are not in the budget, and selected lines the RFP never
mentions.

**What it is, precisely.** A rules-based first pass, not comprehension. It scores
each item on how much of *its own name* appears in the RFP. Category words
(sub-category, master category) deliberately count for almost nothing on their
own, because "accommodation" appearing in an RFP is not evidence that it asked
for glamping. Every suggestion shows the exact terms it found, so a wrong call
takes a second to spot, and nothing is applied until you accept it line by line.
It cannot read intent, negation, or anything implied rather than written.

The RFP never leaves the machine: extraction and matching both run in the browser,
with pdf.js and JSZip lazy-loaded only when a PDF or .docx is opened.

**Swapping in a model.** `analyseRfp` is the only entry point the UI calls and
`ScopeSuggestion` the only shape it returns, so a model-backed implementation
needs to satisfy that signature and nothing else. It would need a backend to hold
the API key, and a decision that confidential client RFPs may leave TAM's network.
Whatever the engine, keep `matchedTerms` populated: a suggestion nobody can check
is a suggestion nobody should trust.

### Vendors

The question this page answers is the one a client asks: how much of this number
did somebody quote us, and how much did we assume? It leads with that split, then
gives each supplier a card. Open a card to see exactly which of your selected
lines it prices, grouped by section, with quantities and line totals.

The split comes from `priceSource`, mapped in `src/data/vendors.ts`:

- **Quoted** - TAM (in-house rate card), Threelines (contracted supplier),
  Pricing_V1 (an earlier internal list). A named party is answerable for these.
- **Assumed** - Research (benchmark figures from the travel and transport
  studies), Derived (composed from Pricing Master rows), and anything the scope
  file left without a source. Nobody has quoted these, and the page says so.

**Adding a vendor logo.** Drop the file at `public/vendors/<name>.png` and point
`VENDORS[].logo` at it. Without a file the card falls back to the vendor's
initials, so a missing logo is never a broken image. TAM uses the existing
`public/tam-logo.webp`.

There are no contract, contact or discount fields, because that data exists in
none of the source workbooks.

### Arabic / RTL

The toggle in the top bar switches the whole interface between English and
Arabic and mirrors the layout (it sets `lang` and `dir` on the document, and the
components use logical `start` / `end` utilities rather than left / right).
Strings live in `src/lib/i18n.ts`, where `en` is the source of truth and
TypeScript requires `ar` to cover exactly the same keys.

Translated: all interface chrome, the four section names, the 17 sub-categories,
the pricing bases, the match statuses and the price sources. **Not** translated:
individual line-item names. Those are the wording of the signed scope of work,
and a paraphrase in a client-facing budget would be a liability, so they stay in
English in both languages.

Figures stay in Western digits and read left-to-right in both languages (the
`.num` class pins their direction), which is the convention for Saudi commercial
documents. In Arabic the number columns align to the left edge of the row, which
is the end of the line in RTL.

### Research pricing (flights & ground transport)

The source scope file intentionally left flights and detailed transport
**unpriced**. TAM's separate research workbooks do have benchmark figures, so a
thin enrichment layer (`src/data/researchPricing.ts` + `src/lib/enrich.ts`)
applies them on top of the catalog at load time, flagged with the **`Research`**
price source so they stay visually distinct from TAM / Threelines master prices:

- **Flights.** Real prices filled into the existing flight lines by class:
  domestic Economy (521) and Business (1,408) as one-way averages from Riyadh;
  international Business (22,222) and First (46,750) as round-trip averages. Each
  keeps its price range in the note. Lines with no benchmark data (domestic
  First, international Economy / Premium Economy) stay unpriced.
- **Ground transport.** Real, selectable options added to Logistics: a
  **Car with Driver (Chauffeur)** group (standard / executive / luxury sedan,
  SUV, van, minibus by duration) and a **Car Rental (Monthly)** group, from the
  Riyadh car-with-driver study.

### Derived pricing and contingencies

Three further lines the source left unpriced are now priced by **summing real
Pricing Master rows**, flagged with a **`Derived`** price source, with the
components written into the mapping note so the arithmetic can be checked
against the workbook (`src/data/derivedPricing.ts`):

- **Main stage build & layout** (16,000) = podium 3,500 + rigging 3,000 +
  flooring 5,500 + panels 4,000.
- **Technical, security & cleaning teams** (5,030) = technical support 3,500 +
  security guards 980 + cleaning staff 550.
- **Printed materials for trips & closing event** (14 per attendee) = printed
  agendas 6 + folders 8.

The first two formulas are taken verbatim from the scope file's own mapping
note. **Airport lounge access** (7,000) also comes in as a `Research` price,
from the international flight study.

The two **contingency** lines are a percentage of a subtotal rather than a unit
rate, so they no longer carry a unit price at all. "Additional transfer
contingencies" charges against the Logistics section base, "Operational
contingency reserve" against the whole budget base. You set the rate; no default
is supplied, because no benchmark for one exists, so the line stays excluded
from totals until you enter one. A contingency never charges against another
contingency.

This enrichment runs for both the bundled data and any admin re-upload, so they
behave identically. After enrichment the catalog holds **116 lines, 79 priced,
37 unpriced**.

The remaining 37 have no figure in any source file (hotels, visas, permits,
insurance, entrance gates, animation), and are deliberately left unpriced rather
than guessed. Enter a custom price per line when you have a quote.

---

## 1) File ingestion

The source workbooks live one directory up (the shared *Initiative - Pricing*
folder). They are parsed **at build time** into a single normalized JSON file
that ships with the app, so the dashboard loads instantly with no upload step.

```
scripts/parse_excel.py   ->   src/data/scopeData.json
```

Re-generate after the spreadsheets change:

```bash
python scripts/parse_excel.py
```

Sources and how each is used:

- **`Scope_of_Work_Priced_QTY.xlsx`** is the operational source of truth. It
  drives every section, sub-category, line item, price, and all mapping metadata.
- **`Pricing_Master_Annotated.xlsx`** is the *Items & Pricing* reference library
  plus *Methodology* and *Gaps & Data Issues*, carried along as supporting data.
- **`Domestic Exercise.xlsx`** and **`Riyadh_Driver_Prices.xlsx`** are the travel
  and ground-transport benchmarks used by the research-pricing layer above.

**Runtime re-upload:** the Admin screen re-parses an uploaded Scope of Work file
in the browser via `src/lib/excelImport.ts`, which mirrors the Python parser
exactly (same section detection, same unpriced rules).

### Parsing rules

- Section headers detected: `MARKETING`, `EVENT MANAGEMENT`, `LOGISTICS`,
  `VIDEO PRODUCTIONS`.
- A *Main Item* value marks a sub-category (it may share a row with the first
  item of that group); the *Sub-Item* column is the item name.
- Subtotal, grand-total, "How to use", and mapping-summary rows are ignored.
- Rows marked `NOT IN MASTER`, `GAP`, or with an empty price are kept but flagged
  **unpriced**. No price is ever invented.

The raw parse reconciles to the source's own mapping summary: **103 scope lines,
58 priced, 45 unpriced** across 4 sections, before the research-pricing layer is
applied.

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

`unitPrice: null` plus `isPriced: false` is the single, explicit signal for an
unpriced item everywhere in the app.

State lives in a small **Zustand** store (`src/lib/store.ts`). It keeps the
catalog plus a `selections` map (`itemId -> { qty, customPrice?, note? }`);
presence in the map means "selected". Only user-authored state is persisted.

---

## 3) Pricing logic

All math is centralized in `src/lib/pricing.ts`, one source of truth:

```
Base Cost  = Qty * Unit Price
Fee (15%)  = Base Cost * 0.15
Total Cost = Base Cost + Fee
```

- **Section totals** and the **grand total** sum the Base / Fee / Total of every
  selected, priced line (`sumLines`).
- **Unpriced items** contribute **0** and are excluded from totals. They stay
  visible and flagged. A user can type a **custom price**, and that override
  promotes the line into the totals (shown as a `custom` badge and logged in the
  export).
- Effective unit price = `customPrice ?? unitPrice` (`effectiveUnitPrice`).
- **Contingency lines** are the one exception to `Base = Qty * Unit Price`. They
  charge `rate% * (a subtotal of the other selected lines)` instead, so the
  budget is resolved in **two passes** (`resolveBudget`): every ordinary line
  first, then the contingencies against the priced base of that first pass. The
  15% fee applies to the result as normal.

---

## 4) How export works

`src/lib/excelExport.ts` (ExcelJS, lazy-loaded on click) builds a styled,
brand-coloured workbook and triggers a download named
`TAM_Budget_<title>_<date>.xlsx`:

- **Sheet 1 · Budget Summary:** title, export date, currency, fee rate, grand
  totals (Base / Fees / Grand), and per-section breakdown.
- **Sheet 2 · Selected Items:** Main Section, Sub-Category, Item, Type, Qty, Unit
  Price, Base Cost, Fee (15%), Total Cost, Price Source, Match, Notes, with a
  totals footer. Custom-priced lines are visually flagged.
- **Sheet 3 · Unpriced Items:** selected lines still missing a price, with the
  reason / mapping note (never counted in totals).
- **Sheet 4 · Source Reference:** Source Item, Master Category, Master Qty Unit,
  Basis, Price Source, Match, Mapping Note for full provenance.

---

## Tech stack & structure

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** with the TAM brand palette baked into `tailwind.config.js`
  (deep navy background, dark-purple surfaces, electric-purple primary, gold
  accents, brand gradient, soft 16px radii, diamond markers).
- **Zustand** for state (with `localStorage` persistence).
- **ExcelJS** for import and export (code-split into its own chunk).
- **lucide-react** for thin line icons.
- No component-library dependency; clean, self-contained brand components live in
  `src/components/ui.tsx`.

```
src/
├── App.tsx                 # shell: top bar, view routing, sticky budget bar
├── data/scopeData.json     # generated catalog (source of truth at runtime)
├── data/researchPricing.ts # benchmark flight + transport prices (layered on)
├── data/derivedPricing.ts  # composites from master rows + contingency bases
├── components/             # ui primitives, KPI cards, item row, chart, accordion, logo
├── screens/                # Dashboard (builder), BudgetSummary, Admin
└── lib/                    # types, store, pricing, enrich, i18n, format, excelImport/Export, useTotals
scripts/
├── parse_excel.py          # build-time workbook to JSON parser
└── test_export.mts         # export smoke test (npx tsx)
```

### Notes

- **RTL / Arabic:** the font stack leads with *Helvetica Neue LT Arabic* and
  falls back to IBM Plex Sans Arabic / Noto Sans Arabic; numbers are pinned LTR
  with tabular figures for clean price columns. A language field exists in the
  store as the hook for a full Arabic / English toggle.
- The 15% fee rate is defined once (`FEE_RATE` in `src/lib/format.ts`).
```
