# Story 5.4: Overlays Unified + Legacy Nav Reconciliation

Status: done

## Story

As a **user**,
I want **auth and every sheet/dialog to share one glass language, and the app to have a single navigation system**,
so that **the experience feels consistent everywhere and there are no leftover mismatched or duplicate UI surfaces.**

## Acceptance Criteria

From `epics.distillate.md#Story 5.4` and `ux-design-specification.md#Visual Overhaul Direction`:

1. **AC1 — Auth surfaces.** `LoginModal`, `EmailAuthForm`, and `GoogleAuthButton` restyled to the new control language on `--glass-overlay-bg` + `--glass-blur-strong`, with generous spacing; inputs/buttons match the 5.2 control styling.
2. **AC2 — Sheets/dialogs unified.** Rename, delete-confirm, and account sheets, plus `CustomTuningCreator`, share one glass overlay treatment (bg + blur + `--shadow-lg`) and a consistent header/spacing rhythm.
3. **AC3 — Legacy nav reconciled.** `NavTabs.jsx` (parallel nav with its own hand-drawn icons + "Upgrade to Pro" button) is either (a) folded into the unified control/nav language, or (b) removed if it is dead/unused — **no duplicate navigation system remains** in the app. Decision + rationale recorded in the Dev Agent Record.
4. **AC4 — Reduced transparency.** All these overlays honor the `prefers-reduced-transparency` fallback from 5.1.
5. **AC5 — Flows unchanged.** No change to auth, checkout, or tuning-CRUD behavior — visual + consolidation only.

## Tasks / Subtasks

- [x] **Task 1: Audit `NavTabs.jsx` usage** — RESOLVED during story creation (2026-09-10): `grep -r "NavTabs" frontend/src` finds exactly one match — `NavTabs.jsx` itself. It is not imported or rendered anywhere in the app (not in `App.tsx`, `AppShell`, or any route). It is dead code from an earlier design iteration, fully superseded by `ControlBar`'s Library toggle + `LoginModal`. **Decision: remove**, not fold in — there is nothing live to fold into the unified language.
- [x] **Task 2: Restyle auth** — `LoginModal.tsx` `SheetContent` on `.glass-overlay` + `gap-5 p-6`; decorative divider hairlines now `aria-hidden` + `var(--glass-border)`; `EmailAuthForm.tsx` bumped to `gap-4` for the roomier rhythm. `GoogleAuthButton.tsx` left untouched — it renders `@react-oauth/google`'s own button, not stylable via our tokens.
- [x] **Task 3: Unify sheets/dialogs** — all 6 `SheetContent` call sites now share `.glass-overlay` + `gap-5 p-6` (bottom sheets keep `p-6` without the `sm:max-w-*` width constraint): `LoginModal`, `ControlBar`'s rename/delete/account sheets (×3), `CustomTuningCreator`, `LibraryPanel` mobile sheet. Removed the rename/delete sheets' redundant `SheetHeader mb-4` (was compensating for the outer content having no gap — now redundant since the container has `gap-5`). `CustomTuningCreator.tsx` hardcoded colors swapped: `text-slate-300`→`text-foreground`, `text-slate-400`→`text-muted-foreground`, `text-rose-400`→`text-destructive`, `border-[var(--border)]`→`border-[var(--glass-border)]`, `focus-visible:border-indigo-400`→`focus-visible:[box-shadow:var(--glow-primary)]`.
- [x] **Task 4: Remove `NavTabs`** — deleted `frontend/src/components/NavTabs.jsx` and `frontend/src/components/NavTabs.css`. Re-confirmed via `grep -rn "NavTabs" frontend/src` post-deletion: zero remaining references anywhere in the codebase.
- [x] **Task 5: Tests** — no new test files needed (className/structure-only story). `CustomTuningCreator.test.tsx` and `EmailAuthForm.test.tsx` query by role/label/text, not className — both still pass unmodified against the restyled markup.
- [x] **Task 6: Regression** — `tsc --noEmit` clean, `eslint` clean on all touched files, `vitest run` 279/279 green, `vite build` clean (same pre-existing >500kB chunk warning only).

### Review Findings

