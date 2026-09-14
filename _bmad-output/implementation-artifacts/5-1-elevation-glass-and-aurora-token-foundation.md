# Story 5.1: Elevation, Glass & Aurora Token Foundation

Status: done

## Story

As a **developer**,
I want **the elevation/glass/glow token system and the Aurora signature palette installed in the token layer**,
so that **every downstream overhaul story (5.2–5.5) builds on one consistent visual foundation instead of ad-hoc styling.**

## Acceptance Criteria

From `epics.distillate.md#Story 5.1` and `ux-design-specification.md#Visual Overhaul Direction — 2026-09-08 Revision`:

1. **AC1 — Glass/elevation/glow tokens.** `--glass-bar-bg`, `--glass-panel-bg`, `--glass-overlay-bg`, `--glass-blur`, `--glass-blur-strong`, `--glass-border`, `--glass-border-strong`, `--glass-highlight`, `--shadow-sm|md|lg`, `--glow-primary`, `--glow-accent`, and `--signature-grad` are defined in `index.css` for **both** the `.dark, [data-theme="dark"]` block and the `:root` (light) block, with light-theme values tuned per the spec (light-tinted translucency, softer shadows).
2. **AC2 — Aurora signature on chrome tokens.** `--primary` retuned to electric violet `#8b5cf6`; the cyan accent (`#22d3ee`) available as accent; neutrals shifted to cool blue-slate. These are chrome tokens only.
3. **AC3 — Density variables.** `--top-bar-height` set to `3.75rem` (60px); the comfortable spacing/type baseline from the spec's "Density & spacing upgrades" table documented as tokens/comments for downstream stories.
4. **AC4 — `.glass-surface` utility.** A reusable class applying `background: var(--glass-*-bg)`, `backdrop-filter: blur() saturate()`, a 1px luminous `--glass-border`, `--shadow-md`, and `inset 0 1px 0 var(--glass-highlight)`.
5. **AC5 — Reduced-transparency fallback.** Under `@media (prefers-reduced-transparency: reduce)`, `.glass-surface` collapses to the nearest solid surface (`--card`/`--popover`) and drops `backdrop-filter`.
6. **AC6 — Dots untouched here.** `--color-dot-root|scale|mode|freeform` are **not** changed in this story (retune is Story 5.5).
7. **AC7 — No regression.** Fretboard rendering unchanged; existing frontend tests, type-check, and lint pass.

## Tasks / Subtasks

- [x] **Task 1: Add token blocks to `index.css`**
  - [x] Add glass/elevation/glow/signature tokens to `.dark, [data-theme="dark"]`
  - [x] Add light-tuned equivalents to `:root`
  - [x] Retune `--primary` (violet) + `--ring` in both blocks; cyan accent expressed via `--glow-accent` + `--signature-grad` (see note)
  - [x] Set `--top-bar-height: 3.75rem`
- [x] **Task 2: Author `.glass-surface` utility + reduced-transparency fallback**
- [x] **Task 3: Verify no bleed** — dot tokens + fretboard SVG colors untouched; `pnpm build` compiles CSS pipeline cleanly
- [x] **Task 4: Regression** — `pnpm test` 267/267, `pnpm type-check`, `pnpm lint`, `pnpm build` all green

### Review Findings

