# Story 7.2: Explicit Play Controls (remove auto-play)

Status: done (code review skipped by owner choice 2026-11-16)

<!-- Note: this story file was written retroactively — implementation, tests, and the
live-browser check were already complete when it was authored. See Dev Agent Record. -->

## Story

As a guitarist, I want sound only when I deliberately ask for it, so browsing chords is silent and never surprising.

## Acceptance Criteria

1. Selecting/browsing a chord NEVER plays audio. Remove the `playChord` call on select in `ChordLibrary`, `ChordsInKey`, `ChordRelationships`, and on step in `useProgressionPlayback` (←/→ and Prev/Next stay silent).
2. Each chord row in Chord Library / Diatonic / Jazzify gets a small Play IconButton (aria-label "Play \<chord\>"); clicking plays that chord WITHOUT changing selection (stopPropagation).
3. Progression Builder gets a "Play current chord" button beside Prev/Next.
4. Premium gate unchanged and enforced inside `playChord`; free users see Play buttons with a lock badge → click raises the shared PaywallCard.
5. ControlBar "Sound" toggle REMOVED; `audioStore.enabled` retired (persisted state migrated safely — old key ignored). Volume stays at stored value.
6. Play buttons Tab-reachable, Enter/Space activate, don't hijack ←/→ stepping.
7. Tests: selection/stepping produce ZERO `playChord` calls; Play button exactly one; free-user click opens PaywallCard.
8. Metronome and tuner unaffected.
9. Real-browser audible check performed (closes the open backlog item).

## Tasks / Subtasks

- [x] **Task 1: Retire the Sound toggle (`stores/audioStore.ts`, `lib/playChord.ts`, `components/ControlBar.tsx`)** (AC: 1, 5)
  - [x] 1.1 Remove `enabled`/`setEnabled`/`toggleEnabled` from `audioStore`; keep `volume` only.
  - [x] 1.2 `readPrefs()` ignores a legacy persisted `enabled` field instead of erroring — old localStorage still hydrates `volume`.
  - [x] 1.3 `playChord` drops the `enabled` gate; only the premium gate remains. The explicit Play click is now the user's consent.
  - [x] 1.4 Remove the Sound `IconButton` from `ControlBar` (and the now-unused `Volume2`/`VolumeX` imports, `soundEnabled`/`toggleSound`).

- [x] **Task 2: `features/library/PlayButton.tsx` (new)** (AC: 2, 4, 6)
  - [x] 2.1 Presentational button: `label`, `locked`, `onPlay`, `onPaywallTrigger?`. Shows a `Play` glyph, or `Lock` + raises the paywall when `locked`.
  - [x] 2.2 `stopPropagation` on click, always rendered as a sibling of the row's own selectable control (never nested inside it), so selecting a chord can never also trigger play.
  - [x] 2.3 Native `<button>` — Tab-reachable, Enter/Space work with no extra wiring.

- [x] **Task 3: `features/library/ChordLibrary.tsx`** (AC: 1, 2, 4, 7)
  - [x] 3.1 `handleSelect` no longer calls `playChord`.
  - [x] 3.2 Each row becomes `LibraryItem` (unchanged selection behaviour) + a sibling `PlayButton`, `locked={!isPremium}`, `onPlay` → `playChord(name, rootNote)`.

- [x] **Task 4: `features/library/ChordsInKey.tsx`** (AC: 1, 2, 4, 7)
  - [x] 4.1 New optional `onPaywallTrigger` prop.
  - [x] 4.2 `handleClick` no longer calls `playChord`.
  - [x] 4.3 Each buildable degree's `<li>` gets a sibling `PlayButton` next to the existing select button (button width changed `w-full` → `flex-1` to make room).

- [x] **Task 5: `features/library/ChordRelationships.tsx`** (AC: 1, 2, 4, 7)
  - [x] 5.1 New optional `onPaywallTrigger` prop.
  - [x] 5.2 `select()` no longer calls `playChord`.
  - [x] 5.3 `SuggestionButton` restructured: the existing clickable row + a sibling `PlayButton`, wired into both the Jazzify and "Shares notes" lists.

- [x] **Task 6: `features/library/ProgressionBuilder.tsx` + `hooks/useProgressionPlayback.ts`** (AC: 1, 3, 7, 8)
  - [x] 6.1 `useProgressionPlayback`'s step effect no longer calls `playChord` (import removed) — stepping only drives the display.
  - [x] 6.2 `ProgressionBuilder` gets a "Play current chord" button beside Prev/Next, disabled when no chord is active. No lock/paywall needed — this block only renders for premium users already.