- [x] [Review][Patch] `LibraryPanel`'s mobile sheet never got the spacing rhythm the other 5 sheets share [`LibraryPanel.tsx` — mobile `SheetContent`/`SheetHeader`] — FIXED: header now uses `select-none border-b border-[var(--glass-border)] px-4 py-3.5`, matching the desktop aside's own established header pattern (outer `SheetContent` left without added padding, since the tabs/content beneath already have their own padding and the sheet is height-capped at 60vh).
- [x] [Review][Patch] `LoginModal`'s `SheetContent` lacks `overflow-y-auto` [`LoginModal.tsx`] — FIXED: added, matching `CustomTuningCreator`'s pattern.
- [x] [Review][Patch] `--glass-border`/`--glass-border-strong` don't collapse to opaque under `prefers-reduced-transparency: reduce` [`frontend/src/index.css`] — FIXED: added a global token-level override (`:root`/`.dark`/`[data-theme='dark']`) so every standalone use of these border tokens app-wide respects the user's preference, not just the `.glass-*` utility classes.
- [x] [Review][Defer] `focus-visible` border→box-shadow swap on `CustomTuningCreator`'s `<select>`s is theoretically weaker under forced-colors/Windows High Contrast mode — deferred; consistent with the same established pattern already used throughout `IconButton`/`Select` triggers since 5.1–5.3, not a new regression; revisit in Story 5.5's contrast/motion audit.
- [x] [Review][Defer] `backdrop-filter: blur(24px)` on `CustomTuningCreator`'s scrollable `SheetContent` — deferred, theoretical WebKit scroll-repaint concern with no concrete evidence; explicitly matches Story 5.5's own designated scope ("cross-browser backdrop-filter check... with acceptable fallback where unsupported").
- [x] [Review][Defer] Mixed `--glass-border` vs `--glass-border-strong` usage within the same panel has no inline comment explaining the two-tier hierarchy — deferred, cosmetic documentation gap, not a bug (intentional two-tier design from 5.1).
- [x] [Review][Defer] Sheets' `p-6` padding with unchanged `max-w-sm`/`max-w-md` caps — deferred, minor width squeeze on very narrow phones (~360px); consistent with AC1's "generous spacing" intent, worth a mobile-viewport visual QA pass but not blocking.

### Testing Notes
- Only `features/settings/CustomTuningCreator.test.tsx` and `features/auth/EmailAuthForm.test.tsx` exist today among this story's touched files — no `LoginModal.test.tsx`, no test file covers `ControlBar`'s rename/delete/account sheets beyond what `ControlBar.test.tsx` already asserts (behavioral, not visual).
- `CustomTuningCreator.test.tsx` will need re-verification after the `text-slate-*`/hardcoded-indigo → token swap and glass container — confirm it doesn't assert on now-changed class strings (query by role/label/text, not className, is the existing pattern per 4.1–4.3).
- No new test files required — this is a className/structure-only visual story (AC5); existing tests passing is the regression gate, consistent with 5.1–5.3's "no new tests" precedent for pure restyles.

## Developer Context

