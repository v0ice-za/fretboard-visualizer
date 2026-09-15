# Story 4.5: Premium Themes & Contrast Audit

Status: done

## Story

As a **premium user**,
I want **to choose from premium visual themes**,
so that **I can personalize the app's look beyond the default dark/light options, while everything stays perfectly readable.**

## Acceptance Criteria

From `epics.distillate.md#Story 4.5` and `ux-design-specification.distillate.md#Premium Theme Token Overrides`, reconciled against the **actual current implementation** (see Dev Notes — Current state to build on; the source docs predate both the free dark/light toggle and the Epic 5 Aurora dot retune, so this AC list corrects for that drift rather than copying the source docs verbatim):

1. **AC1 — Theme picker in the account menu.** The existing Account `Sheet` (`ControlBar.tsx`) gains a theme picker listing all **6** themes: `dark` (free default), `light` (free — already shipped), `neon`, `mono`, `vibrant`, `minimal` (all four premium). The standalone Sun/Moon quick-toggle already in the control bar is unchanged and keeps cycling dark↔light only. Scope note: the full picker is reachable only from the Account sheet, which — same as everything else in it — requires authentication; an anonymous visitor still has the free Sun/Moon toggle but never sees the locked premium rows or a paywall prompt for themes. This matches the existing app structure (no anonymous-accessible settings surface exists) and is a deliberate scope boundary, not an oversight.
2. **AC2 — Selecting an unlocked theme.** Clicking `dark`/`light` (always) or one of the 4 premium themes (premium users only) immediately sets `data-theme="<theme-name>"` on `<html>`, updates every themed CSS token, and persists the choice to `localStorage` under the existing `guitar-app-theme` key — same mechanism `useThemeStore` already uses for dark/light.
3. **AC3 — Locked premium themes.** Non-premium users see `neon`/`mono`/`vibrant`/`minimal` with a lock indicator (reuse the `LibraryItem` lock-badge convention). Clicking a locked theme triggers `PaywallCard` anchored to the clicked row; it does **not** change the active theme.
4. **AC4 — Premium-loss fallback.** If the active theme is one of the 4 premium themes and the user is (or becomes) non-premium — subscription expires, or they log out — the app silently falls back to `dark`. Conversely, a premium user who return-visits with a previously-chosen premium theme in storage gets it restored once their premium status resolves (see Dev Notes — Design Decision: entitlement-resolution sequencing; this is the same async-sequencing hazard 4.4 hit with session restore).
5. **AC5 — New theme token sets.** `neon`, `mono`, `vibrant`, `minimal` each get a full CSS custom-property block in `index.css` (`[data-theme="neon"]` etc.), mirroring the existing `.dark`/`:root` blocks' structure: base/surface/brand tokens, glass/shadow/glow tokens (Story 5.1), fretboard-specific tokens, text scale, and dot tokens.
6. **AC6 — Dot colours actually change per theme.** `FretDot.tsx`'s `DOT_CONFIG` currently hardcodes one fixed hex palette regardless of theme (the `--color-dot-*` CSS tokens exist but are dead — confirmed dead in the 5.5 code review). This story wires `FretDot` to consume the CSS custom properties so dot fill/opacity/text colour genuinely vary per active theme; the dark/light Aurora palette (gold/violet/cyan/fuchsia/pink, Story 5.5) must render unchanged after the refactor — this is a rewiring, not a re-tune, for those two themes.
7. **AC7 — WCAG 2.1 AA contrast audit, all 6 themes.** For each theme: dot fill vs. fretboard background (accounting for opacity-compositing, per the exact method `FretDot.test.tsx` already uses) and note-name text vs. composited dot fill both clear 4.5:1. Deuteranopia/protanopia separation is verified for the root/scale/mode trio in the 4 new themes, matching the 5.5 precedent. Chrome (control bar, panels, dropdowns) text-vs-background contrast is sanity-checked per theme.
8. **AC8 — Regression.** Full frontend suite, `type-check`, `lint`, `build` all green. No behavioural change to the existing free dark/light toggle or to dark/light dot rendering.

## Tasks / Subtasks

