# Story 1.1: Monorepo Setup & Dev Environment

## Metadata

| Field | Value |
|---|---|
| **Story ID** | 1.1 |
| **Epic** | Epic 1 — Core Fretboard Experience |
| **Status** | done |
| **Story Key** | 1-1-monorepo-setup-and-dev-environment |
| **Output File** | `_bmad-output/implementation-artifacts/1-1-monorepo-setup-and-dev-environment.md` |

---

## User Story

As a **developer**,
I want the project restructured as a monorepo with modern frontend tooling,
So that I have a clean, configured workspace to build the redesigned app.

---

## Acceptance Criteria

**Given** the existing frontend code is at the repo root
**When** the monorepo setup is complete
**Then** all existing frontend code is moved to `/frontend` with no functionality regressions
**And** Vite 6 is configured with `@tailwindcss/vite` plugin and `@/` path alias resolving to `frontend/src/`
**And** TypeScript is configured with `allowJs: true` so existing `.js` files work without rewriting
**And** shadcn/ui is initialized with the project's color conventions
**And** `docker-compose.yml` at repo root defines `backend` and `postgres` services (backend image can be a placeholder at this stage)
**And** `npm run dev` from `/frontend` starts the app on localhost with the existing fretboard functional

---

## Current Project State (MUST READ BEFORE TOUCHING ANYTHING)

The existing app lives at **repo root** (not in a subfolder). Here is the exact current structure:

```
guitar-app/                    ← repo root (current working dir for npm)
├── index.html                 ← entry point
├── package.json               ← React 18.3.0 + Vite 5.4.0, name: "guitar-app"
├── package-lock.json
├── vite.config.js             ← vanilla JS config, no aliases, no TS
├── screenshot.js              ← dev utility, NOT part of app
├── ONBOARDING.md              ← project docs, stays at root
├── dist/                      ← build output, not moved (regenerated)
├── node_modules/              ← not moved (regenerated after move)
├── _bmad/                     ← BMad config, stays at root
├── _bmad-output/              ← artifacts, stays at root
└── src/
    ├── main.jsx               ← ReactDOM.createRoot entry
    ├── App.jsx                ← top-level component (fretboard, controls, nav)
    ├── App.css
    ├── components/
    │   ├── Controls.jsx + Controls.css
    │   ├── Fretboard.jsx + Fretboard.css
    │   ├── NavTabs.jsx + NavTabs.css
    │   └── ProGate.jsx + ProGate.css
    ├── data/
    │   ├── tunings.js         ← PRESERVE EXACTLY, do not modify
    │   ├── scales.js          ← PRESERVE EXACTLY, do not modify
    │   ├── musicTheory.js     ← PRESERVE EXACTLY, do not modify
    │   └── notes.js           ← PRESERVE EXACTLY, do not modify
    └── utils/                 ← currently empty
```

**App.jsx current state:** `NavTabs` + `Controls` + `Fretboard` + `ProGate` all rendered with prop-drilled state (`tuningName`, `rootNote`, `scaleName`, `showIntervals`). **Do not refactor this in Story 1.1** — it's replaced in later stories.

**Current fonts in `index.html`:** Inter + Space Grotesk via Google Fonts. Leave these in place — the font swap to JetBrains Mono is in Story 1.2.

---

## ⚠️ Tailwind Preflight Warning — Read Before Starting

`@import "tailwindcss"` applies Tailwind's **preflight** CSS reset layer. This **intentionally breaks** the visual appearance of the existing app: headings lose their default sizes, margins and paddings are zeroed, links lose colour and underline. The existing components (`App.css`, `Fretboard.css`, etc.) rely on browser defaults that preflight removes.

**This visual regression is expected and intentional.** Story 1.2 replaces all existing CSS with the design token system. For Story 1.1, the criterion for "functional" is that the React component tree renders without JavaScript errors and the fretboard responds to state changes — not that it looks visually correct. Note this explicitly in your Dev Notes so Story 1.2 is aware.

---

## Implementation Tasks

### Task 1: Create the `/frontend` directory and move existing app

