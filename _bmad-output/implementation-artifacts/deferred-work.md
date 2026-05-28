# Deferred Work

## Deferred from: code review of 1-9-frontend-ci-cd-and-vercel-deploy (2026-05-28)

- Playwright `webServer` missing `timeout` — default 60 s timeout may not be enough on cold CI runners with oxide/lightningcss first-run compilation; add `timeout: 120_000` to `playwright.config.ts` `webServer` block when E2E tests are introduced
- `VITE_API_URL=` empty in `.env.example` — Vercel builds with no API URL configured will silently produce broken API calls; acceptable until Story 3.x deploys the backend and sets the env var in Vercel project settings
- `npm run type-check` only covers `src/` — `playwright.config.ts` and `vitest.config.ts` are governed by `tsconfig.node.json` and never type-checked in CI; extend the `type-check` script or add a second CI step when config type safety becomes important
- Node.js pinned to major `22` only — native binaries (rolldown, lightningcss, oxide) could be affected by minor version drift on ubuntu-latest; pin `node-version` to a specific LTS patch (e.g. `22.13.0`) for fully reproducible builds

## Deferred from: code review of 1-9-frontend-ci-cd-and-vercel-deploy (2026-05-27)

- `vercel.json` missing SPA catch-all rewrite (`"rewrites": [{"source":"/(.*)", "destination":"/index.html"}]`) — app currently uses only search-param routing at `/` so this is not a live bug, but must be added before Epic 2 introduces path-based routes (e.g. `/library`, `/auth`)

## Deferred from: code review of 1-8-freeform-marking-and-note-names (2026-05-27)

- `modeIndex` not round-tripped in URL — pre-existing gap; `useUrlState` serializes tuning/key/scale/capo/notes/marks but not modeIndex; user loses active mode chip on page reload; address in a future URL-state hardening story
- Hit-target fret 0 width (`NUT_X`) may overlap fret 1 — spec specifies `NUT_X` as the fret-0 hit-target width; `cx=getDotCx(0)=NUT_X` centered on a `NUT_X`-wide rect extends 20px past the nut line into fret 1's column; verify geometry and adjust if click-target misfire is observed in E2E tests (Story 1.9)

## Deferred from: code review of 1-7-capo-support (2026-05-26)

- URL hydration: `parseInt('12.5', 10)` = 12 — decimal capo params are silently accepted as integers; not harmful (12 is valid) but malformed input passes without rejection; use `Number.isInteger(Number(urlCapo))` if stricter validation is desired

## Deferred from: code review of 1-6-scale-and-mode-explorer (2026-05-26)

- Mode chips active on non-diatonic base scales (e.g. Pentatonic Minor + Dorian) produce musically ambiguous overlays — no validation in spec scope; define chip visibility rules or a guard when scale categories are introduced
- `getScaleNotes` returns empty `Set` for unknown/stale `scaleName` — all mode notes render as `mode` state with no scale context; add validation at URL hydration boundary when `useUrlState` is hardened

## Deferred from: code review of 1-5-controlbar-and-tuning-selection (2026-05-26)

- `useUrlState.ts` implementation unreviewed — story 1.4 deliverable; file exists (untracked) but was not in this diff; review when 1.4 is committed or in story 1.6 prep
- Library/Account stub buttons not `aria-disabled` — intentional scaffolding; stories 2.1 and 3.4 wire onClick; add `disabled` or `aria-disabled` at that point
- JS data file type casts suppress TypeScript safety — `SCALES as Record<string, { category: string }>` and `SCALE_NAMES as string[]` bypass TypeScript because data files are `.js`; address when data files are migrated to `.ts`
- AC4 responsive wrap at 768px not unit-tested — Tailwind `flex-wrap` is present; viewport resize testing requires Playwright (Story 1.9)
- AC5 tab order not tested — source order matches spec; keyboard nav testing requires E2E/a11y tooling (Story 1.9)

## Deferred from: code review of 1-4-core-state-and-url-sharing (2026-05-25)