- [x] **Task 1: Extend `themeStore.ts`** (AC: 1, 2, 4)
  - [x] Widen `Theme` to `'dark' | 'light' | 'neon' | 'mono' | 'vibrant' | 'minimal'`
  - [x] Add `FREE_THEMES = ['dark', 'light']` / `PREMIUM_THEMES = ['neon', 'mono', 'vibrant', 'minimal']` (or equivalent) exported for `ThemePicker` and the guard hook to share
  - [x] `applyThemeToDom`: toggle the `.dark` class for the **dark-family** themes (`dark`, `neon`, `mono`, `vibrant`), not just `theme === 'dark'` — `minimal` and `light` are the light-family (see Dev Notes — dark-class family)
  - [x] **Keep `getInitialTheme()`'s synchronous localStorage read narrowed to `'light' | 'dark'` only** — do not widen it to accept the 4 premium values (see Dev Notes — Design Decision: entitlement-resolution sequencing for why)
- [x] **Task 2: New theme token blocks in `index.css`** (AC: 5, 6)
  - [x] Add `[data-theme="neon"]`, `[data-theme="mono"]`, `[data-theme="vibrant"]`, `[data-theme="minimal"]` blocks, each defining the same token set as the existing `.dark`/`:root` blocks (base, surfaces, brand, structure, glass/shadow/glow, fretboard-specific, text scale, `--color-dot-*` + a `--dot-text-*` var per dot state)
  - [x] Seed values from `ux-design-specification.md#Premium Theme Token Overrides` (background + root/scale/mode hexes given below in Dev Notes) — **freeform and mode-root have no seed values** (those two dot states didn't exist when that section was written); pick hues consistent with each theme's palette and verify in Task 5
- [x] **Task 3: Wire `FretDot.tsx` to the CSS tokens** (AC: 6)
  - [x] Replace `DOT_CONFIG`'s hardcoded `fill`/`textColor` hex with `var(--color-dot-{state})` / `var(--dot-text-{state})`, keeping `radius`/`opacity` as JS constants (unchanged — only colour varies per theme, see Dev Notes — Design Decision: opacity stays constant)
  - [x] For dark/light, the CSS values must equal the current hardcoded hex exactly (no visual regression) — copy the exact hex from the current `DOT_CONFIG` into the `.dark`/`:root` blocks' `--color-dot-*`/`--dot-text-*` vars (extending `--dot-text-scale`, which already exists, with the 4 siblings that don't yet: `--dot-text-root`, `--dot-text-mode`, `--dot-text-mode-root`, `--dot-text-freeform`)
