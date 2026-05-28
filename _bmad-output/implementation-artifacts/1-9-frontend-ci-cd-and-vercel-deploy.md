# Story 1.9: Frontend CI/CD & Vercel Deploy

Status: done

## Dev Context
- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **developer**,
I want the frontend to be automatically checked on every PR and deployed on every merge to main,
so that broken code never reaches production and every merge is immediately live on Vercel.

## Acceptance Criteria

**AC1** — Given a PR targeting `main`,  
When the PR is opened or updated,  
Then `.github/workflows/frontend-ci.yml` runs `tsc --noEmit`, `eslint`, and `vite build` in sequence — any failure marks the PR check as failed and blocks merge.

**AC2** — Given a merge to `main`,  
When the merge completes,  
Then Vercel automatically deploys the `/frontend` build output to the configured Vercel project URL.

**AC3** — Given the Vercel deployment is complete,  
When the Vercel URL is opened in a browser,  
Then the guitar app is accessible and functional (fretboard renders, controls respond).

**AC4** — Given environment variables (e.g. `VITE_API_URL`),  
When the app is deployed,  
Then env vars are configured in Vercel project settings only — no `.env` files containing secrets are committed to the repository.

**AC5** — Given the monorepo layout (`frontend/` is the app root),  
When the CI workflow runs,  
Then it operates from `./frontend` working directory — installs, checks, and builds within that directory.

**AC6** — (Deferred item resolved) Given the Playwright config has no `webServer` block,  
When E2E tests are added in future,  
Then they must not hang indefinitely in CI — `playwright.config.ts` must include a `webServer` block configured for CI.

## Tasks / Subtasks

- [x] Task 1: Create `.github/workflows/frontend-ci.yml` (AC: 1, 5)
  - [x] Create directory `.github/workflows/` at repo root (not inside `frontend/`)
  - [x] Create `frontend-ci.yml` with the exact content specified in Dev Notes
  - [x] Trigger: `push` and `pull_request` targeting `main`; path filter on `frontend/**` and `.github/workflows/frontend-ci.yml`
  - [x] Single job `ci` with `defaults.run.working-directory: ./frontend`
  - [x] Steps in order: checkout → setup-node (v22, npm cache) → `npm ci` → `npm run type-check` → `npm run lint` → `npm test` → `npm run build`
  - [x] Verify the workflow file is valid YAML (no tabs, correct indentation)

- [x] Task 2: Create `vercel.json` at repo root for Vercel monorepo config (AC: 2, 3, 5)
  - [x] Create `vercel.json` at repo root (NOT inside `frontend/`)
  - [x] Set `rootDirectory`, `framework`, `buildCommand`, `outputDirectory`, `installCommand` as specified in Dev Notes
  - [x] Do NOT commit any env var values — `vercel.json` only controls build configuration, not secrets

- [x] Task 3: Update `frontend/playwright.config.ts` with `webServer` block (AC: 6)
  - [x] Add `webServer` configuration to `playwright.config.ts` as specified in Dev Notes
  - [x] `reuseExistingServer: !process.env.CI` — reuse locally, always start fresh in CI
  - [x] Keep existing `testDir`, `use.baseURL`, and `devices` config unchanged

- [x] Task 4: Add `.env.example` stub (AC: 4)
  - [x] Create `frontend/.env.example` with `VITE_API_URL=` (empty value, not a secret)
  - [x] Do NOT modify `.gitignore` — root `.gitignore` already covers `.env`, `.env.local`, `frontend/.env`, `frontend/.env.local`, and `**/dist`
  - [x] Do NOT create any actual `.env` file with values

- [x] Task 5: Final validation
  - [x] `npm run type-check` → zero errors ✅
  - [x] `npm run lint` → zero errors, zero warnings ✅
  - [x] `npm test` → 126 tests pass, no regressions ✅
  - [x] `npm run build` → successful build, `frontend/dist/` created with `index.html` + assets ✅
  - [x] Verify `.github/workflows/frontend-ci.yml` YAML is well-formed ✅
  - [x] Verify `vercel.json` is valid JSON ✅

### Review Findings

