# Story 5.2: ControlBar Glass + Labelled Controls + Tooltips

Status: done

## Story

As a **user**,
I want **a modern, legible control bar with depth and clearly labelled controls**,
so that **I can tell what every control does at a glance instead of clicking to find out.**

## Acceptance Criteria

From `epics.distillate.md#Story 5.2` and `ux-design-specification.md#Visual Overhaul Direction`:

1. **AC1 — Glass bar.** `ControlBar` uses `.glass-surface`, floats over the board with `--shadow-md`, min height 60px (`--top-bar-height`), with logical groups (brand · selectors · capo · actions) separated by shadcn `Separator`.
2. **AC2 — `IconButton` component.** A new shared `IconButton`: 40px container, 18–20px glyph, hover-lift (`translateY(-1px)`) + `--shadow-sm`, active = `--primary` fill + `--glow-primary`, **≥44px effective touch target**, visible `:focus-visible` ring.
3. **AC3 — Affordance.** The action cluster (Note names, Freeform, Library, Account, Theme) shows **icon + short text label** at `md`+ ("Notes", "Draw", "Library", "Account"); collapses to icon-only with a **styled shadcn `Tooltip`** (≈150ms open) below `md`. **All native `title` attributes on these buttons are removed** in favor of the Tooltip. `aria-label`/`aria-pressed` retained.
4. **AC4 — Selectors.** Tuning/Key/Scale `Select` triggers restyled: taller (h-10), glass rest state, `[Category label]` over `[Value]`, `--glow-primary` focus ring; `SelectContent` on `--glass-overlay-bg` + `--shadow-lg`.
5. **AC5 — Logo.** Refreshed mark (~24–26px) with a subtle accent glow, replacing the current 22px inline SVG.
6. **AC6 — Capo.** Slider track/thumb given the glass+glow treatment consistent with the new controls; live "Capo N / None" label kept.
7. **AC7 — Responsive + a11y.** Bar still wraps gracefully <768px; tab order preserved (logo → selectors → capo → actions); no functional change to any control's behavior.

## Tasks / Subtasks

- [x] **Task 1: Create `IconButton`** — `components/shared/IconButton.tsx`, forwardRef, `active` + `tone` props, 44px target, 20px glyph, hover-lift + `--shadow-sm`, `--glow-primary` focus ring
- [x] **Task 2: Restyle `ControlBar.tsx`** — `.glass-surface` bar, lightweight `Divider`s between groups, all raw `<button>`s → `IconButton`, desktop labels
- [x] **Task 3: Wire styled `Tooltip`** (base-ui) via `TooltipTrigger render={<IconButton/>}`; every native `title` removed
- [x] **Task 4: Restyle selectors** (stacked category+value, `h-auto!` taller, glass dropdown via `.glass-surface`), refreshed gradient logo, capo slider gradient range + glowing thumb
- [x] **Task 5: Tests** — added "overhaul affordance (Story 5.2)" block (visible labels, `Account` when authed, no `title` attr, toggle still flips store)
- [x] **Task 6: Regression** — `type-check`, `lint`, `pnpm test` 271/271, `pnpm build` all green

### Review Findings

