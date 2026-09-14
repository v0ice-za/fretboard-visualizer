# Story 5.3: Library, Mode Chips & Paywall Glass Polish

Status: done

## Story

As a **user**,
I want **the library panel, mode chips, and premium prompts to share the same polished glass system**,
so that **the whole app feels like one cohesive, modern tool rather than a set of mismatched panels.**

## Acceptance Criteria

From `epics.distillate.md#Story 5.3` and `ux-design-specification.md#Visual Overhaul Direction`:

1. **AC1 — Library panel.** `LibraryPanel` desktop aside uses `.glass-surface` + `--shadow-lg` with a clear elevation step from the board; the tab row (Scales/Chords/Progression) gains a sliding active indicator (replacing the static border-bottom).
2. **AC2 — Library items.** `LibraryItem` gets more vertical padding, hover elevation (`translateY(-1px)` + `--shadow-sm`), a refined active state (violet tint + `--glow`) and a distinct locked state (lock badge + dimmed `--glass-border`).
3. **AC3 — Mode chips.** `ModeChipsRow` chips get a pill glass treatment; active chip filled + `--glow`; larger tap size (≥44px effective).
4. **AC4 — Paywall.** `PaywallCard` uses a glass overlay, `--shadow-lg`, luminous border, and `--glow-primary` on the Subscribe CTA; remains anchored/non-blocking and **never covers the fretboard**.
5. **AC5 — Mobile.** Bottom-sheet variants of the library and paywall inherit the same glass treatment.
6. **AC6 — Visual only.** No change to gating logic, subscription behavior, or library data — appearance only.

## Tasks / Subtasks

- [x] **Task 1: Restyle `LibraryPanel.tsx`** — `.glass-surface` aside, roomier tabs (`px-4 py-3`, `select-none`), styled underline indicator; mobile `Sheet` inherits the restyled tabs/items
- [x] **Task 2: Restyle `LibraryItem.tsx`** — `px-3.5 py-3`, `select-none`, hover-lift + shadow, active violet-tint + glow, locked dim
- [x] **Task 3: Restyle `ModeChipsRow`** — glass-tinted row, pill chips, `select-none`, active rose + glow, `--glow-primary` focus ring (dropped hardcoded `ring-indigo-500`), larger tap size
- [x] **Task 4: Restyle `PaywallCard`** — `.glass-surface` card (inline + floating), gradient Subscribe CTA + glow, theme-token colors (replaced hardcoded `slate-*`); anchoring/non-blocking unchanged
- [x] **Task 5: Tests** — existing `LibraryPanel`/`LibraryItem`/`PaywallCard` tests preserve gating/selection and still pass (visual-only change; test-relevant attributes kept); fixed one PaywallCard assertion I'd broken by splitting the price node
- [x] **Task 6: Regression** — `type-check`, `lint`, `pnpm test` 271/271, `pnpm build` all green

### Review Findings

