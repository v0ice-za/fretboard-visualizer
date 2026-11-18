# Story 8.2: Chrome Reskin — ControlBar, Selectors & Mode Chips

Status: review

## Story

As a user,
I want the control bar, selectors and mode chips to feel like precision studio equipment,
so that the app chrome matches the Obsidian look established by the 8.1 tokens.

## Acceptance Criteria

1. ControlBar is compact (min-height 52px, tighter gaps/padding) and fits on one row at ~1460px desktop width.
2. Tuning/Key/Scale selectors sit in recessed hardware slots: 4px radius, `--input` fill, hairline border, inset well shadow; category labels in mono micro-caps.
3. Mode chips are a segmented pill control: recessed track; active segment raised on `surface-2` with an indigo underglow.
4. Icon buttons have a hardware-plate look: 4px radius, flat hover plate (`surface-interactive`, no lift), active = raised `surface-2` plate with an indigo underglow and indigo glyph.
5. 44px minimum touch targets kept (IconButton `h-11`, chips `min-h-11`); keyboard arrow navigation in the mode toolbar unchanged.
6. Light theme renders correctly with the same structure (token-driven).
7. Regression gate green.

## Tasks / Subtasks

- [x] 1. Remove the unlayered universal `margin/padding: 0` reset from `App.css` (it overrode every Tailwind spacing utility app-wide; Tailwind preflight already resets inside `@layer base`). Done first, at the owner's request, because it hid real spacing.
- [x] 2. ControlBar: compact bar classes; `SELECTOR_SLOT` constant applied to the three `SelectTrigger`s (narrowed to w-40/w-20/w-48); mono micro-caps `SelectCategory`; action labels `hidden xl:inline` (was `md:inline`) so the bar stays one row below 1280px.
- [x] 3. IconButton restyle (AC4/5); updated the two active-state assertions in `IconButton.test.tsx` (`bg-primary/15` → `bg-surface-2`).
- [x] 4. ModeChipsRow segmented track + active segment (AC3/5).
- [x] 5. Gate + live check.

## Dev Notes

- No `components/ui/*` edits — selector styling goes through `className` on `SelectTrigger`.
- Owner directive (2026-11-18): run 8.2 + 8.3 back-to-back without the CS/VS/CR pauses, so this file was written alongside the implementation rather than before it.
- Out of scope / follow-ups: the mobile bottom-sheet tools pattern (no live 375px check was possible — the window-resize tool doesn't work on this machine); `--primary` hue stays violet (logo/slider), so indigo appears only in glows/underglows; the Library tab strip scrollbar is 8.4's job.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- App.css fix: Library tabs went from 0 padding to the intended `12px 16px`; this also made the ControlBar wrap to 2 rows, which AC1's compaction resolved.
- Mode chip active colour changed from rose to the neutral surface-2 + indigo underglow (mode *dot* colours are untouched).
- Live Chrome (desktop, 1463px): bar is one row; Dorian + Notes active states verified in dark and light; no console errors.
- Gate: vitest 760/760, tsc, lint, build clean. 375px not verified.

### File List

- frontend/src/App.css
- frontend/src/components/ControlBar.tsx
- frontend/src/components/ModeChipsRow.tsx
- frontend/src/components/shared/IconButton.tsx
- frontend/src/components/shared/IconButton.test.tsx

## Change Log

- 2026-11-18: Implemented (DS, combined with 8.3 per owner). Status → review.