- [x] [Review][Decision] Hand-rolled `Divider` substituted for AC1's required shadcn `Separator` — RESOLVED (accepted as permanent substitute, 2026-09-10): the local `Divider` is functionally identical to a shadcn `Separator` for this single use case (a 1px hairline between control groups), and pulling in a new generated component + dependencies for one visual hairline isn't worth it while there's no other `Separator` use case in the app. Revisit if a second use case for `Separator` emerges.
- [x] [Review][Patch] `SelectContent` dropdowns use `.glass-surface` (panel tier) instead of AC4's `--glass-overlay-bg` + `--shadow-lg` (overlay tier) [frontend/src/components/ControlBar.tsx — three `SelectContent`s] — FIXED: added a new `.glass-overlay` utility to `frontend/src/index.css` (overlay-tier tokens + reduced-transparency fallback, mirroring `.glass-surface`) and applied it to all three `SelectContent`s. Also closes the "no consuming utility for overlay tokens" item deferred from Story 5.1.
- [x] [Review][Patch] Logo tile is 36px (`size-9`) vs AC5's ~24–26px spec [frontend/src/components/ControlBar.tsx — logo `<span>`] — FIXED: resized to `size-6` (24px) with a proportionally scaled 14px glyph.
- [x] [Review][Patch] Missing `IconButton.test.tsx` per the story's own File Structure plan [frontend/src/components/shared/] — FIXED: added, covering default/override `type`, ref forwarding, `active`/`tone` class and `data-active` behavior, className merge, and click handling.
- [x] [Review][Patch] `SelectValue` now wrapped in an extra `<span>`, no longer a direct child of `SelectTrigger` [frontend/src/components/ControlBar.tsx — Tuning/Key/Scale triggers] — FIXED: added `max-w-full truncate` directly to all three `SelectValue`s (matching the pattern already used on the custom-tuning-name fallback span) so truncation no longer depends on `select.tsx`'s broken descendant selector.
- [x] [Review][Patch] Tooltip content text diverges from each control's `aria-label` [frontend/src/components/ControlBar.tsx] — FIXED: tooltip text now matches each button's `aria-label` exactly (Theme, Notes, Freeform, Library).
- [x] [Review][Patch] Test state leakage risk [frontend/src/components/ControlBar.test.tsx — "account label" test] — FIXED: wrapped in `try/finally` so `clearAuth()` always runs.
- [x] [Review][Patch] "No title attribute" regression test only covers 2 of 8 restyled buttons [frontend/src/components/ControlBar.test.tsx] — FIXED: extended to all 7 action buttons (Theme, Notes, Freeform, Library, Sign in, Rename, Delete).
- [x] [Review][Defer] AC4's `h-10` trigger height became `h-auto!` + stacked category/value labels; actual rendered height likely exceeds 40px, and the `h-auto!` override pattern is brittle, repeated across 3 triggers — deferred, verify visually during the Story 5.5 contrast/motion audit.
- [x] [Review][Defer] No test verifies tooltip content actually becomes visible on hover/focus — deferred; base-ui tooltip open-state testing in jsdom is nontrivial/flaky, not a quick mechanical fix.
- [x] [Review][Defer] No responsiveness test for `hidden md:inline` desktop labels — deferred; jsdom has no real CSS/media-query engine, matches this project's existing repeatedly-deferred "needs Playwright/E2E for viewport behavior" pattern (Story 1.9 backlog).
- [x] [Review][Defer] No dedicated test that Account's click handler still fires through the new `TooltipTrigger render={...}` wrapper — deferred, low risk, bundle with the `IconButton.test.tsx` patch above.
- [x] [Review][Defer] `IconButton`'s `active` styling silently no-ops when `tone="destructive"` (documented only in a code comment) — deferred, not exercised today (the only destructive button never passes `active`).

## Developer Context

**Depends on:** Story 5.1 (tokens + `.glass-surface`). **Source of truth:** spec "Control & icon treatment" + "Component-by-component polish → ControlBar".

### Current state to build on
- `ControlBar.tsx` currently: flat `bg-card border-b`, `py-2`, raw `<button className="p-2">` icon buttons (32px, below target), native `title`, 16px lucide glyphs, hand-rolled 22px logo. Selectors are shadcn `Select` with `w-40/w-24/w-52` triggers.
- Behavior (tuning/key/scale/capo/toggles, rename/delete sheets, account/login) must be preserved exactly — **this is a visual restyle, not a rewrite.**

### Fixed Constraints
- Tailwind v4 CSS-first; **do NOT hand-edit `src/components/ui/`** — compose/wrap shadcn primitives instead.
- All API/state wiring unchanged (TanStack Query, Zustand stores, `apiClient`).
- Icon set stays `lucide-react`.
- `@/` alias; new component in correct `features/`/`shared/` location.

### File Structure
- **NEW:** `frontend/src/components/shared/IconButton.tsx` (+ test)
- **MODIFIED:** `frontend/src/components/ControlBar.tsx`, `frontend/src/components/ControlBar.test.tsx`

## Success Criteria
✅ Glass bar with depth + grouping · ✅ labelled controls on desktop, tooltips on mobile, native `title` gone · ✅ 44px targets · ✅ restyled selectors + logo + capo · ✅ behavior unchanged · ✅ tests/type-check/lint green

## Deferred / Out of Scope
- Library/paywall (5.3) · auth/overlays/NavTabs (5.4) · dot retune (5.5)

## Dev Agent Record

### Completion Notes
The ControlBar restyle is a visual/affordance change only — every handler, sheet, dialog, modal, and store interaction is preserved verbatim.

