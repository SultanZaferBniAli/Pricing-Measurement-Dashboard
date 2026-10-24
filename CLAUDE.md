# TAM Pricing Platform — working notes for Claude

Read `docs/HANDOVER.md` first: it explains what this is, how to run it, where everything lives and what is pending.

## Rules that must hold

- **No invented prices.** Every price in the app traces to the price database, a past project, or a benchmark the AI labels as such. The labels (database / similar project / benchmark) are a product feature, not decoration.
- **Pricing chain:** base = qty × unit price, TAM fee 15%, VAT 15% on the subtotal. Unit prices exclude both. See `src/lib/pricing.ts`.
- **Cost discipline on the Claude API.** Keep the moving cache breakpoint in `server/pricing/pipeline.ts` (`moveCacheBreakpoint`), keep tool results short, keep web search capped. Sonnet 5.5 is the default model; Opus is a per-run option. A run should cost cents, not dollars.
- **Secrets never enter git.** `.env`, `server/data/` (database, Google client file) are ignored. Keys go in `.env` locally and in Dokploy's Environment tab in production.
- **Both languages.** Every UI string lives in `src/lib/i18n.ts` in `en` and `ar`; TypeScript fails if one is missing. Layout uses logical properties (`ps-`, `pe-`, `start-`, `end-`).
- **Both themes.** Colours come from tokens in `src/index.css`; never hard-code a colour in a component.
- **Commits** end with `Co-Authored-By: Claude <model> <noreply@anthropic.com>`. Push to the `tam` remote (`git push tam main`); the live server deploys from that branch.

## Commands

```bash
npm run dev          # web on :5183, API on :8787 (JSON database, no Postgres needed)
npm run typecheck    # frontend + server
npm run build        # production web build
npm run db:test      # exercises the Postgres backend against an in-process Postgres
npm run db:seed      # rebuilds server/db/seed/catalog.json from the MCB workbooks (needs the workbooks + python3 openpyxl)
LLM_PROVIDER=mock npm run dev:api   # AI pipeline without a model, for UI work
```

## Where things are

| Area | Path |
| --- | --- |
| AI analyst: prompt, tools, streaming loop | `server/pricing/prompts.ts`, `tools.ts`, `pipeline.ts` |
| Price database search | `server/pricing/catalog.ts`, seed in `server/db/seed/catalog.json` |
| Storage (JSON file or Postgres) | `server/db/store.ts`, `json.ts`, `postgres.ts`, `schema.ts`, `migrations/` |
| Accounts, Google sign-in, roles | `server/auth.ts`, `server/routes/auth.ts` |
| API routes | `server/routes/*.ts` |
| Frontend state | `src/lib/store.ts`, totals in `src/lib/useTotals.ts` |
| Screens | `src/screens/*.tsx`; the AI workspace is `PricingWorkspace.tsx` |
| Design tokens | `src/index.css`, `tailwind.config.js` |
| Deployment | `Dockerfile`, `docker-compose.yml`, `DEPLOYMENT.md` |
| Explainer video pipeline | `docs/video/` (see HANDOVER for the tooling it needs) |
