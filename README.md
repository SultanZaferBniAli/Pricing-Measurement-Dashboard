# TAM Pricing Platform

AI-assisted RFP pricing for TAM Development Company. Engagement managers and the
BD team describe a scope (or attach parts of an RFP); the pricing analyst breaks
it into priceable items and prices each one from TAM's price database, then from
similar past projects, then by benchmark, labelling every line with where its
price came from. Users can still pick lines from the catalog by hand, and every
figure can be edited before the budget is saved or exported.

This is the **developer version**: it runs locally with your own Anthropic API
key, a JSON-file database, and seeded accounts.

## Run locally

```bash
npm install
npm run db:seed        # optional: rebuilds server/db/seed/catalog.json from the MCB workbooks (needs python3 + openpyxl)
cp .env.example .env   # then set ANTHROPIC_API_KEY, or add it later from Admin > Developer settings
npm run dev            # web on http://localhost:5183, API on http://localhost:8787
```

Sign in with the seeded accounts (change them in `.env`):

| Account | Password | Role |
| --- | --- | --- |
| admin@tamhub.com | admin12345 | admin |
| user@tamhub.com | user12345 | user |

Without an API key the app still works for the manual catalog. To exercise the AI
flow without spending tokens, start the API with `LLM_PROVIDER=mock`.

## The flow

1. **New budget** asks for the project information first: title, client, type, dates, location, description, RFP reference.
2. **Pricing workspace** has two modes. *AI pricing*: describe the scope or attach RFP files (PDF, DOCX, XLSX, TXT), watch the four steps run live, then edit quantities and prices in the priced-items table. *Catalog*: tick lines from the priced catalog.
3. **Review budget** shows every line with the 15% fee and 15% VAT applied, then **Save to platform** (which also records every priced line as a price observation for future estimates) or **Export to Excel**.
4. **Admin** shows who used the dashboard and what they priced, manages accounts, holds the Claude connection, and the price-database re-upload.

## The AI process

| Step | What the model does | What the user sees |
| --- | --- | --- |
| 1 Analyse | Reads the brief, the scope and the attachments | A note on what the scope asks for |
| 2 Break down | Calls `propose_wbs` with the smallest priceable items, each with its evidence in the scope | The work breakdown, with quantities and evidence |
| 3 Price | For each item: `search_price_database`, then `search_past_projects`, then `benchmarks_on_file` and web search | Every search and its results, live |
| 4 Present | Calls `submit_pricing` with the full list | The priced table, each row labelled *database*, *similar project* or *benchmark*, with a rationale |

Follow-up messages continue the same conversation; the model resubmits the
whole list when something changes.

## Layout

```
server/            Express API (TypeScript, run with tsx)
  config.ts        env validation (zod)
  auth.ts          sessions, seeded users, TAM-domain check
  db/store.ts      JSON-file database (swap target: Postgres)
  db/seed/         catalog.json built by scripts/build_db.py
  pricing/         catalog search, tools, prompts, the streaming pipeline, the mock
  routes/          auth, catalog, ai (SSE), budgets, admin, dev
src/               React app (Vite, Tailwind, Zustand)
scripts/build_db.py  reads the MCB Initiative workbooks into the seed
```

## Configuration

See `.env.example`. Key settings: `ANTHROPIC_API_KEY`, `LLM_PROVIDER`
(`anthropic` or `mock`), `LLM_MODEL`, `LLM_EFFORT`, `LLM_WEB_SEARCH`,
`SEED_USERS`, `ALLOWED_EMAIL_DOMAINS`, `DATA_DIR`.

## Before release

- Replace the JSON store with Postgres behind the same `collection()` interface.
- Put the API behind TAM's identity provider (OIDC) instead of seeded passwords.
- Move the API key to the organisation's Anthropic account and keep it server-side only.
- Containerise per the Dokploy conventions in `VibeCodersGonnaVibeCode.md`.