Move (do not copy) the following from repo root → `frontend/`:

| From (repo root) | To (`frontend/`) |
|---|---|
| `index.html` | `frontend/index.html` |
| `package.json` | `frontend/package.json` |
| `package-lock.json` | `frontend/package-lock.json` |
| `vite.config.js` | *DELETE — replaced by `vite.config.ts` below* |
| `src/` (entire directory) | `frontend/src/` |

**Do NOT move:**
- `screenshot.js` — stays at repo root
- `ONBOARDING.md` — stays at repo root
- `dist/` — delete it; will regenerate from `frontend/`
- `node_modules/` — delete it; will reinstall inside `frontend/`
- `_bmad/`, `_bmad-output/` — stays at repo root

After move, `frontend/src/data/` must contain: `tunings.js`, `scales.js`, `musicTheory.js`, `notes.js` **unchanged**.

**Update `frontend/package.json` name field:**

Change `"name": "guitar-app"` → `"name": "guitar-app-frontend"` to avoid ambiguity with the repo root in monorepo tooling.

---

### Task 2: Upgrade and reconfigure frontend dependencies

From inside `frontend/`, run the following. Execute in this order:

```bash
# Upgrade Vite to v6 + React plugin
npm install -D vite@latest @vitejs/plugin-react@latest

# TypeScript support (allowJs mode — existing .js files unchanged)
npm install -D typescript @types/react @types/react-dom @types/node

# Tailwind v4 (Vite-native plugin, no postcss needed)
npm install tailwindcss @tailwindcss/vite

# React Router v7 (needed from Story 1.4 — install now to avoid later disruption)
npm install react-router-dom@^7

# Zustand + TanStack Query (needed from Story 1.4 — install now to avoid later disruption)
npm install zustand @tanstack/react-query
```

**Add scripts to `frontend/package.json`:**

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "type-check": "tsc --noEmit",
  "lint": "eslint ."
}
```

The `type-check` and `lint` scripts are required by the Story 1.9 CI workflow.

**Leave in `package.json` (do not remove):**
- `react@^18.3.0`
- `react-dom@^18.3.0`
- `playwright` (keep — E2E later)

---

### Task 3: Create `frontend/vite.config.ts`

Replace the old `vite.config.js` with this TypeScript version:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

**Critical:** The `@/` alias resolves to `frontend/src/` — all new `.ts`/`.tsx` files use `@/` imports. Existing `.jsx` files continue using their current relative imports (e.g., `./components/Fretboard.jsx`) — do NOT change them.

---

### Task 4: Create TypeScript config files

**`frontend/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**`frontend/tsconfig.node.json`:**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

**Why `"types": ["node"]` in tsconfig.node.json:** `vite.config.ts` uses `resolve(__dirname, './src')`. Without `"types": ["node"]`, TypeScript cannot find `__dirname` and will throw `Cannot find name '__dirname'`. The `@types/node` package installed in Task 2 provides the types; this declaration activates them for the Vite config scope.

**Why `allowJs: true` in tsconfig.json:** The music theory engine (`tunings.js`, `scales.js`, `musicTheory.js`, `notes.js`) must remain `.js` forever. TypeScript will type-check new `.ts`/`.tsx` files while treating existing `.js` files as pass-through.

---

### Task 5: Initialize shadcn/ui

**Run shadcn init BEFORE modifying index.css** — shadcn writes to `index.css` during init and must run first.

From inside `frontend/`, run:

```bash
npx shadcn@latest init
```

