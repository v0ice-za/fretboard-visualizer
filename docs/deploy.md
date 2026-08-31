# Deployment Runbook

Production topology: **Vercel** (frontend) → **Railway** (backend, Dockerfile) → **Railway PostgreSQL**.
The repo pieces (CI workflow, `backend/railway.json`, prod profile, Dockerfile) are committed; the
dashboard wiring below is manual and one-time.

## 1. Railway backend service

1. **Create project** → **Add PostgreSQL** (Railway plugin).
2. **Add a service** from the GitHub repo, branch `master`. Set **Root Directory = `backend`** so
   `railway.json` + the Dockerfile's relative `COPY` paths resolve. Railway auto-deploys on every
   push to `master` (this is AC2's "trigger" — Railway's GitHub integration, not a GitHub Action).
3. `backend/railway.json` already declares: `DOCKERFILE` builder, healthcheck `/api/v1/health`,
   restart `ON_FAILURE`. No further build config needed.

## 2. Railway environment variables (backend service)

> ⚠️ **`DATABASE_URL` gotcha:** Railway's *own* `DATABASE_URL` is `postgresql://…` — Spring needs
> `jdbc:postgresql://…`. Build it from the Postgres plugin's reference variables, do **not** use the
> raw one.

| Variable | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
| `DATABASE_USERNAME` | `${{Postgres.PGUSER}}` |
| `DATABASE_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `JWT_SECRET` | a **fresh** 256-bit base64 secret (never the dev default) — e.g. `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web client ID |
| `STRIPE_SECRET_KEY` | Stripe secret key (live or test) |
| `STRIPE_WEBHOOK_SECRET` | from the Stripe webhook endpoint (step 4) |
| `STRIPE_PRICE_ID` | the $12/yr Price ID |
| `CORS_ALLOWED_ORIGINS` | `https://<app>.vercel.app` |
| `FRONTEND_BASE_URL` | `https://<app>.vercel.app` |
| `COOKIE_SAME_SITE` | `None` |
| `COOKIE_SECURE` | `true` |
| `RATELIMIT_TRUSTED_PROXY_COUNT` | `1` (default; **verify** against Railway's real XFF — see step 5) |

Do **not** set `PORT` — Railway injects it; the app binds via `server.port=${PORT:8080}`.

The `prod` profile removes the dev fallbacks for `DATABASE_*` and `JWT_SECRET`, so a missing one
**fails startup** instead of silently booting against localhost / a public dev key.

## 3. Vercel (frontend)

Set in the Vercel project env, then redeploy:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<railway-app>.up.railway.app` |
| `VITE_GOOGLE_CLIENT_ID` | same value as backend `GOOGLE_CLIENT_ID` |

## 4. Stripe dashboard

Add a webhook endpoint → `https://<railway-app>.up.railway.app/api/v1/webhooks/stripe`; subscribe to
`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy
the endpoint's **signing secret** into Railway's `STRIPE_WEBHOOK_SECRET` (this is the value the
webhook signature check verifies).

## 5. Post-deploy smoke test

1. `GET https://<railway-app>/api/v1/health` → `200`.
2. Railway logs show Flyway applied `V1`–`V5` (validated in CI by `SchemaMigrationIT`).
3. On the Vercel site: register/login → the refresh cookie is set cross-origin (`SameSite=None; Secure`);
   `GET /api/v1/subscriptions/me` returns.
4. **Verify `RATELIMIT_TRUSTED_PROXY_COUNT`:** hit an auth endpoint and confirm the rate-limit key is
   the real client IP (not a Railway-internal address). If the count is wrong for Railway's actual
   XFF chain, bump it and redeploy.
5. **Stripe end-to-end** (unblocks 3.5/3.6 manual gates): Upgrade → test-mode checkout
   (`4242 4242 4242 4242`) → redirect back to `/?checkout=success` → `/subscriptions/me` returns
   `ACTIVE` → premium unlocks; `stripe trigger customer.subscription.deleted` → reverts to `EXPIRED`.

## CI

`.github/workflows/backend-ci.yml` runs `./mvnw -B verify` (compile · unit tests · package · the
Testcontainers `SchemaMigrationIT`) on every PR / push touching `backend/**`. GitHub's runner provides
Docker for the IT and resolves from Maven Central (no corporate mirror), so CI is independent of any
local `~/.m2/settings.xml`.