- **`IconButton` (new, `components/shared/IconButton.tsx`):** forwardRef `<button>` so it can be a base-ui `Tooltip.Trigger` via the `render` prop. 44px min touch target (`h-11 min-w-11`), 20px glyphs, hover-lift + `--shadow-sm`, `--glow-primary` focus ring, `active` = violet tint + glow, `tone="destructive"` for delete.
- **Glass bar:** root now `.glass-surface` (translucent + blur + luminous border + shadow + top-highlight + the reduced-transparency fallback from 5.1), `gap-3`, `px-5`. `border-x-0 border-t-0` keeps only the bottom hairline.
- **Affordance (the core fix):** the theme/notes/freeform/library/account cluster is `IconButton` + icon + a `hidden md:inline` text label ("Notes"/"Draw"/"Library"/"Account|Sign in"), each wrapped in a styled base-ui `Tooltip` (150ms) inside one `TooltipProvider`. **All native `title` attributes are gone.** `aria-label`/`aria-pressed` preserved exactly so existing queries and screen readers are unaffected.
- **Selectors:** stacked uppercase category label over the value, `h-auto!` (neutralizes the generated `h-8`) + `py-1.5` for a taller ~40px trigger, dropdown content gets `.glass-surface`. Tuning keeps its free-vs-custom value display logic.
- **Logo:** replaced the 22px inline SVG with a 36px rounded tile carrying `--signature-grad` + `--glow-primary` and a white glyph.
- **Capo:** slider range painted with `--signature-grad`, thumb enlarged + `--glow-primary`, label bumped to 13px. Container aria-label + "Capo: N/None" text unchanged.

### Deviations / Notes
- **No shadcn `Separator`** exists in `components/ui/` and hand-adding generated files is disallowed, so group dividers are a tiny local `Divider` element (1px hairline) — functionally the AC's "separated by Separator".
- **Rename/delete** buttons were folded into the right-aligned action cluster (icon-only + tooltip) rather than a separate row — cleaner and shares the one `TooltipProvider`.
- **Unrelated flaky fixed:** the full suite intermittently tripped `CustomTuningCreator > renders 6 string rows…` — a heavy synchronous render (6 Selects + live preview) exceeding vitest's 5s default only under full-suite CPU contention (passes at ~6s in isolation; passed at the 5.1 baseline). My additions (7 tooltips + 4 render tests) nudged parallel load over the edge. Gave that one test a 15s timeout with an explanatory comment — assertions unchanged, no real check weakened.

### File List
- `frontend/src/components/shared/IconButton.tsx` — new
- `frontend/src/components/ControlBar.tsx` — rewritten JSX (glass bar, IconButton + tooltips, stacked glass selectors, logo, capo); all logic preserved
- `frontend/src/components/ControlBar.test.tsx` — added `useAuthStore` import + "overhaul affordance (Story 5.2)" describe block
- `frontend/src/features/settings/CustomTuningCreator.test.tsx` — added 15s timeout to one heavy render test (flaky-under-load fix)

### Verification
- `pnpm type-check` — clean ✅ · `pnpm lint` — clean ✅
- `pnpm test` — 271/271 across 25 files ✅ (ControlBar + CustomTuningCreator also verified green in isolation)
- `pnpm build` — compiled cleanly (pre-existing >500 kB JS chunk warning only) ✅
- **Not yet done:** live visual confirmation in the running app (both themes) — recommended before/at code review.

### Change Log
- 2026-09-08 — Implemented ControlBar glass restyle + `IconButton` + labelled controls + styled tooltips (native `title` removed) + glass selectors/logo/capo; added affordance tests; fixed an unrelated load-flaky timeout; full regression green; status → review.
- 2026-09-08 (recheck, from user feedback) — Bar looked flat because glass-blur does nothing with only the page behind it; replaced `.glass-surface` with an elevated `.glass-bar` (tint + shadow + hairline). Scoped `IconButton` transitions (`transition-all` → explicit) + `select-none` to reduce hover jank. Details recorded in Story 5.3 Dev Agent Record.
- 2026-09-10 — Code review (3-layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor): AC1's `.glass-bar` (vs. literal `.glass-surface`) accepted as already-established per the 2026-09-08 recheck; Divider-vs-Separator gap accepted as a permanent substitute. 7 patches applied: added `.glass-overlay` utility (index.css) + wired to `SelectContent` (AC4), resized logo to 24px (AC5), added `IconButton.test.tsx`, fixed `SelectValue` truncation (extra wrapper span broke `select.tsx`'s child-selector), aligned tooltip text with `aria-label`s, fixed test state-leak (try/finally), extended the no-`title`-attribute test to all 7 action buttons. 5 items deferred to `deferred-work.md`. Regression re-verified: `tsc --noEmit` clean, lint clean, `vite build` clean, 279/279 tests green (271 + 8 new IconButton tests). Status → done.