- [x] [Review][Patch] Workflow `branches: [main]` targets non-existent branch — repo default branch is `master`; CI never fires on any push or PR [`.github/workflows/frontend-ci.yml:6,14`]
- [x] [Review][Defer] `vercel.json` missing SPA catch-all rewrite — not needed currently (app uses search-param routing at `/` only; no path-based routes yet); required before Epic 2 introduces path-based routes [`vercel.json`] — deferred
- [x] [Review][Defer] Playwright `webServer` missing `timeout` — default 60 s may not be enough on a cold CI runner with oxide/lightningcss first-run compilation; add `timeout: 120_000` when E2E tests are introduced [`frontend/playwright.config.ts`] — deferred, pre-existing pattern
- [x] [Review][Defer] `VITE_API_URL=` empty in `.env.example` — Vercel preview builds with no API URL will silently produce broken API calls (relative or `undefined`-prefixed paths); intentional until Story 3.x deploys the backend [`frontend/.env.example`] — deferred, intentional until Story 3.x
- [x] [Review][Defer] `npm run type-check` only covers `src/` via `tsconfig.json` — `playwright.config.ts` is governed by `tsconfig.node.json` and is never type-checked in CI; type errors in the config won't surface until a local run [`frontend/playwright.config.ts`, `frontend/tsconfig.node.json`] — deferred, pre-existing tsconfig setup
- [x] [Review][Defer] Node.js pinned to major `22` only — native binaries (rolldown, lightningcss, oxide) could be affected by minor version drift on the ubuntu-latest runner; pin to specific LTS (e.g. `22.13.0`) for reproducibility [`.github/workflows/frontend-ci.yml:29`] — deferred

---

## Dev Notes

### What already exists — do NOT re-create

```
frontend/
  package.json       — scripts: dev, build, preview, type-check, lint, test, test:watch
  package-lock.json  — present (enables `npm ci`)
  playwright.config.ts — testDir: ./e2e, baseURL: http://localhost:5173, Desktop Chrome
  e2e/.gitkeep       — placeholder; no actual E2E tests yet
  vitest.config.ts   — Vitest unit test config (separate from playwright)
  tsconfig.json      — TypeScript config with allowJs:true
  eslint.config.js   — ESLint config (covers .ts/.tsx only; .jsx excluded by design)
```

No `.github/` directory exists yet. This story creates it.

### Exact content for `.github/workflows/frontend-ci.yml`

```yaml
name: Frontend CI

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci.yml'
  pull_request:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci.yml'

jobs:
  ci:
    name: Type-check · Lint · Test · Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type-check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

**Critical details:**
- `actions/checkout@v4` and `actions/setup-node@v4` are current stable versions (2026)
- `cache-dependency-path: frontend/package-lock.json` — path is relative to repo root, NOT to the `working-directory`. This is a common mistake. The `working-directory` default only affects `run:` steps, not `uses:` steps.
- `npm run test` maps to `vitest run` — runs all tests once and exits (non-watch mode)
- Build runs last (fail fast: type-check + lint + test before expensive build)
- `paths` filter ensures CI only fires when frontend or CI config changes (not on backend or docs changes)

### Exact content for `vercel.json` (at repo root)

```json
{
  "rootDirectory": "frontend",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci"
}
```

**Why `rootDirectory: "frontend"`?**  
The repo root is a monorepo — Vercel's GitHub integration defaults to running commands at the repo root. Setting `rootDirectory` tells Vercel to treat `frontend/` as the project root, so `package.json`, `vite.config.ts`, and `index.html` are found correctly.

**Env vars (Vercel dashboard only):**
- `VITE_API_URL` — set in Vercel project → Settings → Environment Variables
- No values in `vercel.json` or committed `.env` files
- Vite exposes vars prefixed `VITE_` to the browser bundle; never put secrets in `VITE_` vars

### Exact `webServer` addition to `frontend/playwright.config.ts`

Replace the existing content with:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
  },
})
```

**Why this matters:**  
Without `webServer`, Playwright assumes a server is already running at `baseURL`. In CI, no server is running, so tests immediately fail with connection refused. The `webServer` block starts `vite dev` before tests run and tears it down after. `reuseExistingServer: !process.env.CI` means locally it reuses your already-running `npm run dev`, while CI always starts fresh (`CI=true` is set automatically by GitHub Actions).