- `DEFAULT_FRETBOARD_STATE` uses `as` type casts — minor type-safety gap; use `satisfies FretboardDataState` or typed picks if interface changes significantly
- `noteIndex` -1 for unrecognised notes in musicTheory.js — pre-existing (also tracked from Story 1.3); add validation fence in musicTheory.js
- `useLayoutStore` library panel state naming ambiguity — `sidePanel: boolean` in LayoutConfig may not map clearly to "panel open/closed"; clarify when LibraryPanel is implemented in Story 2.1

## Deferred from: code review of 1-3-interactive-svg-fretboard (2026-05-25)

- GLOW_FILTER_ID duplicate across FretboardCanvas instances — `url(#fret-dot-mode-glow)` resolves first DOM match; breaks if multiple fretboards on one page; single fretboard per page in v1, revisit if comparison view added
- Duplicate TUNINGS['Standard E'] fallback — applied independently in `calculateFretboardDots` and `FretboardCanvas`; can diverge if tunings data is renamed; consolidate into one lookup point
- getDotCy no bounds check — exported function returns undefined for out-of-range stringIdx; add guard when function surface area grows (Story 1.8 mitigated for freeform marks via bounds filter in calculateFreeformDots; raw getDotCy still unguarded for callers outside that path)
- noteIndex -1 for unrecognized notes — pre-existing musicTheory.js gap; corrupts note lookups silently; add validation in musicTheory.js or at API boundary
- Flat root notes not in ENHARMONIC_MAP — double-flats and non-standard enharmonics not normalised; Story 1.4 rootNote selector should restrict to normalised note names
- Tuning arrays with wrong string count — `STRING_COUNT` loop assumes 6 strings; Story 4.1 (custom tuning creator) must validate string count on save
- capoPosition >= 25 and negative capoPosition — no clamping; Story 1.7 capo slider should clamp input to [0, FRET_COUNT]
- scaleNotes sharp-only invariant — `scaleNotes.has(note)` breaks if musicTheory.js ever returns flat spellings; add comment to musicTheory.js marking this contract
- FRET_MARKERS dual import path — FretboardCanvas imports directly from musicTheory.js despite fretboardUtils re-exporting; consolidate to fretboardUtils import
- midY hardcoded to 6-string middle pair — `(STRING_Y[2] + STRING_Y[3]) / 2`; compute from STRING_Y.length when 7-string support is added
- Celtic and DADGAD tunings identical in tunings.js — both `['D','A','D','G','A','D']`; audit and deduplicate tunings data in a future data-cleanup story

## Deferred from: code review of 1-2-appshell-and-design-token-system (2026-05-25)

- `layoutStore` lacks reset mechanism — store accumulates state mutations but has no reset() method to return to DEFAULT_LAYOUT; consider adding for testing/lifecycle use cases in future layout enhancement story

## Deferred from: code review of 1-1-monorepo-setup-and-dev-environment (2026-05-24)

- `main.jsx` imports `App.css` alongside `index.css` — hardcoded body styles bypass shadcn CSS variable system; Story 1.2 owns CSS architecture overhaul
- ESLint only lints `.ts/.tsx`, all `.jsx`/`.js` source files skipped — by design for Story 1.1; Story 1.2 migrates components to `.tsx`
- Playwright config has no `webServer` block; CI tests will hang — stub only; add when real E2E tests are written (Story 1.9)
- `createRoot(document.getElementById('root'))` has no null guard — pre-existing `.jsx` code; address when `main.jsx` is migrated to `.tsx`
- Vite v8.0.14 installed vs architecture spec v6 — v8 is functional; update architecture spec in Story 1.9
- Geist Variable set as `--font-sans` in `@theme` block — conflicts with Story 1.2 font plan (Inter + JetBrains Mono); Story 1.2 replaces all design tokens
- shadcn generated light-mode as `:root` default — project is dark-by-default; Story 1.2 implements dark mode system
- `noUnusedLocals: false` and `noUnusedParameters: false` in tsconfig — deliberate for JS/TS mixed transition period; revisit after Story 1.2 migrates components
- `.gitignore` excludes `.vscode/` entirely — shared editor config cannot be committed; refine when team grows