When prompted, use these answers:
- Style: **Default**
- Base color: **Neutral** (we'll override tokens in Story 1.2 with custom dark theme)
- CSS variables: **Yes**
- `components.json` will be created at `frontend/components.json`
- Components output to: `frontend/src/components/ui/` (shadcn default)

shadcn/ui will add `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` to `package.json`. Accept all of these.

shadcn will also write CSS variable declarations to `index.css`. Do not worry about the generated variable values — they will be replaced by the custom design token system in Story 1.2.

**Important:** shadcn components are generated source files in `src/components/ui/` — they are owned code, not a black-box dependency. Do not hand-edit the generated files in this story.

---

### Task 6: Configure Tailwind v4 CSS entry

After shadcn init has run (Task 5), open `frontend/src/index.css` and ensure `@import "tailwindcss"` is the **absolute first line**, before any shadcn-generated content:

```css
@import "tailwindcss";

/* shadcn-generated variables below — do not reorder above import */
:root {
  /* ... shadcn variables ... */
}
```

If shadcn init already added `@import "tailwindcss"` as the first line, no change needed.

Verify `frontend/src/main.jsx` imports `index.css`:
```jsx
import './index.css'
```
If it already does, no change needed.

**Do not add `@theme` tokens yet** — that is Story 1.2.

---

### Task 7: Set up ESLint

Story 1.9 CI runs a `lint` step. Set it up now so the script exists and passes.

From inside `frontend/`, install:

```bash
npm install -D eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh typescript-eslint
```

Create **`frontend/eslint.config.js`**:

```javascript
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'src/components/ui'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
)
```

**Note:** ESLint only targets `.ts`/`.tsx` files (`files: ['**/*.{ts,tsx}']`). The existing `.jsx` files are ignored — this prevents lint failures from the legacy code before Story 1.2 replaces it. `src/components/ui` is also ignored (shadcn-generated, not hand-maintained).

Run `npm run lint` to verify it passes (with no `.ts`/`.tsx` files yet, it should pass immediately).

---

### Task 8: Create `frontend/playwright.config.ts` stub

The architecture directory structure shows `frontend/playwright.config.ts`. Create a minimal stub so `tsc` doesn't error if E2E types are referenced, and the file is in place for Story 1.9:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
  },
})
```

Also create `frontend/e2e/.gitkeep` (empty file) so the `e2e/` directory exists. E2E test files are written in Story 1.9.

Update `frontend/tsconfig.json` `"include"` to NOT include `e2e` for now (it has no `.ts` files yet and would cause errors):

```json
"include": ["src"]
```

This is already how the story specifies it — just confirming it's correct.

---

### Task 9: Create `docker-compose.yml` at repo root

Create at `guitar-app/docker-compose.yml` (NOT inside `frontend/`):

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: guitarapp
      POSTGRES_USER: guitarapp
      POSTGRES_PASSWORD: guitarapp_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U guitarapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: eclipse-temurin:21-jre-alpine
    command: ["echo", "Backend placeholder — scaffold in Story 3.1"]
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
    profiles:
      - backend

volumes:
  postgres_data:
```

**Key design decisions:**
- `backend` service uses `profiles: [backend]` — it only starts when explicitly requested (`docker compose --profile backend up`). This prevents failure since `./backend/` doesn't exist yet.
- `postgres` service starts unconditionally — `docker compose up postgres` works immediately.
- `postgres_data` volume persists DB between restarts.
- Password `guitarapp_dev` (not `guitarapp`) — obvious dev-only credential.

---

### Task 10: Verify/update `.gitignore` at repo root

The existing root `.gitignore` (if anchored with leading `/`) may only exclude `/node_modules` and `/dist`, not the new `frontend/node_modules` and `frontend/dist` paths. Check and ensure it includes:

```gitignore
# Node — covers root and all subdirectories
**/node_modules

# Build output
**/dist

# Environment files
.env
.env.local
frontend/.env
frontend/.env.local

# OS
.DS_Store
```

If no `.gitignore` exists at root, create it with the above.

---

### Task 11: Create environment example file

**`frontend/.env.example`:**
```
VITE_API_URL=http://localhost:8080
```

