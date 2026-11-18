# Story 8.5: Contrast & Accessibility Audit + Theme Harmonization

Status: review

## Story

As a user,
I want every theme to stay accessible with the new Obsidian aesthetic,
so that the visual refresh costs nobody legibility.

## Acceptance Criteria

1. All 6 themes WCAG 2.1 AA, computed from the shipped CSS: text ≥4.5:1 on every chrome surface (page, panels, cards, glass bar/panel/overlay, selector slots, active surface-2 plates), active indicators ≥3:1; dot note-text ≥4.5:1 (existing composited suite).
2. Deuteranopia + protanopia separation of the co-occurring root/scale/mode dot trio verified per theme (ΔE ≥ 20).
3. Plus Jakarta Sans fallback chain verified.
4. `prefers-reduced-motion` gates all transitions/animations; `prefers-reduced-transparency` collapses all glass (including directional edges).
5. Cross-browser `backdrop-filter`: every use ships the `-webkit-` prefix.
6. Full regression gate green; live browser check at desktop + 375px.

## Tasks / Subtasks

- [x] 1. New `frontend/src/styles/contrast.test.ts` (70 cases): parses `index.css` theme blocks with the real cascade (dark-family = root + `.dark` + theme), converts hex/rgb/oklch, alpha-composites glass over `--background`, computes WCAG ratios; Machado 2009 CVD simulation + CIE76 ΔE for the dot trio; guards for reduced-motion, reduced-transparency, font fallback and the `-webkit-` prefix.
- [x] 2. Fixes for the audit failures (RED → GREEN):
  - Dark `--muted-foreground` oklch 0.58 → 0.64 (was 3.95–4.31:1 on obsidian surfaces). Light 0.5 → 0.46 (was 4.40:1 on `--input`).
  - Active LibraryItem text and active IconButton glyph: `text-primary` → foreground. Violet on surface-2 measured 2.53–3.29:1 for text and fell below the 3:1 icon minimum in mono and vibrant. The indigo edge/underglow still carries the state (≥3:1).
  - neon `--color-dot-mode` `#f0abfc` → `#d946ef`. Scale vs mode collapsed under deuteranopia (ΔE 7.8 → ≥24.8); note text 5.10:1; 4.72:1 vs board.
  - mono `--color-dot-scale` `#94a3b8` → `#7f8a99`. Protanopia ΔE 19.6 → 20.2; note text 4.82:1.
  - Updated the hand-mirrored values in `FretDot.test.tsx` (its composited contrast suite passes) and the `LibraryItem.test.tsx` active-class assertion.
- [x] 3. 375px live check: an iframe harness was used, because the window-resize tool doesn't work on this machine. It found and fixed two layout bugs:
  - The page scrolled horizontally (document 553px wide): the grid items' default `min-width: auto` let the non-shrinking mode-chip track widen the column. Fix: `.app-shell > * { min-width: 0 }`.
  - The mobile Library sheet rendered 1,694px tall, off-screen, because the sheet primitive's `h-auto` overrode `h-[60vh]`. Fix: `h-[60vh]!` plus `min-h-0` on the scrolling body. This bug predates Epic 8.
- [x] 4. Gate + live check of all 6 themes.

## Dev Notes

- CVD scale/mode is a real pair: in a mode overlay, scale-only notes stay `scale` next to `mode` dots (`fretboardUtils.ts` state logic). The minimal theme's documented freeform/scale residual (Story 4.5) is out of the trio and unchanged.
- ΔE floor of 20 (CIE76) is this story's documented threshold. mono clears it with the least margin (20.2), because that theme separates dots by lightness alone, by design.
- Fret wire, strings and inlays are decorative (fret position is also conveyed by numbers and inlays), so they are not held to 3:1.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- Live Chrome desktop: dark, light, neon, mono, vibrant and minimal all render the Obsidian chrome and materials correctly, with a mode overlay active; no console errors.
- 375px (iframe): no horizontal scroll; the ControlBar wraps cleanly; mode chips and fretboard scroll inside their own rows; the Library bottom sheet sits at 60vh with the grab handle and a scrolling list.
- **Not verified:** Firefox and Safari rendering (only Chrome is available here). The `-webkit-` prefix parity is enforced by test. The paywall card has still not been seen live, because the dev session resolves as premium.
- Follow-up suggestion (not done): at 375px the wrapped ControlBar is about 5 rows tall (~330px). A mobile tools bottom-sheet would reclaim that space; it's a layout change, not a reskin.
- Gate: vitest **830/830** (760 + 70), tsc, lint, build clean.

### File List

- frontend/src/styles/contrast.test.ts (new)
- frontend/src/index.css
- frontend/src/components/FretDot.test.tsx
- frontend/src/components/shared/IconButton.tsx
- frontend/src/features/library/LibraryItem.tsx
- frontend/src/features/library/LibraryItem.test.tsx
- frontend/src/features/library/LibraryPanel.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-11-18: Implemented (DS). Status → review.