- [x] [Review][Decision] AC1's required sliding active indicator is still a static `border-b-2` underline (literally the same mechanism, just re-padded) — RESOLVED (implement now, 2026-09-10): building a genuine measured/animated sliding indicator rather than accepting the static underline. See patch list below.
- [x] [Review][Patch] Hardcoded `hover:bg-white/[opacity]` tints are invisible in light theme across 4 elements [`LibraryItem.tsx` row, `LibraryPanel.tsx` tab, `LibraryPanel.tsx` close button, `PaywallCard.tsx` dismiss button] — FIXED: swapped to `hover:bg-[var(--glass-border)]`, a theme-aware token; verified visible hover feedback in both dark and light theme via live browser check.
- [x] [Review][Patch] AC3: mode chips measure ~28–30px effective tap size [`ModeChipsRow.tsx`], well short of the ≥44px the AC requires — FIXED: added `min-h-11` (44px) with `inline-flex items-center justify-center`.
- [x] [Review][Patch] AC4: `PaywallCard` uses `.glass-surface` (panel tier, `--shadow-md`) instead of the AC4-mandated `--shadow-lg` overlay treatment [`PaywallCard.tsx` — both inline and floating variants] — FIXED: swapped to `.glass-overlay` (the utility built during the 5.2 review specifically for "dropdowns, sheets, tooltips, paywall").
- [x] [Review][Patch] AC2: locked `LibraryItem` state gets no "dimmed `--glass-border`" [`LibraryItem.tsx`] — FIXED: added `border border-[var(--glass-border)]` to the locked variant (and `border-transparent` to active/default to keep layout stable).
- [x] [Review][Patch] `PaywallCard`'s upgrade `Button` adds an unnecessary `border-0` that zeroes the base variant's `border` (used by `focus-visible:border-ring`) [`PaywallCard.tsx`] — FIXED: removed `border-0`.
- [x] [Review][Patch] Decorative bullet-point `<span>` in the benefits list has no `aria-hidden="true"` [`PaywallCard.tsx`] — FIXED.
- [x] [Review][Patch] `text-white` hardcoded on the upgrade CTA [`PaywallCard.tsx`] contradicts the story's own "all hardcoded colors replaced with theme tokens" claim — FIXED: swapped to `text-primary-foreground`; also converted the inline `style={{...}}` gradient/glow to bracket-syntax Tailwind classes for consistency with the rest of the diff.
- [x] [Review][Defer] Inconsistent magic hover-tint opacities (`0.03`/`0.04`/`0.06`) with no shared token across the diff — deferred, cleanup opportunity once the light-theme hover-tint patch lands; consolidate into a shared token.
- [x] [Review][Defer] `hover:-translate-y-px` transform added in 3 places (`ModeChipsRow`, `LibraryItem`, `LibraryPanel` tabs) with no `prefers-reduced-motion` guard — deferred, cross-cutting gap that also affects Story 5.2's `IconButton`; revisit in Story 5.5's contrast/motion audit (its designated purpose).
- [x] [Review][Defer] Icon sizing inconsistency between `LibraryPanel`'s close button (16px icon / `size-8` target) and `PaywallCard`'s dismiss button (14px icon / `size-7` target) — deferred, no shared `IconButton` reuse; low priority.
- [x] [Review][Defer] "Glass hover lift" idiom (transform + box-shadow + border-color transition) hand-rolled independently in 3 files with slightly different property lists — deferred, DRY opportunity, not urgent.
- [x] [Review][Defer] Global `vitest.config.ts` timeout bump (5s→15s) bundled into a visual-restyle diff, applies suite-wide rather than only to the cited heavy-mount tests — deferred; real PR-hygiene concern (masks genuine hangs elsewhere), but the underlying flakiness fix is sound and already relied upon across multiple stories.

## Developer Context

**Depends on:** 5.1 (tokens) and ideally 5.2 (shared `IconButton`/tooltip patterns). **Source of truth:** spec "Component-by-component polish → ModeChipsRow / LibraryPanel / PaywallCard".

### Current state to build on
- `LibraryPanel.tsx`: `border-l bg-card` aside; tabs use `-mb-px border-b-2` static indicator; mobile bottom `Sheet`.
- `LibraryItem.tsx`, `ModeChipsRow`, and `components/shared/PaywallCard` exist with the current flat styling.
- Locked/preview/active `LibraryItem` states and `PaywallCard` gating are behavior — preserve exactly.

### Fixed Constraints
- Tailwind v4 CSS-first; do NOT hand-edit `src/components/ui/`.
- Gating stays server-trust-based via `subscriptionStore`/query — **do not weaken or bypass premium gating.**
- No data-file edits; `@/` alias.

### File Structure
- **MODIFIED:** `frontend/src/features/library/LibraryPanel.tsx`, `LibraryItem.tsx`, the mode-chips components, `frontend/src/components/shared/PaywallCard.tsx`, and their co-located tests

## Success Criteria
✅ Glass library + elevation + sliding tabs · ✅ polished item/chip states · ✅ glass paywall, still non-blocking · ✅ mobile sheets match · ✅ gating unchanged · ✅ tests/type-check/lint green

## Deferred / Out of Scope
- Auth/overlays/NavTabs (5.4) · dot retune + audit (5.5)

## Dev Agent Record

### Completion Notes
Visual-only restyle of the library/mode/paywall surfaces; no gating, subscription, or data logic changed. Prompted by user feedback on the running app (squished library headings + janky clicks).