- [x] **Task 4: `ThemePicker` component** (AC: 1, 2, 3)
  - [x] New `frontend/src/features/settings/ThemePicker.tsx`, modeled on `CustomTuningCreator.tsx`'s conventions; renders the 6 themes, dark/light first then the 4 premium; locked rows use the `LibraryItem` lock-badge pattern (`Badge` + `Lock` from `lucide-react`)
  - [x] Reuse the `LibraryPanel`-established paywall-trigger convention: lift a `paywallAnchor` state up (into `ControlBar`, which doesn't currently render `PaywallCard` at all — add it), pass an `onPaywallTrigger={(el) => setPaywallAnchor(el)}` callback down, render `<PaywallCard open={!!paywallAnchor} anchorEl={paywallAnchor} onClose={() => setPaywallAnchor(null)} />` once in `ControlBar`
  - [x] Mount `<ThemePicker />` inside the existing Account `Sheet` in `ControlBar.tsx` (between `SheetHeader` and the "Log out" `Button`)
- [x] **Task 5: `useThemeGuard` hook — entitlement sequencing** (AC: 4)
  - [x] New `frontend/src/hooks/useThemeGuard.ts`, wired into `App.jsx` alongside `useSessionSync()`
  - [x] One-shot restore: once `isAuthenticated && isPremium` first resolves true, read the **raw** `localStorage` value directly (bypassing `getInitialTheme`'s dark/light-only filter) — if it's one of the 4 premium theme names, call `setTheme()` with it
  - [x] Downgrade fallback: track the previous `isPremium` value via a ref; **only** on a genuine `true → false` transition (not on "currently false", which is also true on initial mount and would wrongly fire for every free/anonymous user — this is the exact bug class 4.4's code review caught and fixed for auth transitions), if the current theme is one of the 4 premium themes, call `setTheme('dark')`
  - [x] Same transition-tracking on `isAuthenticated` (logout should also fall back if the active theme was premium) — implemented as one combined `isEntitled = isAuthenticated && isPremium` ref rather than two separate refs (see Dev Agent Record: functionally equivalent, avoids two effects racing to reset the same guard ref)
- [x] **Task 6: WCAG + colour-blind audit** (AC: 7)
  - [x] Extend `FretDot.test.tsx`'s composited-contrast guardrail suite (`BOARD` hex map + the `composite`/`contrast` helpers already there) to cover the 4 new themes — every dot state must clear 4.5:1 the same way dark/light already do
  - [x] Deuteranopia/protanopia simulation pass on the root/scale/mode trio for each new theme (same method as 5.5) — computed via a Brettel/Viénot-style simulation matrix, not just eyeballed; caught and fixed one real failure (see Dev Agent Record)
  - [x] Live-verify chrome contrast (control bar, dropdowns, sheets) in Chrome for all 4 new themes — screenshotted live via a running dev server for all 4, dots + chrome + note-name text all confirmed legible
  - [x] Adjust Task 2's seed hex values as needed to pass; document final values and any deviation from the seed values
- [x] **Task 7: Tests** (AC: 1–8)
  - [x] `themeStore.test.ts` (new — none currently existed): theme union validation, dark-class-family toggling, `getInitialTheme` narrowing, persistence
  - [x] `ThemePicker.test.tsx`: renders 6 rows, lock badges for premium when `!isPremium`, selecting unlocked theme calls `setTheme`, clicking locked theme triggers paywall not theme change
  - [x] `useThemeGuard.test.tsx`: one-shot restore on entitlement resolving true, fallback only on genuine downgrade transition (not on initial-mount-false), no fallback loop
  - [x] Account-sheet + `PaywallCard` wiring tests — added to `ControlBar.auth.test.tsx` (not `ControlBar.test.tsx`; that file already holds all the authenticated/Account-sheet coverage, e.g. the logout test — matching that existing split rather than introducing a second location for the same kind of test)
- [x] **Task 8: Regression** — `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build`, backend untouched (this story is frontend-only, no new/changed API routes)

## Developer Context

### Current state to build on — read this before writing any code
The source docs (`epics.distillate.md`, `ux-design-specification.distillate.md`) describe this story as if it's the *first* theming work in the app. **It isn't.** Two things already shipped that change the shape of this story significantly:

1. **A free dark/light toggle already exists** (`frontend/src/stores/themeStore.ts`, wired into `ControlBar.tsx` via a Sun/Moon `IconButton`). It's a quick-dev addition from 2026-09-01, unrelated to this story's original spec, which only anticipated a single free `dark` theme. `Theme` is currently `'dark' | 'light'`; `data-theme` is already on `<html>`; `localStorage['guitar-app-theme']` already persists it. **Do not build a parallel/competing mechanism** — extend this exact store.
2. **The fretboard dot palette was already retuned once** (Story 5.5, Epic 5): `FretDot.tsx`'s `DOT_CONFIG` hardcodes gold/violet/cyan/fuchsia/pink hex values directly in JS, per dot state, **the same values for every theme**. The `--color-dot-*` CSS custom properties in `index.css` *look* like the right mechanism but are dead code — nothing reads them (confirmed by grep in the 5.5 code review, and re-confirm yourself before starting). This story is what finally makes them real.

Read `frontend/src/stores/themeStore.ts`, `frontend/src/components/FretDot.tsx`, and the `.dark`/`:root` blocks in `frontend/src/index.css` (lines ~52–242) fully before starting.

### Design Decision: dark-class family, not `theme === 'dark'`
Many existing components use Tailwind's `dark:` utility variant, which this codebase ties to the `.dark` **class** (`@custom-variant dark (&:is(.dark *))` in `index.css`), not the `data-theme` attribute. `neon`, `mono`, and `vibrant` are all dark-background themes — if `applyThemeToDom` only toggles `.dark` for literal `theme === 'dark'`, every existing `dark:`-prefixed utility across the app silently reverts to its light-mode styling under those three themes, while `[data-theme="neon"]` etc. correctly overrides the CSS-custom-property tokens. This is the single easiest way to half-implement this story and not notice until a live check. `minimal` (light background, per its seed value below) joins `light` in the light-family and must **not** get the `.dark` class.

### Design Decision: entitlement-resolution sequencing (read carefully — same trap as 4.4)
`isAuthenticated`/`isPremium` are asynchronous (silent cookie-refresh + a TanStack Query fetch), exactly as documented in `4-4-session-persistence.md`'s "Design Decision: auth/premium sequencing." That story's fix pattern — a one-shot effect gated on `[isAuthenticated, isPremium]` resolving true, plus a previous-value ref so a downgrade effect only fires on a genuine `true→false` transition and not on "currently false" (which is also true on every anonymous/free user's initial mount) — applies here identically. Two consequences specific to this story:

- **`getInitialTheme()`'s synchronous localStorage read must stay narrowed to `'light' | 'dark'`.** It runs at module-load time, before React mounts and long before subscription status resolves. If it were widened to accept the 4 premium values, a logged-out visitor on a shared device (or a premium user whose subscription just lapsed) would flash the last-chosen premium theme before the guard hook has any chance to correct it. Keeping the free values as the only synchronous default makes that flash structurally impossible — the premium theme is only ever re-applied *after* `useThemeGuard` confirms entitlement.
- The restore-on-resolve and fallback-on-downgrade are two separate effects/branches in `useThemeGuard`, not one — a user can be mid-restore (entitlement just confirmed true, applying their stored neon preference) on one render and a different user context (downgrade) on another; don't conflate them into a single "isPremium changed" effect the way a first draft naturally would.

### Design Decision: opacity stays constant across themes
The original UX spec sketched per-theme dot opacity (dark 0.85, neon 0.95, mono 0.90, vibrant 0.90, minimal 0.80 — for the `scale` state). This story does **not** implement that axis. Reason: the 5.5 code review already demonstrated how easy opacity-compositing contrast math is to get subtly wrong even for two themes (the original `scale`-state contrast check tested the nominal fill instead of the true alpha-composited-with-background colour, and shipped a real AA failure). Adding a second variable (per-theme opacity, on top of per-theme fill hue) across 6 themes multiplies that risk for a benefit the ACs don't require. **Keep `radius`/`opacity` as the existing fixed-per-state JS constants in `FretDot.tsx`; only `fill`/`textColor` become theme-variable (via CSS var).** If a specific new theme's contrast can't be made to pass at the existing fixed opacity for a given state, that's a signal to adjust that theme's fill hue/lightness (Task 6), not to reopen the opacity axis.

### Seed values (starting point only — Task 6 audits and may adjust)
From `ux-design-specification.md#Premium Theme Token Overrides` (pre-dates Epic 5's freeform/mode-root states, so those two are not seeded — pick hues consistent with the rest of each palette and verify):
- **Neon** — bg `#0a0a0a`; root `#4ade80` green, scale `#22d3ee` cyan, mode `#f0abfc` pink
- **Mono** — bg `#1a1a1a`; root `#f1f5f9` white, scale `#94a3b8` slate, mode `#cbd5e1` light slate
- **Vibrant** — bg `#0d1b2a`; root `#fbbf24` gold, scale `#818cf8` violet, mode `#f87171` coral-red
- **Minimal** — bg `#f5f5f0` (light-family); root `#92400e` dark amber, scale `#3730a3` dark indigo, mode `#9f1239` dark rose

These bg values are a starting anchor for each theme's `--background`; derive `--card`/`--popover`/`--color-fretboard`/glass tokens/etc. the same way the existing `.dark` block derives them relative to its own `--background` (a fretboard slightly lighter than the page background, popover slightly lighter than card, and so on) rather than inventing a new relationship per theme.

### Fixed Constraints
- No new frontend dependencies.
- Do NOT modify `frontend/src/data/*.js` (musicTheory.js, tunings.js, scales.js).
- No backend changes, no new API routes — this is entirely frontend/CSS/localStorage.
- `radius`/`opacity` in `FretDot.tsx`'s `DOT_CONFIG` stay as fixed JS constants (see Design Decision above) — only `fill`/`textColor` move to `var(--...)`.
- Never let `getInitialTheme()` synchronously resolve to a premium theme name (see Design Decision above).
- Reuse `LibraryItem`'s lock-badge visual convention and `PaywallCard`'s existing `{ open, onClose, anchorEl, inline? }` prop contract exactly — do not create a second paywall component.

### File Structure
- **NEW:** `frontend/src/features/settings/ThemePicker.tsx`, `ThemePicker.test.tsx`
- **NEW:** `frontend/src/hooks/useThemeGuard.ts`, `useThemeGuard.test.tsx`
- **NEW:** `frontend/src/stores/themeStore.test.ts` (none currently exists)
- **MODIFIED:** `frontend/src/stores/themeStore.ts` (widen `Theme`, dark-class-family logic, narrow `getInitialTheme`)
- **MODIFIED:** `frontend/src/index.css` (4 new `[data-theme="..."]` blocks; extend `.dark`/`:root` with the 4 missing `--dot-text-*` vars)
- **MODIFIED:** `frontend/src/components/FretDot.tsx` (CSS-var-driven `DOT_CONFIG` fill/textColor)
- **MODIFIED:** `frontend/src/components/FretDot.test.tsx` (extend `BOARD` map + contrast suite to 4 new themes)
- **MODIFIED:** `frontend/src/components/ControlBar.tsx` (mount `ThemePicker` in Account sheet; add `paywallAnchor` state + render `PaywallCard`, not currently imported there)
- **MODIFIED:** `frontend/src/components/ControlBar.test.tsx`
- **MODIFIED:** `frontend/src/App.jsx` (wire `useThemeGuard()`)

### Previous Story Intelligence (4.4 — session persistence; 5.5 — dot retune + contrast audit)
- 4.4's entire "auth/premium sequencing" and "cross-account leak on unreset guard ref" lessons transfer directly — see Design Decision above. Its fix shape (previous-value ref, only act on genuine transition) is the template for `useThemeGuard`.
- 5.5's code review caught a WCAG failure because the original contrast test checked nominal fill colour, not the true opacity-composited-with-background render. `FretDot.test.tsx` already has the correct `composite()`/`contrast()` helpers and a `BOARD` hex-per-theme map — extend that map and the `it.each(states)` loop for the 4 new themes rather than writing a parallel test approach.
- 5.5 also found `mode-root` needed a hue shift off `scale`'s violet for at-a-glance separation in the dark/light palette — expect the same kind of adjustment may be needed per new theme in Task 6, not just a straight port of the seed hexes.

### Git Intelligence
Recent commits (`305c020` "epic-5: UI/UX Aurora glass-first overhaul", `f373880` "4.4: premium session persistence") both follow: implement → full regression → 3-layer code review → patches → done. Follow the same shape. `305c020` in particular is the commit that introduced the currently-dead `--color-dot-*` tokens and the `.dark`/`[data-theme]` dual-selector convention this story extends — worth a quick `git show 305c020 -- frontend/src/index.css` skim before writing the new theme blocks.

## Success Criteria
✅ 6 themes selectable from the account menu, 4 gated premium with lock+paywall ✅ dark/light visually unchanged after the `FretDot` CSS-var refactor ✅ all 4 new themes' dot states + chrome pass WCAG 2.1 AA (composited, not nominal) ✅ colour-blind separation verified for root/scale/mode in new themes ✅ premium-loss silently falls back to dark, with no flash of a locked theme on load ✅ no new dependencies, no backend/API changes ✅ full regression green

## Deferred / Out of Scope
- Per-theme dot opacity (see Design Decision: opacity stays constant)
- A "reset to default theme" affordance beyond the automatic premium-loss fallback (not requested by any AC)
- Cross-browser `backdrop-filter` re-verification for the 4 new themes (5.5 already did this audit for the glass system itself, which is theme-token-driven and doesn't change structurally here — only re-verify if a new theme's glass alpha values visibly break the fallback)

## Dev Agent Record

### Agent Model Used
Claude Sonnet 5

### Debug Log References
- `pnpm vitest run src/stores/themeStore.test.ts` → 22/22 green
- `pnpm vitest run src/components/FretDot.test.tsx` → 47/47 green (30 new contrast assertions across 4 themes + mode-root coverage added)
- `pnpm vitest run src/features/settings/ThemePicker.test.tsx` → 8/8 green
- `pnpm vitest run src/hooks/useThemeGuard.test.tsx` → 8/8 green
- `pnpm vitest run src/components/ControlBar.test.tsx src/components/ControlBar.auth.test.tsx` → 31/31 green
- `pnpm type-check` → clean
- `pnpm lint` → 1 error found and fixed (unused `vi` import in `useThemeGuard.test.tsx`), then clean
- `pnpm vitest run` (full suite) → **363/363 green** (was 301 before this story; +62 new tests)
- `pnpm build` → succeeds (pre-existing >500kB chunk-size warning, unrelated to this story)
- Live-verified in a running dev server (Chrome): all 4 new themes' dots (root/scale/mode/mode-root/freeform), note-name text, and chrome (control bar, mode chips) screenshotted and visually confirmed legible — see Completion Notes for the real bug this caught.

### Completion Notes List
- **AC1–AC3 (picker, selection, locking) done.** `ThemePicker.tsx` mounted in the existing Account sheet; reuses `LibraryItem`'s lock-badge convention and the `LibraryPanel`-established lifted-`paywallAnchor` + shared `PaywallCard` pattern (which `ControlBar.tsx` didn't have at all before this story — added).
- **AC4 (premium-loss fallback / restore) done.** `useThemeGuard.ts` mirrors `useSessionSync`'s auth/premium async-sequencing fix exactly, but simplified to a single combined `isEntitled = isAuthenticated && isPremium` transition ref instead of two separate ones — the story sketched tracking `isPremium` and `isAuthenticated` separately, but since a downgrade is "either one going false while both were true," one combined ref is equivalent and avoids two effects racing to reset the same guard state. `getInitialTheme()` stays narrowed to free-only (unchanged) so a premium theme can never flash before entitlement resolves.
- **AC5 (new theme tokens) done — with one bug caught by actually loading the app.** The first draft of the 4 new `[data-theme]` blocks in `index.css` had a comment containing the literal substring `--glow-*/--shadow-*`, which is `*/` inside a CSS comment — it closed the comment early, and Tailwind's CSS engine threw `Invalid custom property, expected a value`, breaking the entire app (blank/error-overlay page). Caught only because Task 6 involved actually starting the dev server and loading the page in Chrome, not just running vitest (which doesn't parse `index.css` through the real CSS pipeline). Fixed by rewording the comment. **Take-away for future CSS-heavy stories: a `pnpm build` alone would NOT have caught this either in every case worth noting** — it happened to fail immediately in dev mode; always do at least one live page-load check after non-trivial CSS changes, not just the automated regression suite.
- **AC6 (theme-driven dots) done.** `FretDot.tsx`'s `DOT_CONFIG` now sources `fill`/`textColor` from `var(--color-dot-{state}, <original-hex-fallback>)` — the fallback is the exact original hardcoded hex, so dark/light render byte-identical pre/post-refactor (verified: existing 5.5 contrast tests, updated only to expect the var() string instead of raw hex, still pass at the same ratios). Discovered the `--color-dot-mode-root` token didn't exist at all in `index.css` before this story (only root/scale/mode/freeform were ever added in 5.5) — added it to `:root`/`.dark` too, matching `FretDot.tsx`'s existing hardcoded mode-root hex, plus the missing `--dot-text-root`/`--dot-text-mode`/`--dot-text-mode-root`/`--dot-text-freeform` vars (only `--dot-text-scale` existed before).
- **AC7 (WCAG + colour-blind audit) done — real values computed, not eyeballed, and one real failure caught and fixed.** Wrote a script implementing the exact same composite-then-contrast algorithm `FretDot.test.tsx` uses, plus a Brettel/Viénot-style protanopia/deuteranopia simulation matrix, to choose and verify every new theme's dot palette before writing any CSS. All contrast ratios clear 4.5:1 with comfortable margin (lowest: minimal/freeform at 6.24:1). The colour-blind simulation caught a real problem in the first-draft `minimal` theme: its seed `mode` colour (dark rose, from the old UX-spec) sat only 18.8–28.2 units from `root` (dark amber) under simulation — visually confusable for red-green colour-blind users. Fixed by moving `mode` to a dark green (`#166534`), which clears 84+ against both `root` and `scale` under both simulations. This pushed `freeform`'s indigo-adjacent proximity to `scale` down to ~22-24 (still not ideal), accepted as a documented residual since (a) AC7 only requires the root/scale/mode **trio**, and (b) freeform dots already render an extra dashed ring as a non-colour shape cue (`FretDot.tsx`), which the trio states don't have.
- **AC8 (regression) done.** See Debug Log — 363/363 tests, type-check clean, lint clean, build succeeds.
- **Deviation from the story's suggested test location:** the story's File Structure listed `ControlBar.test.tsx` for the new Account-sheet/`PaywallCard` tests; they were added to `ControlBar.auth.test.tsx` instead, since that file already owns all authenticated/Account-sheet coverage (e.g. the existing logout test) — matching the codebase's existing split rather than duplicating that setup in a second file.

### File List
**NEW:**
- `frontend/src/stores/themeStore.test.ts`
- `frontend/src/features/settings/ThemePicker.tsx`
- `frontend/src/features/settings/ThemePicker.test.tsx`
- `frontend/src/hooks/useThemeGuard.ts`
- `frontend/src/hooks/useThemeGuard.test.tsx`

**MODIFIED:**
- `frontend/src/stores/themeStore.ts` (widened `Theme`, `FREE_THEMES`/`PREMIUM_THEMES`/`isPremiumTheme`, `readStoredTheme`, dark-class-family toggling)
- `frontend/src/index.css` (4 new `[data-theme]` blocks; added missing `--color-dot-mode-root` + 4 missing `--dot-text-*` vars to `:root`/`.dark`; extended the `prefers-reduced-transparency` selector list)
- `frontend/src/components/FretDot.tsx` (`DOT_CONFIG` now CSS-var-driven with hex fallbacks)
- `frontend/src/components/FretDot.test.tsx` (updated per-state fill assertions to the var() form; added `mode-root` coverage; generalized the contrast suite to all 6 themes)
- `frontend/src/components/ControlBar.tsx` (mounted `ThemePicker` in the Account sheet; added `paywallAnchor` state + `PaywallCard`, not previously imported there)
- `frontend/src/components/ControlBar.auth.test.tsx` (added theme-picker + paywall-trigger coverage)
- `frontend/src/App.jsx` (wired `useThemeGuard()`)

### Change Log
| Date | Change |
|---|---|
| 2026-09-15 | Story 4.5 implemented — premium theme picker (dark/light free, neon/mono/vibrant/minimal premium) in the Account sheet, `useThemeGuard` entitlement restore/fallback, `FretDot.tsx` rewired to genuinely theme-driven CSS-var dot colours, 4 new fully-audited theme token blocks in `index.css`. Caught and fixed a real CSS syntax bug (a comment containing a literal `*/` broke the whole app) via a live Chrome check, and a real colour-blind-separation failure (minimal theme's original mode/root colours too similar under protanopia/deuteranopia simulation) via computed simulation, not eyeballing. 363/363 frontend tests green (+62 new), type-check clean, lint clean, build succeeds. Status → review. |
| 2026-09-15 | Code review (3-layer parallel) — 0 AC violations. Applied 4 patches: hardened `readStoredTheme`/`setTheme` against throwing localStorage (Safari private mode / sandboxed iframes / blocked storage), added `isValidTheme` guard + tightened `readStoredTheme(): Theme \| null` (dropped two `as Theme` casts in `useThemeGuard`), plus regression tests for undefined-paywall-callback, rapid successive selections, and corrupted-storage values. One HIGH ("hasRestoredRef not reset on logout") confirmed a false positive — already handled at `useThemeGuard.ts:60` and covered by an existing test. 5 findings dismissed as noise/pre-existing. 383/383 frontend tests green (+20), type-check clean, lint clean, build succeeds. Status → done. |

### Review Findings (Code Review 2026-09-15)

3-layer parallel review (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Auditor: 0 AC violations, all 8 ACs confirmed. 13 raw findings → triaged to 4 real patches (all applied), 1 false positive corrected, 5 dismissed as noise/pre-existing.

**Decision-Needed: 0 · Patches applied: 4 · False positive: 1 · Deferred: 0 · Dismissed: 5**

#### Patch Items (all applied)

- [x] [Review][Patch] `readStoredTheme()` lacks validation & error handling [frontend/src/stores/themeStore.ts] — localStorage `getItem`/`setItem` throw (not just return null) in Safari private mode, sandboxed iframes, and storage-blocked contexts, which would crash module load or a theme switch. Also no validation that a stored value is a real theme. **Fixed:** added `safeGetStoredTheme`/`safePersistTheme` try-catch wrappers (used by `getInitialTheme`, `readStoredTheme`, and `setTheme`), an exported `isValidTheme` type guard, and narrowed `readStoredTheme()`'s return type to `Theme | null` so garbage can never reach `setTheme` — which also let `useThemeGuard` drop its two unchecked `as Theme` casts. +8 tests (corrupted value, throwing get/set, isValidTheme guard).

- [x] [Review][Patch] `ThemePicker` missing test for undefined `onPaywallTrigger` callback [frontend/src/features/settings/ThemePicker.test.tsx] — call site uses optional chaining (`onPaywallTrigger?.(...)`) so it's safe, but no test guarded it against regression. **Fixed:** added a test that clicks a locked premium theme with no callback prop and asserts no throw + theme unchanged.

- [x] [Review][Patch] Rapid consecutive theme selections lacked coverage [frontend/src/stores/themeStore.test.ts] — no test for back-to-back `setTheme` calls or a dark→light→dark family sequence. **Fixed:** added 2 tests asserting last-write-wins on theme/localStorage/`data-theme` and correct final `.dark` class.

- [x] [Review][Patch] Corrupted localStorage theme value [frontend/src/stores/themeStore.test.ts] — folded into the first patch: `readStoredTheme()` now returns `null` for invalid stored strings, covered by a dedicated test.

#### Corrected (false positive)

- [x] [Review][FalsePositive] "Cross-account restore leak: `hasRestoredRef` not reset on logout" — **already handled in the shipped code.** `useThemeGuard.ts:60` resets `hasRestoredRef.current = false` inside the `wasEntitled && !isEntitled` fallback branch, and `useThemeGuard.test.tsx:51` ("restores again after a downgrade-then-re-entitle transition") already proves restore fires for a second user on the same tab. The Blind Hunter flagged this from the prose summary it was given (which omitted that line), not the actual source. Verified: on logout the fallback also writes `dark` to localStorage, so a subsequent free/premium user never inherits the prior user's premium theme — no leak. No change made.

#### Dismissed (5)

- CSS vars "incomplete" for new themes — false positive; all 5 dot states are defined in every `[data-theme]` block.
- `wasEntitledRef` stale on out-of-order dependency arrival — mitigated by the two-effect split; explicitly covered by the "subscription expiry while logged in" test.
- "Unnecessary repeated ref updates in restore effect" — that assignment IS the transition-tracking mechanism (copied from 4.4's `useSessionSync`); correct as written.
- Quick-toggle aria-label on a premium theme says "Switch to dark" — correct behaviour; the toggle intentionally cycles dark↔light only, full picker lives in the Account sheet.
- `--muted: #ececE5` uppercase hex in the minimal block — cosmetic; CSS hex is case-insensitive. (Left as-is; not worth a churn.)