- [x] [Review][Decision] Aurora accent color inconsistency — RESOLVED (accepted as-is, 2026-09-10): `--accent` stays amber and `--primary` stays at `oklch(0.55 0.21 293)` (~#7c5cf6, not literal `#8b5cf6`). Rationale: retuning `--accent` to cyan would retint every neutral hover background app-wide — real component-restyle scope creep for a token-only story — and the deeper `--primary` violet preserves AA contrast for `--primary-foreground` on filled buttons. Cyan remains available via `--glow-accent`/`--signature-grad`. Revisit if 5.2–5.4 component work reveals the amber `--accent` reads visually inconsistent with the Aurora direction.
- [x] [Review][Patch] Reduced-transparency fallback incomplete [frontend/src/index.css — `.glass-surface`/`.glass-bar` reduced-transparency media query] — FIXED: both blocks now also reset `border-color`/`box-shadow` to `--border`/`--shadow-sm`.
- [x] [Review][Patch] `.glass-bar` comment/code contradiction [frontend/src/index.css — `.glass-bar`] — FIXED: removed `backdrop-filter`/`-webkit-backdrop-filter` from `.glass-bar` to match the stated no-blur rationale.
- [x] [Review][Patch] AC3 density/spacing baseline not documented [frontend/src/index.css] — FIXED: added a comment block next to `--top-bar-height` capturing the full "Density & spacing upgrades" table for Stories 5.2–5.4.
- [x] [Review][Patch] Missing trailing newline [frontend/src/index.css:EOF] — FIXED.
- [x] [Review][Defer] No `@supports` fallback for browsers without `backdrop-filter` support [frontend/src/index.css] — deferred, not required by any AC; `backdrop-filter` support is now >96% globally.
- [x] [Review][Defer] `--sidebar-primary`/`--sidebar-ring`/`--chart-1`/`--chart-5` still hardcode the old indigo literal, not wired to `--primary`/`--ring` [frontend/src/index.css] — deferred, pre-existing pattern not introduced by this diff.
- [x] [Review][Defer] Overlay-tier tokens (`--glass-overlay-bg`, `--glass-blur-strong`) have no consuming utility yet; `PaywallCard.tsx` already uses `.glass-surface`/panel-tier tokens instead — deferred, revisit during the Story 5.3 review.
- [x] [Review][Defer] Minor undisclosed numeric drift between dark-theme glass/shadow values and the spec's literal numbers (`--glass-bar-bg`, `--glass-panel-bg`, `--shadow-lg`) — deferred, non-blocking visual tuning.

## Developer Context

**Source of truth:** `ux-design-specification.md#Visual Overhaul Direction — 2026-09-08 Revision` — see "New token system", "Density & spacing upgrades", "Signature palette — Aurora", and "Accessibility deltas".

**Confirmed decisions:** depth = glass; signature = Aurora (indigo→violet→cyan); affordance = labels-desktop + tooltips-mobile; dot scope = Option B (Story 5.5).

### Fixed Constraints (Non-Negotiable)
- **Tailwind v4 CSS-first** — tokens live in `index.css` via `@theme`/CSS variables. **No `tailwind.config.js`, no PostCSS.**
- **Do NOT hand-edit `src/components/ui/`** (shadcn generated).
- **Do NOT modify `frontend/src/data/*.js`.**
- OKLCH values to match the existing token style; keep the `#080810`-class deep base as canvas.
- This story is **token-layer only** — do not restyle components yet (that's 5.2–5.4). Landing the tokens must not visually break current components (they keep reading `--card`/`--popover`/`--primary`, which still resolve).

### File Structure
- **MODIFIED:** `frontend/src/index.css` (only)

## Success Criteria
✅ All 7 ACs satisfied · ✅ both themes carry the full token set · ✅ `.glass-surface` + reduced-transparency fallback work · ✅ dots + fretboard untouched · ✅ tests/type-check/lint green

## Deferred / Out of Scope
- Component restyling (5.2–5.4) · fretboard dot retune + audit (5.5)

## Dev Agent Record

### Completion Notes
Token-layer foundation landed in `frontend/src/index.css` only — no component or data changes.

- **New tokens** added to BOTH `.dark, [data-theme="dark"]` and `:root` (light): `--signature-grad`, `--glass-bar-bg` / `--glass-panel-bg` / `--glass-overlay-bg`, `--glass-blur` (16px) / `--glass-blur-strong` (24px), `--glass-border` / `--glass-border-strong` / `--glass-highlight`, `--shadow-sm|md|lg`, `--glow-primary` / `--glow-accent`. Dark uses low-alpha near-black glass; light uses light-tinted white translucency with softer shadows, per spec.
- **Aurora signature:** `--primary` and `--ring` retuned from indigo `oklch(0.52 0.24 264)` to Aurora violet `oklch(0.55 0.21 293)` (≈#7c5cf6) in both themes. Deliberately chose the deeper violet (L 0.55) rather than the brighter `#8b5cf6` for `--primary` so white `--primary-foreground` keeps AA contrast on filled buttons; the brighter violet lives in `--signature-grad`/glows.
- **Cyan accent (AC2):** expressed via `--glow-accent` and `--signature-grad` rather than repurposing shadcn's `--accent` token (which drives neutral hover backgrounds — changing it would tint every hover state). Documented deviation.
- **Neutrals (AC2):** existing neutrals are already cool (hue 235–270 across `--foreground` / `--muted-foreground` / `--color-text-*`), i.e. already "cool blue-slate" — left unchanged to avoid contrast churn. No separate retune needed.
- **Density (AC3):** `--top-bar-height` 3rem → 3.75rem (60px). Remaining density values (padding, gaps, icon/target sizes) are documented in the spec's "Density & spacing upgrades" table for the component stories (5.2–5.4) to apply; they are not global tokens.
- **`.glass-surface` (AC4):** utility with bg + `backdrop-filter: blur() saturate(1.2)` + luminous border + `--shadow-md` + `inset 0 1px 0 --glass-highlight`. Default bg = panel tint; components override with bar/overlay tokens.
- **Reduced transparency (AC5):** `@media (prefers-reduced-transparency: reduce)` collapses `.glass-surface` to solid `--card` and drops `backdrop-filter`.
- **Dots untouched (AC6):** `--color-dot-*` and fretboard SVG colors unchanged — retune is Story 5.5.

### File List
- `frontend/src/index.css` — modified (only)

### Verification
- `pnpm type-check` (tsc --noEmit) — clean ✅
- `pnpm lint` (eslint) — clean ✅
- `pnpm test` (vitest run) — 267/267 across 25 files ✅
- `pnpm build` (vite + Tailwind v4) — compiled CSS pipeline cleanly; pre-existing >500 kB JS chunk warning only ✅

### Change Log
- 2026-09-08 — Implemented token foundation (glass/elevation/glow/signature + Aurora violet primary + density) in `index.css`; added `.glass-surface` + reduced-transparency fallback; full regression green; status → review.
- 2026-09-10 — Code review (3-layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor): Aurora accent-color deviation accepted as documented trade-off; 4 patches applied (completed reduced-transparency fallback for border/box-shadow, removed contradictory `backdrop-filter` from `.glass-bar`, added AC3 density/spacing comment block, added trailing newline); 4 items deferred to `deferred-work.md`. Regression re-verified: `tsc --noEmit` clean, `vite build` clean, 271/271 tests green. Status → done.