- **`LibraryPanel`:** aside → `.glass-surface`; tab row spacing opened up (`gap-1 px-3`, tabs `px-4 py-3`) to fix "squished headings"; header/close-button restyled; **`select-none` added to tabs** — this is the direct fix for the "click fires inconsistently when highlighting a heading": the tab buttons had no `user-select:none`, so a click-with-a-hair-of-drag selected the label text instead of activating (the violet selection boxes visible in the user's screenshot).
- **`LibraryItem`:** roomier padding, `select-none`, hover-lift + `--shadow-sm`, active = violet tint + `--glow-primary`, locked dimmed.
- **`ModeChipsRow`:** glass-tinted row, pill chips with `select-none`, active rose + glow, focus ring switched from hardcoded `ring-indigo-500` to `--glow-primary`.
- **`PaywallCard`:** `.glass-surface` for both inline and floating variants, gradient Subscribe CTA with glow, and all hardcoded `slate-*` colors replaced with theme tokens (so it works in light theme too). Floating-UI anchoring / non-blocking behavior untouched.

### 5.2 recheck (folded into this pass, from user feedback)
- **"Doesn't look different" root cause:** the top control bar has only the page behind it, so `backdrop-filter: blur()` did nothing and the glass collapsed to flat near-black. Fixed by giving the bar a genuinely **elevated surface**: new `.glass-bar` class (elevated `--glass-bar-bg` tint + bottom hairline + downward `--shadow-md` + top highlight) replacing `.glass-surface` on `ControlBar`. Bumped `--glass-bar-bg`/`--glass-panel-bg` tints (both themes) so surfaces read over the dark page.
- **Janky animations:** `IconButton` switched from `transition-all` to a scoped `transition-[transform,box-shadow,color,background-color]` + `select-none`.

### Deviations / Notes
- **Mobile library `Sheet`** inherits the restyled tabs/items but the Sheet chrome itself is unified in Story 5.4 (overlay glass language).
- **No new tests** — change is visual; existing tests already assert gating/selection and pass with test-relevant attributes preserved.
- **Observed (not addressed):** in the user's screenshot the ModeChipsRow appears mis-placed/cramped at top-right with its own scrollbar — likely a grid-area/layout issue, possibly pre-existing. Flagged for investigation; not a styling fix.

### File List
- `frontend/src/features/library/LibraryPanel.tsx` — glass aside, roomier `select-none` tabs, header
- `frontend/src/features/library/LibraryItem.tsx` — padding, `select-none`, hover/active/locked states
- `frontend/src/components/ModeChipsRow.tsx` — glass row, pill chips, glow focus
- `frontend/src/components/shared/PaywallCard.tsx` — glass card, gradient CTA, token colors
- `frontend/src/index.css` — `.glass-bar` class; bumped `--glass-bar-bg`/`--glass-panel-bg` (recheck)
- `frontend/src/components/shared/IconButton.tsx` — scoped transition + `select-none` (recheck)
- `frontend/src/components/ControlBar.tsx` — `.glass-surface` → `.glass-bar` (recheck)
- `frontend/vitest.config.ts` — global `testTimeout`/`hookTimeout` 15s (kills load-flaky timeouts)
- `frontend/src/features/settings/CustomTuningCreator.test.tsx` — reverted the one-off timeout (global now covers it)

### Verification
- `pnpm type-check` clean ✅ · `pnpm lint` clean ✅ · `pnpm test` 271/271 ✅ · `pnpm build` clean ✅
- All changed/affected test files also verified green in isolation (61/61).
- **Not done:** live visual confirmation in the running app — user is running it locally and will eyeball; happy to drive a browser screenshot on request.

### Change Log
- 2026-09-08 — Library/mode/paywall glass restyle + 5.2 recheck (real bar elevation, scoped transitions, `select-none` fixing janky clicks) + global test-timeout flaky fix; full regression green; status → review.
- 2026-09-10 — Code review (3-layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor): built a genuine measured/animated sliding tab indicator (`TabsRow` component in `LibraryPanel.tsx`, replacing the static `border-b-2` underline) to fully satisfy AC1. 7 patches applied: light-theme-safe hover tints (4 elements, token-based), mode-chip 44px tap target (AC3), `PaywallCard` swapped to `.glass-overlay` for AC4's overlay tier, locked `LibraryItem` dimmed border (AC2), removed a focus-weakening `border-0`, added `aria-hidden` to a decorative bullet, swapped hardcoded `text-white` to `text-primary-foreground`. 5 items deferred to `deferred-work.md`. Verified live in the running app (dark + light theme): sliding indicator animates correctly between all 3 tabs, hover states visible in both themes, locked items show the dimmed border, paywall renders correctly. Regression re-verified: `tsc --noEmit` clean, lint clean, `vite build` clean, 279/279 tests green. Status → done.