- [x] **Task 7: Wire `onPaywallTrigger` through `LibraryPanel.tsx`** (AC: 4)
  - [x] 7.1 Pass `onPaywallTrigger` into `ChordsInKey` and `ChordRelationships` (previously only `ChordLibrary`/`ProgressionBuilder` received it).

- [x] **Task 8: Tests** (AC: 7)
  - [x] 8.1 New `PlayButton.test.tsx`: unlocked plays, locked raises paywall, click doesn't propagate to an enclosing row, keyboard-activatable.
  - [x] 8.2 `ChordLibrary.test.tsx`, `ChordsInKey.test.tsx`, `ChordRelationships.test.tsx`: mock `@/lib/playChord`; assert zero calls on select/deselect, exactly one Play button per eligible row, free-user Play click raises the paywall, premium Play click calls `playChord` with the right args without changing selection.
  - [x] 8.3 `ProgressionBuilder.test.tsx`, `useProgressionPlayback.test.tsx`: assert zero `playChord` calls across row-select / Next / Prev / arrow-key stepping; "Play current chord" disabled with no active chord, calls `playChord` with the active chord when clicked.
  - [x] 8.4 `audioStore.test.ts`: dropped the `enabled`/`toggleEnabled` tests; added a migration test proving a persisted `enabled` field from before this story is ignored and `volume` still hydrates.
  - [x] 8.5 `playChord.test.ts`: dropped the "silent when sound disabled" test (no such gate any more).
  - [x] 8.6 `ControlBar.test.tsx`: dropped the two Sound-toggle tests and the now-unused `audioStore` import.

