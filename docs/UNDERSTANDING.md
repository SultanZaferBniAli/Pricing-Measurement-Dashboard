# What the MCB Initiative folder says, and how the platform uses it

Written 7 Oct 2026 from every file in the folder. This is the reading that the
pricing platform is built on.

## The business problem

TAM Development Company (Riyadh) wins and delivers programs for government and
cultural clients: awards (the Annual Cultural & Education Awards), training
(Culinary Saudization Program for the Culinary Arts Commission), creative
programs (Filmmakers S5, Kader 2, Angham Alwatan for the Ministry of Culture).
Most of the delivery cost is bought from third parties: event production,
logistics and travel, marketing and media, video production, trainers and
platforms.

The MCB (Mass Capability Building) domain's 2026 plan has four initiatives;
this platform serves two of them directly:

- **Initiative 1, Protect the Core:** reduce delivery cost by 7% (4% in Q1, 7%
  by Q2). The playbook's third-party lever is "benchmark against previous
  engagements and desktop research, allocate a leaner third-party budget than
  the sales budget, and set budget caps". That is exactly what the pricing
  platform automates.
- **Initiative 3, Win rate / productization:** 48% of 29 lost RFPs were lost on
  price and positioning. Pricing from a shared database instead of from scratch
  is the "productized bid".

The MoU drafts (events management, marketing, video production) are the
"sustainable" lever: fixed rate cards with multi-service vendors. The vendor
price cards in the Pricing folder are those rate cards.

## The pricing rules TAM already uses

Read from the budget workbooks (Culinary V7, Filmmakers S5) and the dashboard:

| Rule | Value | Where it comes from |
| --- | --- | --- |
| Vendor management fee on third parties | 15% (18.5% on Filmmakers S5) | Budget cover pages and Third Party sheets |
| Fund / grant management fee | 10% | Culinary budget |
| VAT | 15% on everything | Price Breakdown sheets |
| Risk / contingency | 1% (Filmmakers), 0% (Culinary) | Sales Price Break Down |
| Dashboard chain | Base = Qty x Unit, fee 15%, VAT 15% on subtotal | Build record |
| Threelines pass-through items | cost + 15% | Threelines card |
| Guru fees management | 25% of managed cost | Guru V2 card |
| Discounts | CEO approval | Cover page |

The platform keeps the dashboard chain (base, 15% fee, 15% VAT) and never puts
fee or VAT into a unit price.

## The price data

| Source | Lines | What it is |
| --- | --- | --- |
| Pricing_Master_Consolidated.xlsx | 189 items, 157 priced | TAM's master price list with a Price Source column (Threelines, TAM, Pricing_V1) |
| Scope_of_Work_Tracker.xlsx + dashboard catalog | 116 items (103 base + 13 transport), 79 priced | The awards-program scope the manual builder uses |
| Threelines PDF, Guru V2, Zebra, Tura | 388 vendor lines, 251 with a fixed price | Vendor rate cards, matched to the master by item key |
| Veyron 16.06.2026 | 620 lines (542 real prices, 71 placeholders) | Out-of-home and digital media rates by city, in Arabic |
| Culinary V7 / Abid approval, Filmmakers S5 | 55 third-party lines | What TAM actually budgeted on past projects, with implied unit prices |
| Flight's Exercise, Riyadh drivers | benchmarks | International business/first fares by country, lounges, cars, escorts |
| MCB_Pricing_Consolidation_V1.xlsx | all of the above, cross-checked | 147 items still needing a price, 33 where vendors differ by more than 10% |

`scripts/build_db.py` reads these into `server/db/seed/catalog.json`. The AI
searches that file plus every budget saved in the app.

## What the existing dashboard did, and what was kept

The GitHub Pages dashboard (React, Vite, Tailwind, Zustand, ExcelJS) was a
catalog picker: tick lines, set quantities, export to Excel, with provenance on
every figure and a lexical RFP check. Everything lived in one browser's local
storage. All of it is kept: the catalog builder is the "Catalog" mode of the new
workspace, the review page and Excel export are extended with the AI lines, the
design tokens, light/dark themes and Arabic RTL are unchanged.

## What was added

1. **A server** (Express, TypeScript) with a JSON-file database, sessions and
   roles. The interface is small on purpose so Postgres can replace it.
2. **The AI pricing analyst** (Claude, via the Anthropic API): four steps,
   tools over the price database, past projects and benchmarks, web search for
   benchmarks, every line labelled *database* / *similar project* /
   *benchmark*, every search and note streamed to the user as it happens.
3. **The new flow**: New budget asks for project information first; the
   workspace offers AI pricing beside the catalog; review, save, export.
4. **Learning**: saving a budget records every priced line as a price
   observation, which the analyst finds on the next similar project.
5. **Accounts and admin**: TAM-domain accounts, user and admin roles, a usage
   view of who priced what, and the developer connection to Claude.

## What is deliberately not done yet

- Postgres and migrations (the JSON store is the developer version).
- TAM's identity provider (seeded passwords for now).
- The organisation's API key (the developer key sits in the local .env).
- Docker / Dokploy packaging per VibeCodersGonnaVibeCode.md.
- Closing the 147 price gaps and the 33 vendor disagreements in the data.
