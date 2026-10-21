# Handover: TAM Pricing Platform

Written 21 October 2026 for whoever picks this up next. The previous owner is Abdullah Alomerene (a.alomerene@tamhub.com). Everything below is in this repository unless stated.

## 1. What this is

An internal web app for TAM's engagement managers and BD team. A user enters a project brief, then either describes a scope of work (or attaches RFP files and screenshots) and lets the AI analyst price it, or picks lines from a catalog by hand. The analyst works in four visible steps: analyse the scope, break it into priceable items, price each item from TAM's price database first, then from similar past projects, then by benchmark, and present the list with every line labelled by its source and a confidence score. Users edit any quantity or price, review with the 15% fee and 15% VAT applied, save to the platform (which feeds the price history for future estimates) or export to Excel. Admins see who priced what, manage accounts, and hold the Claude connection.

The business context (why TAM needs it, the fee rules found in TAM's budgets, the data sources) is in `docs/UNDERSTANDING.md`.

## 2. Status on handover

| Item | State |
| --- | --- |
| App (frontend + API) | Complete for a first release; runs locally |
| Google sign-in, roles, admin usage view | Done and tested with a real tamhub.com account |
| Price database seed (189 master items, 388 vendor lines, 542 media rates, 55 past-project lines) | Built and committed |
| Postgres backend + migrations + Docker/Dokploy packaging | Done, tested against an in-process Postgres; **not yet run on a real server** |
| Deployment to `pricing.tamhub.com` | **Pending with engineering.** They need the settings in `DEPLOYMENT.md` and three secrets (section 6) |
| Explainer video on the home page | Done (`public/explainer.mp4`); the production pipeline is in `docs/video/` |
| Repository | `https://github.com/tamhub-vc/pricing-platform`, branch `main` |

## 3. Access you need

- **GitHub:** push access to `tamhub-vc/pricing-platform`. The TAM engineering team grants it.
- **Anthropic console** (console.anthropic.com): to create or rotate the API key the app uses. For production, use TAM's organisation key, not a personal one, and set a monthly spend limit there.
- **Google Cloud project `daily-log-493813`:** the OAuth client for sign-in. Engineering created it. The downloaded `client_secret_….json` goes to `server/data/google-client.json` locally (git-ignored). Production needs the production origin and callback added to that client (section 6).
- **Dokploy:** engineering's deployment console; you only need it to read logs and change environment values.
- **The source workbooks** (the "MCB Initiative" folder on Abdullah's Mac): only needed to rebuild the price seed. The built seed is already committed.
- **Higgsfield** (optional): only for upgrading the explainer video's voice or shots.

## 4. Run it locally

```bash
git clone https://github.com/tamhub-vc/pricing-platform.git
cd pricing-platform
npm install
cp .env.example .env     # then edit: ANTHROPIC_API_KEY, SEED_USERS, ADMIN_EMAILS
npm run dev              # web http://localhost:5183, API http://localhost:8787
```

- Without `DATABASE_URL` the API uses a JSON file at `server/data/db.json`. That is fine on a laptop. Delete the file to start clean; seeded accounts are recreated on the next start.
- Sign in with a seeded account from `SEED_USERS` (default `admin@tamhub.com` / `admin12345`) or with Google if `server/data/google-client.json` is present and your email domain is `tamhub.com`.
- Add the Anthropic key in `.env` or in the app under Admin, Developer settings (it is verified against the API and written to `.env`).
- To work on the UI without spending tokens: `LLM_PROVIDER=mock` runs the whole pipeline with a fake analyst.
- `npm run typecheck` before committing; `npm run build` must pass (the Dockerfile runs it).

## 5. How to change the usual things

**The AI model, effort, web search.** `.env`: `LLM_MODEL` (default `claude-sonnet-5-5`), `LLM_MODEL_OPTIONS` (what the per-run picker offers), `LLM_EFFORT` (`medium`), `LLM_WEB_SEARCH`, `LLM_MAX_WEB_SEARCHES` (3). The API reads them at start. Model IDs come from Anthropic's model list; the app was last verified with Sonnet 5.5 and Opus 5.5.

**What the analyst is told.** `server/pricing/prompts.ts` (system prompt and the first user message). Keep the four steps, the three labels and the "no invented prices" rule. Tool definitions and what they return are in `server/pricing/tools.ts`; keep tool results short, since they are re-sent every turn (cached, but still). The streaming loop, caching and event protocol are in `server/pricing/pipeline.ts`.

**The price database.** The AI searches `server/db/seed/catalog.json` (read-only) plus the `observations` collection (lines learned from saved budgets). To refresh the seed from new workbooks: put them in the parent folder and run `npm run db:seed` (needs `python3` with `openpyxl`). To add a vendor card, add it to `MCB_Pricing_Consolidation_V1.xlsx` sheet 3 and rebuild, or extend `scripts/build_db.py`. Search is lexical with a synonym table in `server/pricing/catalog.ts`; add synonyms there when the analyst misses obvious matches.

**The live database.** Two backends behind one interface (`server/db/store.ts`). Locally JSON; on the server Postgres via `DATABASE_URL`. Schema is `server/db/schema.ts` (one table per collection, JSONB documents); change it, then `npm run db:migrate:generate` writes a migration under `server/db/migrations/`, which runs automatically on the next start. `npm run db:test` checks the backend. `npm run db:import` copies a local `db.json` into Postgres once.

**Accounts and admins.** Google sign-in accepts verified `tamhub.com` accounts only (`ALLOWED_EMAIL_DOMAINS`). First admins come from `ADMIN_EMAILS`; after that, Admin, Users: change roles, pre-register a colleague by email with a role, or add a password account. `AUTH_PASSWORD_LOGIN=false` turns the password form off (do this in production).

**The look.** Colours, fonts and radii are tokens in `src/index.css` and `tailwind.config.js`; components use token classes (`bg-surface`, `text-ink-2`, `rounded-card`). Light and dark are the same names with different values. Buttons and cards are in `src/components/ui.tsx`; panels and KPI tiles in `src/components/dashboard.tsx`; the gliding selection highlight in `src/components/SlidingHighlight.tsx`. The current direction is Apple-style: system font, neutral grounds, translucent layered cards, pill buttons, 44px targets, spring easing.

**Text.** `src/lib/i18n.ts` holds every string in English and Arabic. Add a key to both; the build fails otherwise. Catalog item names are deliberately not translated.

**The explainer video.** `docs/video/` contains everything: `explainer-v2.src.html` (the animatic, a web page), `narration.json` (the voice lines), `narrate.py` (voice generation), `align.py` (word timestamps), `sfx.py` (sound design and music, synthesised), `record.mjs` (records the page in headless Chrome and mixes the audio), `SCRIPT.md` (the shot list for a studio production). Rendering needs: Google Chrome, `ffmpeg` and `espeak-ng` (Homebrew), Python 3.12 with `kokoro-onnx soundfile vosk` in a virtualenv plus the Kokoro model files (`kokoro-v1.0.onnx`, `voices-v1.0.bin` from the kokoro-onnx GitHub releases) and the Vosk small English model. Then:

```bash
export PHONEMIZER_ESPEAK_LIBRARY=/opt/homebrew/lib/libespeak-ng.1.dylib
python narrate.py af_heart docs/video/build/vo docs/video/narration.json   # from the folder holding the model files
SFX_PYTHON=<venv>/bin/python VOSK_MODEL=<path to vosk model> node docs/video/record.mjs
cp docs/video/TAM-Pricing-Dashboard-Explainer.mp4 public/explainer.mp4     # after re-encoding for size if needed
```

A better voice (ElevenLabs through Higgsfield) is a drop-in: generate the 11 lines in `docs/video/VOICE-SCRIPT.txt` as `s0`…`s10` files into `docs/video/build/vo/` and run the recorder; the cut re-times itself.

## 6. Going live (what engineering still needs)

Everything is in `DEPLOYMENT.md`. In short: a Dokploy Compose service from the repository, the domain `pricing.tamhub.com` on the `app` service, the environment values, and a deploy. Three secrets must reach them through a secure channel, never in chat or git:

1. TAM's organisation Anthropic API key.
2. The Google OAuth client ID and secret (`server/data/google-client.json` has both).
3. The first admin email for `ADMIN_EMAILS`.

They also add `https://pricing.tamhub.com` and `https://pricing.tamhub.com/api/auth/google/callback` to the Google OAuth client, and set `AUTH_PASSWORD_LOGIN=false`. After the first deploy: sign in with Google, open Admin, Developer settings to confirm the key, price one small scope, then announce.

Day to day after launch: work locally, commit, `git push tam main` (or `origin`, depending on how you cloned). Dokploy redeploys from `main`.

## 7. Known limits and a backlog

- 147 catalog items still have no TAM price and 33 have vendor quotes that disagree by more than 10% (see the consolidation workbook, sheet 4). The analyst benchmarks these and labels them; closing them improves confidence scores.
- The past-project search is lexical. It finds exact and synonym matches, not meaning; the analyst compensates by searching several phrasings.
- An AI conversation's chat history is not persisted in the browser across a page refresh (the priced lines are). The server keeps the full conversation.
- Images attached to the analyst are limited to 5 MB each; scanned PDFs without a text layer come through empty, so attach them as screenshots.
- `tsx` runs the TypeScript server inside the container rather than a precompiled build; fine, but noted in `DEPLOYMENT.md` as a deliberate exception.
- The explainer's cloud dive and dashboard scenes are animatic renders. For a studio-grade cut, follow `docs/video/SCRIPT.md` (Google Earth Studio dive, real screen captures, recorded voice).
- The old GitHub Pages workflow was removed; the app needs a server now.

## 8. Decisions worth knowing

- **Why an API key and not the Claude desktop login:** Anthropic does not allow claude.ai subscription logins inside third-party apps. The app calls the Claude API with a key.
- **Why Sonnet by default:** an early Opus run on a 123,000-character RFP cost $11 because the conversation was not cached. Caching was fixed (uncached input per turn dropped to a few tokens), Sonnet became the default and Opus a per-run option; the same run now costs about a dollar.
- **Why a JSON database exists at all:** so a laptop runs the app with no setup. Production uses Postgres through the same interface.
- **Why budgets only "teach" the analyst when saved:** only figures someone stood behind should influence future estimates, not every draft.
