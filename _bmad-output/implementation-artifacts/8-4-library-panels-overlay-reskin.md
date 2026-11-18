# Story 8.4: Library, Panels & Overlay Reskin

Status: review

## Story

As a user,
I want all panels and overlays to share the studio-grade glass language,
so that the Library, paywall and sheets match the Obsidian chrome and fretboard.

## Acceptance Criteria

1. Directional border highlights on all glass panels/overlays: lit top/left (`--glass-border*`), unlit bottom/right (`--glass-border-shade`).
2. LibraryPanel: heading-font title, hardware close button, all 5 tabs visible without a scroll strip, sliding indicator kept.
3. Library items: 4px rack rows; flat hover plate; active row raised on surface-2 with indigo edge + underglow; locked rows show a gold lock badge with a hover shimmer.
4. PaywallCard: 8px radius obsidian glass, gold lock badge, heading-font title, mono price, studio Upgrade button (indigo gradient, frosted top highlight, 4px radius).
5. All sheets (Login, CustomTuningCreator, Tuner, Metronome, account/rename/delete, mobile Library) share the treatment via `.glass-overlay`; bottom sheets get an 8px top radius and a grab handle.
6. `prefers-reduced-transparency` collapses borders to solid (including the directional edges); `prefers-reduced-motion` neutralises the shimmer (existing global gate).
7. Regression gate green.

## Tasks / Subtasks

- [x] 1. `index.css`: directional borders on `.glass-surface`/`.glass-overlay` (+ reduced-transparency overrides), `.glass-overlay[data-side='bottom']` radius + `::before` handle, `.lock-badge` + `.lock-row` shimmer, `.btn-studio`.
- [x] 2. `LibraryPanel.tsx`: `h2.font-heading` title, `rounded-sm` close button with `surface-interactive` hover, tabs `px-2 text-xs` with hidden scrollbar.
- [x] 3. `LibraryItem.tsx`: rack-row variants + `lock-badge` (replaces the outline `Badge` for locked; `Preview` badge unchanged).
- [x] 4. `PaywallCard.tsx`: badge, fonts, `btn-studio`, `rounded-lg`, `lock-row` on the card.
- [x] 5. Layout fixes found live: `.app-shell` top row → `minmax(var(--top-bar-height), auto)` (a wrapped ControlBar overlapped the mode-chips row, a pre-existing bug); side panel 320 → 360px so all five tabs fit.
- [x] 6. Gate + live check.

## Dev Notes

- No `components/ui/*` edits: the bottom-sheet styling uses base-ui's `data-side` attribute.
- Lock badge is `aria-hidden`. The locked state is still announced by `aria-disabled` on the row, as before.
- Owner directive: CS/VS skipped; story written alongside the implementation (same as 8.2/8.3).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- Live Chrome (desktop, dark): Library panel with the active rack row, all 5 tabs visible, mode chips no longer covered when the bar wraps, Jazzify tab content renders; no console errors.
- **Not verified live:** the PaywallCard (the local dev session resolves as premium, so the Jazzify tab opened instead of the paywall), the shimmer animation, mobile bottom sheets and the grab handle (375px resize unavailable on this machine). These are covered only by the existing tests and CSS review.
- Gate: vitest 760/760, tsc, lint, build clean.

### File List

- frontend/src/index.css
- frontend/src/features/library/LibraryPanel.tsx
- frontend/src/features/library/LibraryItem.tsx
- frontend/src/components/shared/PaywallCard.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-11-18: Implemented (DS). Status → review.
