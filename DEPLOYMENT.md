# Deployment

**App:** TAM Pricing Platform. AI-assisted RFP pricing for TAM's engagement managers and BD team.
**Owner:** Abdullah Alomerene (a.alomerene@tamhub.com).

## Services

| Service | Image / build | Internal port | Domain |
| --- | --- | --- | --- |
| `app` | built from `Dockerfile` (node 22 alpine, runs as `node`) | 8787 | yes: point the Dokploy domain at `app:8787` |
| `db` | `postgres:17.6-alpine` | 5432 | no |

Migrations run automatically when `app` starts (Drizzle, `server/db/migrations`). No manual SQL.

## Environment variables (Dokploy Environment tab)

| Variable | Secret | Description |
| --- | --- | --- |
| `SESSION_SECRET` | secret | Long random string that signs session cookies |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | secret | Database credentials; compose derives `DATABASE_URL` from them |
| `ANTHROPIC_API_KEY` | secret | TAM's organisation key from console.anthropic.com |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | secret | From the Google Cloud OAuth client (web application, Internal) |
| `GOOGLE_REDIRECT_URI` | no | `https://<domain>/api/auth/google/callback`, registered on the OAuth client |
| `CORS_ORIGINS` | no | `https://<domain>` |
| `ALLOWED_EMAIL_DOMAINS` | no | `tamhub.com` |
| `ADMIN_EMAILS` | no | Comma-separated emails that get the admin role on first Google sign-in |
| `AUTH_PASSWORD_LOGIN` | no | `false` in production: Google sign-in only |
| `SEED_USERS` | secret | Leave empty in production (no password accounts) |
| `LLM_PROVIDER` | no | `anthropic` |
| `LLM_MODEL` | no | `claude-sonnet-5-5` (default model for a run) |
| `LLM_MODEL_OPTIONS` | no | Models offered per run, `id=label,...` |
| `LLM_EFFORT` | no | `medium` |
| `LLM_WEB_SEARCH`, `LLM_MAX_WEB_SEARCHES` | no | `true`, `3` |

Never commit values. `.env` is git-ignored; Dokploy writes it at deploy time.

## Persistent data

| Volume | Holds | Back up |
| --- | --- | --- |
| `db_data` | The Postgres database: users, budgets, price observations, AI sessions, usage log | yes, daily |

The seed price database (`server/db/seed/catalog.json`) is part of the image and rebuilt from the MCB workbooks with `npm run db:seed`.

## First deployment checklist

1. Push the repository Dokploy deploys from, create a Compose service from it, and set the domain for `app`.
2. Enter the environment variables above.
3. Add the production origin and redirect URI to the Google OAuth client.
4. Deploy. Watch the `app` logs for `API listening` with `"db":"postgres"`.
5. Optional: import the budgets from the developer version with `npm run db:import` against the live `DATABASE_URL` (run from a machine that has the old `server/data/db.json`).
6. Sign in with a Google account listed in `ADMIN_EMAILS`, open Admin, Developer settings, and confirm the Claude connection shows the key.
7. Price one small scope on the live site before announcing it.

## Exceptions to the "open-source first" standard

- **Anthropic Claude API.** The product is the AI analyst; there is no self-hostable equivalent of the model. The vendor is isolated in `server/pricing/pipeline.ts` behind the official SDK. Flagged, not silently kept.
- **tsx at runtime.** The server is TypeScript run through `tsx` inside the container rather than precompiled. It is a runtime dependency in the production image, listed on purpose to keep the build simple; a precompile step can replace it later without changing the code.

## Verify locally (needs Docker)

```bash
cp .env.example .env   # fill in POSTGRES_* and SESSION_SECRET at least
docker compose build
docker compose up -d
docker compose ps       # both healthy
docker compose exec app wget -qO- http://localhost:8787/api/health
docker compose down -v
```