- [x] **Task 9: Verification** (AC: 8, 9)
  - [x] 9.1 `cd frontend && npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all green (671/671 tests).
  - [x] 9.2 Live browser check (`npm run dev`, `VITE_DEV_UNLOCK_PREMIUM=true`). Recorded in Completion Notes.

## Dev Notes

### Why `ChordsInKey`/`ChordRelationships` needed a new prop
Neither previously received `onPaywallTrigger` — `ChordLibrary` and `ProgressionBuilder` already did. Both needed it now because their new Play buttons must raise the shared `PaywallCard` for free users, same pattern as everywhere else in the Library panel.

### Why `ProgressionBuilder`'s new Play button needs no lock/paywall handling
The entire custom-builder block (Add row, Prev/Next, sequence list) only renders when `isPremium` — free users see a locked placeholder instead of that whole section (pre-existing gating, unchanged by this story). So the "Play current chord" button, living inside that block, is already premium-only by construction.

### `PlayButton` placement: sibling, never nested
Every call site renders `PlayButton` as a flex sibling of the row's own selectable element (a `<div>` wrapper, or an `<li>`), never inside it. Two reasons: nesting a `<button>` inside another `<button>` is invalid HTML (and `ChordLibrary`'s `LibraryItem` root *is* a `<button>`), and keeping them siblings means a click on Play structurally cannot bubble into the row's own `onClick` — `stopPropagation` in `PlayButton` is then a defensive backstop, not the only thing preventing it.

### `audioStore` migration
`enabled` was the old Sound toggle's persisted flag. `readPrefs()` simply stops reading it — a pre-7.2 `{enabled, volume}` blob in localStorage still yields the correct `volume`, and the now-absent `enabled` field is never surfaced again. No explicit migration step was needed beyond "stop looking at that key."

### Architecture compliance
- Frontend-only. No new API routes, no backend, no schema changes.
- `playChord` remains the single gated entry point for chord audio (architecture's "Component Boundaries" pattern — one function owns the premium check, call sites stay one-liners).
- Did not touch `data/*.js` frozen files.
- `components/ui/*` untouched.

### Previous-work intelligence
- **Story 7.1** fixed `useProgressionPlayback` so stepping sets `chordName`/`chordRoot` (not `rootNote`) and never overwrites the key. This story builds directly on that — the step effect this story edits is the same one 7.1 already rewrote; only the `playChord` call inside it was removed here.
- **Backlog** (`backlog.md` → "Audio — slice 2 (follow-ups)") was the original source of this requirement: "Replace auto-play-on-select with an explicit Play button everywhere sound can trigger — decision made, no more auto-play." That backlog item is now resolved by this story (volume-slider UI and fret-click-to-play-single-note remain separate, not-yet-storied follow-ups — explicitly out of scope here).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Completion Notes List

- Retired `audioStore.enabled` and the Sound `IconButton`; `playChord` now gates on premium only. A pre-7.2 persisted `{enabled, volume}` blob still hydrates `volume` correctly (new migration test).
- New `features/library/PlayButton.tsx`: small sibling Play/Lock button reused across all four surfaces (`ChordLibrary`, `ChordsInKey`, `ChordRelationships`, and `ProgressionBuilder`'s single "Play current chord" button).
- Removed every `playChord` call that fired on select/step (`ChordLibrary.handleSelect`, `ChordsInKey.handleClick`, `ChordRelationships.select`, `useProgressionPlayback`'s step effect). Each surface now calls `playChord` only from its own `PlayButton`'s `onPlay`.
- `ChordsInKey` and `ChordRelationships` gained an optional `onPaywallTrigger` prop, wired through `LibraryPanel`.
- 671/671 tests pass (+17 over the 654 at story start, net of some removed Sound-toggle tests), `tsc --noEmit`, `eslint`, and `vite build` all clean.
- **Live browser check** (Chrome, dev server, `VITE_DEV_UNLOCK_PREMIUM=true`, key A, Standard E):
  - ControlBar: no Sound button; Theme/Notes/Draw/Tuner/Metronome/Library/Sign-in intact, no layout gap.
  - Chord Library: every row shows a small outline Play icon beside it. Selecting "Major" highlighted it and updated the fretboard; clicking the Play icon on a *different* row ("Minor") left the selection on "Major" and the fretboard unchanged.
  - Diatonic (switched to A Major/Ionian — Pentatonic Minor isn't heptatonic): all 7 degrees, including vii°, show a Play icon. Selecting "ii Bm" highlighted it with 7.1's key-root rings; clicking the Play icon on "I A" left "ii Bm" selected.
  - Jazzify: same pattern — selecting "D Major" then clicking Play on the "B Minor" suggestion left "D Major" selected.
  - Progression: loaded the "I–V–vi–IV" preset; "Play" button next to Prev/Next starts disabled (no active chord), becomes enabled after "Next" activates "A Major", and clicking it left the active chord unchanged.
  - No console errors from any of the above. One pre-existing, unrelated console warning surfaced when closing the Metronome sheet (`DialogClose`/shadcn `Button` ref warning) — not touched by this story, out of scope (`components/ui/*` is generated, do-not-hand-edit).
  - **Not independently verified: actual audible output.** Web Audio plays correctly structurally (no errors, `AudioContext` created), but confirming it is actually heard needs a human in a real browser — same long-standing caveat as the original backlog item this story closes out conceptually (the *trigger* is now correct; the one-time "does it make sound" check is still something only the user's own ears can confirm).

### File List

- `frontend/src/stores/audioStore.ts` (modified)
- `frontend/src/stores/audioStore.test.ts` (modified)
- `frontend/src/lib/playChord.ts` (modified)
- `frontend/src/lib/playChord.test.ts` (modified)
- `frontend/src/components/ControlBar.tsx` (modified)
- `frontend/src/components/ControlBar.test.tsx` (modified)
- `frontend/src/hooks/useProgressionPlayback.ts` (modified)
- `frontend/src/hooks/useProgressionPlayback.test.tsx` (modified)
- `frontend/src/features/library/ChordLibrary.tsx` (modified)
- `frontend/src/features/library/ChordLibrary.test.tsx` (modified)
- `frontend/src/features/library/ChordsInKey.tsx` (modified)
- `frontend/src/features/library/ChordsInKey.test.tsx` (modified)
- `frontend/src/features/library/ChordRelationships.tsx` (modified)
- `frontend/src/features/library/ChordRelationships.test.tsx` (modified)
- `frontend/src/features/library/ProgressionBuilder.tsx` (modified)
- `frontend/src/features/library/ProgressionBuilder.test.tsx` (modified)
- `frontend/src/features/library/LibraryPanel.tsx` (modified)
- `frontend/src/features/library/PlayButton.tsx` (new)
- `frontend/src/features/library/PlayButton.test.tsx` (new)
- `_bmad-output/implementation-artifacts/7-2-explicit-play-controls.md` (story record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status)

## Change Log

- 2026-11-16: Implemented Story 7.2. Removed all auto-play-on-select/step `playChord` calls; added a reusable `PlayButton` (sibling, never nested) to Chord Library, Diatonic, Jazzify, and a "Play current chord" button to Progression Builder; retired the ControlBar Sound toggle and `audioStore.enabled` (with a safe migration for old persisted state). +17 tests (671 total). Live-verified in Chrome with the premium dev-unlock flag across all four surfaces plus the ControlBar.
