# Deferred Work

## Deferred from: code review of 1-3-interactive-svg-fretboard (2026-05-25)

- GLOW_FILTER_ID duplicate across FretboardCanvas instances — `url(#fret-dot-mode-glow)` resolves first DOM match; breaks if multiple fretboards on one page; single fretboard per page in v1, revisit if comparison view added
- Duplicate TUNINGS['Standard E'] fallback — applied independently in `calculateFretboardDots` and `FretboardCanvas`; can diverge if tunings data is renamed; consolidate into one lookup point
- Freeform ring pointer events — annular region between r=11 and r=14 intercepts events silently; Story 1.8 (freeform marking) must set `pointer-events="none"` on the ring circle
- getDotCy no bounds check — exported function returns undefined for out-of-range stringIdx; add guard when function surface area grows
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