### `.env.example` content

```
# Copy this file to .env.local and fill in values for local development
# Never commit .env files with actual values

# Backend API URL (Story 3.7 sets this in Vercel; leave empty until backend is deployed)
VITE_API_URL=
```

### `.gitignore` — already correct, do NOT modify

The root `.gitignore` already contains:
```
**/dist          ← build output excluded
.env             ← root env files excluded
.env.local
frontend/.env    ← frontend-specific env files excluded
frontend/.env.local
```
Do not add or change any `.gitignore` entries in this story.

### Architecture deferred items resolved by this story

From `deferred-work.md`:
- "Playwright config has no `webServer` block; CI tests will hang" → **resolved Task 3**
- "Vite v8.0.14 installed vs architecture spec v6" → **informational only** — Vite v8 is the installed version and works correctly; architecture distillate is a read-only reference doc; do NOT modify it

### Architecture guardrails — do not violate

- `frontend/src/data/*.js` — do NOT touch (musicTheory.js, tunings.js, scales.js)
- `src/components/ui/` — do NOT hand-edit shadcn files
- Tailwind v4: CSS-only via `@theme` in `index.css` — no tailwind.config.js
- `App.jsx` stays `.jsx` — do NOT convert to `.tsx`
- ESLint covers `.ts/.tsx` only; `.jsx` excluded by design

### Vercel deployment — manual configuration steps (not scripted)

The following must be done in the Vercel dashboard by a human (not automatable by this dev agent):
1. Connect GitHub repo to a new Vercel project (vercel.com → New Project → Import Git Repository)
2. Vercel will auto-read `vercel.json` and set `rootDirectory: frontend` automatically
3. Add `VITE_API_URL` as an environment variable in Vercel → Settings → Environment Variables (leave empty until Story 3.7)
4. Confirm the first deployment succeeds and note the `.vercel.app` URL

The `vercel.json` created in Task 2 handles the automated portion. The dashboard steps are documented here for handoff.

### File list for this story

**New files:**
- `.github/workflows/frontend-ci.yml`
- `vercel.json`
- `frontend/.env.example`

**Modified files:**
- `frontend/playwright.config.ts` — add `webServer` block

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

Story 1.9 implemented 2026-05-27. All 5 tasks complete.

- **Task 1**: Created `.github/workflows/frontend-ci.yml` with push+PR triggers on `main`, path filters for `frontend/**`, single `ci` job with `defaults.run.working-directory: ./frontend`, steps: checkout → setup-node@v4 (Node 22, npm cache, `cache-dependency-path: frontend/package-lock.json`) → `npm ci` → type-check → lint → test → build.
- **Task 2**: Created `vercel.json` at repo root with `rootDirectory: "frontend"`, `framework: "vite"`, `buildCommand: "npm run build"`, `outputDirectory: "dist"`, `installCommand: "npm ci"`. No secrets committed.
- **Task 3**: Updated `frontend/playwright.config.ts` to add `webServer` block (`command: 'npm run dev'`, `url: 'http://localhost:5173'`, `reuseExistingServer: !process.env.CI`). Resolves deferred item from Story 1.3 CR.
- **Task 4**: Created `frontend/.env.example` documenting `VITE_API_URL=` (empty stub). Root `.gitignore` already excluded all `.env*` files — not modified.
- **Task 5**: All validations pass — type-check ✅, lint ✅, 126/126 tests ✅, `npm run build` → `dist/index.html` + assets ✅, YAML well-formed ✅, JSON valid ✅.

**Note on Vercel deployment (AC2/AC3):** The `vercel.json` handles the automated config portion. The remaining AC2/AC3 steps (connecting the GitHub repo to Vercel via dashboard, setting `VITE_API_URL` env var) require manual dashboard configuration — documented in Dev Notes.

### File List

- `.github/workflows/frontend-ci.yml` — new: GitHub Actions CI workflow
- `vercel.json` — new: Vercel monorepo build config
- `frontend/playwright.config.ts` — modified: added `webServer` block
- `frontend/.env.example` — new: env var documentation stub

### Change Log

- Story 1.9 implemented: GitHub Actions CI, Vercel config, Playwright webServer, .env.example (Date: 2026-05-27)