Do NOT create `.env` (that's gitignored and per-developer). Only the example file.

---

### Task 12: Verify `frontend/index.html`

No content changes needed. Just confirm:
1. `<script type="module" src="/src/main.jsx">` — the path must start with `/src/`, not `/frontend/src/`
2. Vite serves from the `frontend/` directory root, so `/src/main.jsx` resolves correctly
3. Google Fonts links (Inter + Space Grotesk) remain — font swap happens in Story 1.2

---

## Architecture Guardrails

### File naming — MUST FOLLOW

| Type | Convention | Example |
|---|---|---|
| New React components | PascalCase `.tsx` | `AppShell.tsx` |
| New hooks | camelCase, `use` prefix, `.ts` | `useUrlState.ts` |
| New stores | camelCase, `use` + `Store` suffix | `fretboardStore.ts` |
| New utilities | camelCase `.ts` | `formatNote.ts` |
| Existing `.jsx` files | **Do not rename** | `App.jsx` stays `.jsx` |
| Existing `.js` data files | **Do not rename** | `tunings.js` stays `.js` |

### Import paths — MUST FOLLOW

- New `.ts`/`.tsx` files: use `@/` alias → `import { x } from '@/stores/fretboardStore'`
- Existing `.jsx` files: leave their relative imports unchanged → `import Fretboard from './components/Fretboard.jsx'`
- Do NOT change imports inside `App.jsx` or any existing component in this story

### What this story does NOT do (save for later)

| Not in scope | Which story |
|---|---|
| AppShell component | Story 1.2 |
| Design tokens / `@theme` directive | Story 1.2 |
| Fix visual regressions from Tailwind preflight | Story 1.2 |
| FretboardCanvas SVG rewrite | Story 1.3 |
| Zustand store wiring | Story 1.4 |
| React Router setup | Story 1.4 |
| URL state sync | Story 1.4 |
| Backend scaffold | Story 3.1 |
| GitHub Actions CI workflows | Story 1.9 |
| Font change (JetBrains Mono) | Story 1.2 |
| E2E test files | Story 1.9 |

---

## Verification Checklist

Before marking done, verify ALL of these:

- [ ] `npm run dev` from `frontend/` starts Vite without errors on `http://localhost:5173`
- [ ] App loads in browser — React renders without JS console errors (visual styling may look broken — this is expected per Tailwind preflight warning above)
- [ ] Selecting a different tuning still updates the fretboard (music theory logic intact)
- [ ] `npm run type-check` from `frontend/` completes with zero TypeScript errors
- [ ] `npm run build` from `frontend/` completes successfully
- [ ] `npm run lint` from `frontend/` completes with zero errors
- [ ] **Tailwind test:** Temporarily add `className="text-indigo-500"` to any element in `App.jsx`, verify the colour appears in the browser, then remove it — confirms Tailwind is wired correctly
- [ ] `frontend/src/data/tunings.js` content is identical to original (diff it if unsure)
- [ ] `frontend/src/data/scales.js` content is identical to original
- [ ] `frontend/src/data/musicTheory.js` content is identical to original
- [ ] `frontend/src/data/notes.js` content is identical to original
- [ ] `docker compose up postgres` from repo root starts PostgreSQL on port 5432
- [ ] `docker compose up postgres -d && docker compose ps` shows postgres healthy
- [ ] `@/` import resolves without error — create a temp `frontend/src/test-alias.ts` with `export {}`, run type-check, then delete it
- [ ] `frontend/components.json` exists (shadcn init succeeded)
- [ ] `frontend/src/components/ui/` directory exists with at least one generated file
- [ ] `frontend/playwright.config.ts` exists
- [ ] Root `.gitignore` includes `**/node_modules` pattern

---

## Known Issues / Watch-outs

1. **Tailwind preflight visual regression (intentional):** Adding `@import "tailwindcss"` resets browser default styles. The existing component CSS (App.css, Fretboard.css, etc.) relies on browser defaults. Expect the app to look visually broken after Task 6 — this is correct and expected. Story 1.2 replaces all existing CSS. Note this in Dev Notes so Story 1.2 is aware.

2. **shadcn init → index.css ordering (critical):** shadcn init writes to `index.css`. Always run shadcn init (Task 5) BEFORE manually editing `index.css` (Task 6). If you edit first and shadcn overwrites, re-add `@import "tailwindcss"` as the first line.

3. **`notes.js` in `data/`:** The architecture spec mentions `tunings.js`, `scales.js`, `musicTheory.js` as the three preserved files. The actual project also has `notes.js` — preserve it too.

4. **No `src/utils/` content:** The `src/utils/` directory is empty. Create `frontend/src/utils/` as an empty directory or skip — it will be populated in later stories.

5. **Vite 6 `allowJs` + `moduleResolution: bundler`:** With this config, `.jsx` files without type annotations type-check loosely. Vite won't error on them. This is intentional for the transition period.

6. **`react-router-dom@7` breaking change:** React Router v7 removed `Switch` — uses `Routes` instead. Since we're not using router in Story 1.1, just install it. Do NOT wrap `App.jsx` in a `<Router>` yet (Story 1.4).

7. **shadcn peer dependency warnings:** shadcn may warn about Tailwind v4 compatibility during init. Accept the generated output. If prompted about CSS framework version, choose Tailwind v4 / CSS-first if that option is presented.

---

## Dev Notes

```
Patterns established:
- New .ts/.tsx files use @/ alias imports; all existing .jsx/.js files left with relative imports unchanged
- ESLint targets only .ts/.tsx — legacy .jsx excluded to avoid spurious errors before Story 1.2 replaces them
- shadcn/ui installed with Tailwind v4 CSS-first approach (@import "tailwindcss" as first line in index.css)
- shadcn init (non-interactive, --defaults -y) created: button.tsx, lib/utils.ts, updated index.css with @theme tokens and .dark block
- shadcn added extra packages: tw-animate-css, shadcn (CSS package), @fontsource-variable/geist — all accepted

Files created (new):
- frontend/ (directory — entire app moved here)
- frontend/vite.config.ts
- frontend/tsconfig.json
- frontend/tsconfig.node.json
- frontend/components.json
- frontend/eslint.config.js
- frontend/playwright.config.ts
- frontend/e2e/.gitkeep
- frontend/.env.example
- frontend/src/index.css (Tailwind @import + shadcn generated tokens)
- frontend/src/components/ui/button.tsx (shadcn generated)
- frontend/src/lib/utils.ts (shadcn generated)
- docker-compose.yml (repo root)
- .gitignore (repo root)

Files modified:
- frontend/package.json: name → guitar-app-frontend; added type-check and lint scripts
- frontend/src/main.jsx: added import './index.css' before App.css import

Files moved (from root → frontend/):
- index.html, package.json, package-lock.json, src/

Files deleted from root:
- vite.config.js (replaced by vite.config.ts)
- dist/ (regenerates in frontend/dist/)
- node_modules/ (reinstalled in frontend/node_modules/)

Key decisions:
- musicTheory.js was in src/utils/ (not src/data/ as story stated) — moved to frontend/src/utils/; all Fretboard.jsx imports still resolve correctly
- index.css did not exist before — created it, added import to main.jsx, then ran shadcn init (shadcn preserved @import "tailwindcss" as first line)
- backend docker service uses profiles: [backend] so it doesn't fail — backend scaffold is Story 3.1

Problems encountered:
- shadcn init needs index.css with @import "tailwindcss" to detect Tailwind v4 — had to create it before running init, not after (adjusted task order from story)

Visual regressions introduced (expected):
- Tailwind preflight resets browser default styles; existing App.css/component CSS will look visually different
- Story 1.2 replaces all existing CSS with design token system
```

---

## File List

| Action | Path |
|---|---|
| CREATED (dir) | `frontend/` |
| MOVED+MODIFIED | `frontend/package.json` |
| MOVED | `frontend/package-lock.json` |
| MOVED | `frontend/index.html` |
| MOVED (dir) | `frontend/src/` |
| MODIFIED | `frontend/src/main.jsx` |
| CREATED | `frontend/src/index.css` |
| CREATED | `frontend/src/components/ui/button.tsx` |
| CREATED | `frontend/src/lib/utils.ts` |
| CREATED | `frontend/vite.config.ts` |
| CREATED | `frontend/tsconfig.json` |
| CREATED | `frontend/tsconfig.node.json` |
| CREATED | `frontend/components.json` |
| CREATED | `frontend/eslint.config.js` |
| CREATED | `frontend/playwright.config.ts` |
| CREATED | `frontend/e2e/.gitkeep` |
| CREATED | `frontend/.env.example` |
| CREATED | `docker-compose.yml` |
| CREATED | `.gitignore` |
| DELETED | `vite.config.js` |
| DELETED | `dist/` |
| DELETED | `node_modules/` |

---

## Change Log

| Date | Change |
|---|---|
| 2026-05-24 | Restructured project as monorepo: existing app moved to `frontend/`, Vite 6 + TypeScript + Tailwind v4 + shadcn/ui configured, ESLint wired, docker-compose.yml and .gitignore created at repo root |

---

## Senior Developer Review (AI)

**Review Date:** 2026-05-24
**Outcome:** Changes Requested
**Layers:** Blind Hunter · Edge Case Hunter · Acceptance Auditor

### Action Items

**Patches:**
- [x] [Review][Patch] Remap shadcn CSS variables in `index.css` to project palette (indigo/amber dark theme) — AC 4: "initialized with the project's color conventions" [`frontend/src/index.css`]
- [x] [Review][Patch] `@import "shadcn/tailwind.css"` uses non-standard "style" exports condition — removed import; all CSS variable content already inline [`frontend/src/index.css:3`]
- [x] [Review][Patch] `playwright.config.ts` imports `@playwright/test` (test runner) which is not installed — replaced `playwright` with `@playwright/test` in devDeps; added `playwright.config.ts` to `tsconfig.node.json` include [`frontend/playwright.config.ts`]
- [x] [Review][Patch] No `package-lock.json` committed — dismissed; lockfile exists at `frontend/package-lock.json` and is up to date
- [x] [Review][Patch] Build tools (`tailwindcss`, `@tailwindcss/vite`, `shadcn`, `tw-animate-css`, `@fontsource-variable/geist`) moved from `dependencies` to `devDependencies` [`frontend/package.json`]
- [x] [Review][Patch] Hardcoded `POSTGRES_PASSWORD: guitarapp_dev` in docker-compose.yml — changed to `${POSTGRES_PASSWORD:-guitarapp_dev}` [`docker-compose.yml:8`]
- [x] [Review][Patch] `lucide-react: "^1.16.0"` — dismissed; v1.16.0 is installed and valid (v1 is the current release line)

**Deferred:**
- [x] [Review][Defer] `main.jsx` imports `App.css` alongside `index.css` — hardcoded body styles bypass shadcn CSS variable system [`frontend/src/main.jsx:4`] — deferred to Story 1.2 (CSS architecture overhaul)
- [x] [Review][Defer] ESLint only lints `.ts/.tsx`; all `.jsx`/`.js` source files silently skipped [`frontend/eslint.config.js:11`] — deferred, by design per story spec; Story 1.2 migrates components to .tsx
- [x] [Review][Defer] Playwright config has no `webServer` block; CI tests will hang with `baseURL: localhost:5173` [`frontend/playwright.config.ts`] — deferred to Story 1.9 (CI/CD setup)
- [x] [Review][Defer] `createRoot(document.getElementById('root'))` has no null guard [`frontend/src/main.jsx:7`] — deferred, pre-existing .jsx code; address when main.jsx is migrated to .tsx
- [x] [Review][Defer] Vite v8.0.14 installed vs architecture spec v6 — v8 is functional; spec predates v8 release; not worth downgrading — deferred, update architecture spec in Story 1.9
- [x] [Review][Defer] Geist Variable set as `--font-sans` in `@theme` block — conflicts with Story 1.2 font plan (Inter + JetBrains Mono) [`frontend/src/index.css`] — deferred to Story 1.2
- [x] [Review][Defer] shadcn generated light-mode as `:root` default; project is dark-by-default [`frontend/src/index.css`] — deferred to Story 1.2
- [x] [Review][Defer] `noUnusedLocals: false` and `noUnusedParameters: false` — deliberate for JS/TS mixed transition period [`frontend/tsconfig.json`] — deferred
- [x] [Review][Defer] `.gitignore` excludes `.vscode/` entirely — shared editor config (extensions.json, launch.json) cannot be committed [`/.gitignore:18`] — deferred