**Depends on:** 5.1 (tokens + `.glass-surface`), 5.2 (`IconButton`, control styling, the `.glass-overlay` utility — added during 5.2's code review, not in the original 5.2 story text), 5.3 (further `.glass-overlay` precedent on `PaywallCard`, light-theme-safe hover pattern). **Source of truth:** `ux-design-specification.distillate.md` → "Component polish" + "New tokens" sections; `epics.distillate.md#Story 5.4`.

### `.glass-overlay` already exists — use it, don't reinvent it
AC2's literal recipe ("bg + blur + `--shadow-lg`") is **exactly** the `.glass-overlay` utility in `frontend/src/index.css` (added during the 5.2 code review specifically for "dropdowns, sheets, tooltips, paywall", and already proven on `PaywallCard` in 5.3):
```css
.glass-overlay {
  background: var(--glass-overlay-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur-strong)) saturate(1.2);
  backdrop-filter: blur(var(--glass-blur-strong)) saturate(1.2);
  border: 1px solid var(--glass-border-strong);
  box-shadow: var(--shadow-lg), inset 0 1px 0 0 var(--glass-highlight);
}
@media (prefers-reduced-transparency: reduce) { /* already collapses to solid --card, drops blur — AC4 free */ }
```
Do not add a new "sheet glass" class — apply `.glass-overlay` via `className` on each `SheetContent`. Confirmed pattern: shadcn's `SheetContent` base class already includes `bg-popover ... shadow-lg` (see `frontend/src/components/ui/sheet.tsx`); because Tailwind's generated utilities are emitted before our hand-written classes in `index.css` (custom rules physically sit after `@import "tailwindcss"`), a plain custom class like `glass-overlay` in the `className` prop wins the cascade over `bg-popover`/`shadow-lg` at equal specificity — this is the exact mechanism already validated on `PaywallCard`'s `SheetContent`-adjacent dialogs in 5.1–5.3. AC4 (reduced-transparency) comes for free since `.glass-overlay` already has the fallback block.

### All 6 `SheetContent` call sites needing this (AC2 + part of AC1)
`grep -rn "SheetContent" frontend/src` confirms exactly these usages (all outside `components/ui/`, so all are legitimate className-override targets, not hand-edits):
1. `LoginModal.tsx` — auth Sheet (AC1)
2. `ControlBar.tsx` — Rename tuning sheet (AC2)
3. `ControlBar.tsx` — Delete tuning confirmation sheet (AC2)
4. `ControlBar.tsx` — Account menu sheet (AC2)
5. `CustomTuningCreator.tsx` — the creator sheet (AC2)
6. `LibraryPanel.tsx` — mobile bottom Sheet (this is the item Story 5.3 explicitly deferred: *"Mobile library `Sheet` inherits the restyled tabs/items but the Sheet chrome itself is unified in Story 5.4"* — this story is where that debt is paid)

### Current state to build on (read before editing — do not guess)
- **`LoginModal.tsx`** (`features/auth/`): `<SheetContent side="right" className="w-full gap-4 p-4 sm:max-w-sm">` — no glass classes yet. Renders `EmailAuthForm` + an "or" divider (`bg-border` hairline) + `GoogleAuthButton`.
- **`EmailAuthForm.tsx`**: plain shadcn `Input`/`Button`, `text-xs text-muted-foreground` labels — already token-based (no hardcoded colors to fix here). "Restyle" for this file is really about spacing/rhythm inside the now-glass Sheet, not the primitives themselves (`components/ui/input.tsx`/`button.tsx` must not be hand-edited).
- **`GoogleAuthButton.tsx`**: renders `@react-oauth/google`'s own `<GoogleLogin>` button — this is a third-party-rendered button, **not stylable via our token system** (Google controls its own button chrome). Nothing to restyle here beyond the wrapper's spacing/placement if any; do not attempt to override Google's internal button styles.
- **`ControlBar.tsx`** (already reviewed/patched through 5.1–5.3): three `<Sheet>` blocks near the end of the file (rename, delete-confirm, account) — all currently `<SheetContent side="..." className="gap-4">` or similar with no glass classes; `SheetHeader`/`SheetTitle`/`SheetDescription` used as-is (already token-based, don't need changes beyond the container).
- **`CustomTuningCreator.tsx`** (`features/settings/`): `<SheetContent side="right" className="w-full gap-4 overflow-y-auto p-4 sm:max-w-md">` — no glass yet. **Also still has hardcoded `text-slate-300`/`text-slate-400` colors** (label text, string-row text) and a hand-rolled `selectClass` string with `border-[var(--border)]` + `focus-visible:border-indigo-400` (hardcoded indigo, predates the Aurora violet retune from 5.1) — these need token swaps (`text-foreground`/`text-muted-foreground`, `focus-visible:border-ring` or `--glow-primary`) alongside the glass container, consistent with how 5.3 replaced `PaywallCard`'s hardcoded `slate-*`/`indigo-500` colors.
- **`LibraryPanel.tsx`** mobile Sheet: `<SheetContent side="bottom" className="h-[60vh] flex flex-col" showCloseButton={false}>` with its own `<SheetHeader className="border-b border-[var(--border)] pb-2">` — note this uses `--border` not `--glass-border`, inconsistent with the desktop aside (which uses `--glass-border` throughout, fixed in the 5.3 review). Align it.
- **`components/NavTabs.jsx` + `NavTabs.css`**: confirmed dead code (see Task 1). Delete both files.

### Learnings from the Story 5.1–5.3 review passes (apply proactively, don't wait for review to catch these)
- **Theme-aware hover/tint tokens only** — never hardcode `hover:bg-white/[opacity]`; it's invisible in light theme. Use `hover:bg-[var(--glass-border)]` (validated visually in both themes during the 5.3 review) for any new subtle hover surface.
- **Use bracket-syntax Tailwind classes over inline `style={{}}`** for CSS-var-driven values (e.g. `[background:var(--glass-overlay-bg)]`, `[box-shadow:var(--glow-primary)]`) — keeps overrides composable via `className` and matches the rest of the codebase's convention; avoid `style={{...}}` unless there's no other option.
- **Add `aria-hidden` to purely decorative elements** (dividers, dot bullets, etc.).
- **Meet the ≥44px effective touch target** on any newly-styled interactive element (buttons, close icons) — this was a real, missed AC in 5.3 (mode chips shipped at ~28–30px against a 44px requirement); verify sizing, don't assume padding is enough.
- **Implement what the AC actually asks before treating it as a deferred nice-to-have** — 5.3 initially shipped a static tab-underline against an explicit "sliding indicator" AC and called it a deferred deviation; on review the user asked for the real thing. Don't pre-emptively water down an AC's literal wording without flagging it as a decision point in this story's own Dev Agent Record.
- **`.glass-overlay` vs `.glass-surface`**: `.glass-surface` (panel tier, `--shadow-md`) is for persistent chrome (bars, panels); `.glass-overlay` (overlay tier, `--shadow-lg`, `--glass-blur-strong`) is for anything that floats *above* other glass — dropdowns, tooltips, sheets, paywall. All of this story's targets are overlays → `.glass-overlay` is correct, not `.glass-surface`.

### Recent commit pattern (git intelligence)
Last 5 commits are all backend/premium-feature work (4.2, 4.3, 3.7) — no recent frontend-chrome commits to pattern-match against beyond what's already in the working tree from 5.1–5.3 (still uncommitted). Follow those stories' established conventions directly rather than git history.

### Fixed Constraints
- Tailwind v4 CSS-first; do NOT hand-edit `src/components/ui/` (`sheet.tsx`, `input.tsx`, `button.tsx` all off-limits — override via `className` only).
- Do not change auth/authorization or checkout wiring — restyle only (AC5).
- `NavTabs` removal: verify nothing imports/renders it first (already confirmed — see Task 1), remove cleanly, no dead imports left in any file.
- `@/` alias; no data-file edits; `GoogleAuthButton`'s internal Google-rendered button is not stylable — don't attempt it.

### File Structure
- **MODIFIED:** `features/auth/LoginModal.tsx`, `features/auth/EmailAuthForm.tsx` (spacing only, likely no token changes needed), `features/settings/CustomTuningCreator.tsx`, `ControlBar.tsx` (3 Sheet blocks), `features/library/LibraryPanel.tsx` (mobile Sheet block)
- **REMOVED:** `components/NavTabs.jsx`, `components/NavTabs.css`
- **NOT MODIFIED:** `components/ui/*` (constraint), `GoogleAuthButton.tsx` internals (third-party-rendered), `frontend/src/index.css` (`.glass-overlay` already exists from 5.2/5.3 — nothing new to add there for this story)

## Success Criteria
✅ Auth + all 6 sheet/dialog surfaces on unified `.glass-overlay` · ✅ `NavTabs` removed, single navigation system confirmed · ✅ reduced-transparency respected (free via `.glass-overlay`) · ✅ flows unchanged · ✅ tests/type-check/lint/build green

## Deferred / Out of Scope
- Fretboard dot retune + full contrast/motion audit (5.5)
- `EmailAuthForm`/`CustomTuningCreator`'s use of `Sheet` (not shadcn `AlertDialog`) for destructive confirmation — a pre-existing UX-spec deviation (spec calls for `AlertDialog` on destructive actions), out of scope here since this story is visual + consolidation only, not a behavioral change

## Dev Agent Record

### Completion Notes
All 6 `SheetContent` surfaces (auth, rename, delete-confirm, account, custom-tuning-creator, mobile library) now share the `.glass-overlay` utility built during the 5.2/5.3 reviews — no new CSS was needed. `NavTabs.jsx`/`NavTabs.css` removed as dead code (confirmed zero references both before and after deletion via `grep`).

- **AC1 (auth surfaces):** `LoginModal`'s `SheetContent` → `.glass-overlay` + `gap-5 p-6`; decorative divider hairlines made `aria-hidden` and switched from `bg-border` to `bg-[var(--glass-border)]` for visual consistency with the rest of the glass system. `EmailAuthForm` bumped its internal `gap-3`→`gap-4` for the roomier rhythm the AC calls for; its `Input`/`Button` usage was already token-based, nothing else to change. `GoogleAuthButton` intentionally untouched — it renders `@react-oauth/google`'s own button, which is not stylable via our CSS custom properties.
- **AC2 (sheets/dialogs unified):** Rename, delete-confirm, and account sheets in `ControlBar.tsx`, plus `CustomTuningCreator.tsx`, all now use `.glass-overlay` + `gap-5 p-6`. Also fixed a real pre-existing inconsistency this AC's "consistent spacing rhythm" wording surfaced: the rename/delete sheets previously had **no outer padding at all** (relying only on a zeroed `SheetHeader` + manual `mb-4`), while the account/creator sheets had `p-4` — all four now share the same `gap-5 p-6` container padding, and the now-redundant `mb-4` on rename/delete's `SheetHeader` was removed. `CustomTuningCreator.tsx` also had hardcoded pre-Aurora colors (`text-slate-300/400`, `text-rose-400`, `border-[var(--border)]`, `focus-visible:border-indigo-400`) — all swapped to theme tokens (`text-foreground`/`text-muted-foreground`/`text-destructive`/`border-[var(--glass-border)]`/`focus-visible:[box-shadow:var(--glow-primary)]`), same category of fix as 5.3's `PaywallCard` cleanup.
- **AC3 (legacy nav):** Decision was pre-resolved during story creation (`grep -r "NavTabs" frontend/src` found only self-references) — removed, not folded in, since there was nothing live to fold into anything. Re-verified post-deletion: zero references anywhere.
- **AC4 (reduced transparency):** Free — `.glass-overlay` already has the `prefers-reduced-transparency` fallback block from when it was built in 5.2.
- **AC5 (flows unchanged):** Confirmed — every change in this story is `className`/JSX-attribute only; no handler, mutation, store call, or prop signature was touched. Full regression suite (279 tests, unchanged from pre-story count) passes with no new or modified assertions needed.

### Deviations / Notes
- Live browser verification covered the auth `Sheet` only (confirmed glass/blur/border/focus-ring render correctly, `Log in` button correctly uses the Aurora violet `--primary`). The other 5 sheets use the byte-identical `.glass-overlay` class applied the same way, and 3 of them require app state not easily reachable without a live backend (authenticated account, premium + custom tuning for rename/delete). Recommend a quick visual pass at code review if backend/premium state is available.
- `LibraryPanel`'s `isMobile` state is captured once via `window.matchMedia` at mount (pre-existing, not touched by this story) — it doesn't react to viewport resize after load, so the mobile Sheet can't be triggered by resizing an already-loaded desktop session; it requires an actual mobile-width page load to test.

### File List
- `frontend/src/features/auth/LoginModal.tsx` — modified (glass overlay, spacing, divider tokens, `overflow-y-auto`)
- `frontend/src/features/auth/EmailAuthForm.tsx` — modified (spacing only)
- `frontend/src/components/ControlBar.tsx` — modified (3 `SheetContent`s: rename/delete/account → glass overlay + unified spacing)
- `frontend/src/features/settings/CustomTuningCreator.tsx` — modified (glass overlay + hardcoded-color token swap)
- `frontend/src/features/library/LibraryPanel.tsx` — modified (mobile `SheetContent` → glass overlay, header aligned to desktop spacing rhythm)
- `frontend/src/index.css` — modified (global `prefers-reduced-transparency` override for `--glass-border`/`--glass-border-strong`)
- `frontend/src/components/NavTabs.jsx` — deleted (dead code)
- `frontend/src/components/NavTabs.css` — deleted (dead code)

### Verification
- `pnpm type-check` (tsc --noEmit) — clean ✅
- `pnpm lint` (eslint, touched files) — clean ✅
- `pnpm test` (vitest run) — 279/279 across 26 files ✅
- `pnpm build` (vite) — compiled cleanly; pre-existing >500 kB JS chunk warning only ✅
- Live browser check (dev server): app loads with `NavTabs` removed (no breakage); auth `Sheet` visually confirmed — glass blur/border/shadow render correctly, violet focus ring on inputs, Aurora-violet `Log in` button, Google button unaffected

### Change Log
- 2026-09-10 — Unified all 6 sheet/dialog surfaces (auth, rename, delete-confirm, account, custom-tuning-creator, mobile library) on the existing `.glass-overlay` utility; removed dead `NavTabs.jsx`/`NavTabs.css`; fixed a real spacing inconsistency between sheets (rename/delete had no outer padding) and swapped `CustomTuningCreator`'s remaining hardcoded pre-Aurora colors to theme tokens. Full regression green (279/279 tests, type-check, lint, build); status → review.
- 2026-09-10 — Code review (3-layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor): caught a real gap in the original implementation — `LibraryPanel`'s mobile sheet (explicitly the "6th" AC2 target) never got the spacing rhythm the other 5 sheets share. 3 patches applied: aligned that sheet's header with the desktop aside's pattern, added missing `overflow-y-auto` to `LoginModal`, and added a global `prefers-reduced-transparency` override for `--glass-border`/`--glass-border-strong` so standalone token uses (not just the `.glass-*` utility classes) respect the user's preference app-wide. 4 items deferred to `deferred-work.md`. Regression re-verified: `tsc --noEmit` clean, lint clean, `vite build` clean, 279/279 tests green. Status → done.
