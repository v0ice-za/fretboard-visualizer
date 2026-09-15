# Story 6.2: Expanded Chord Library

Status: backlog

## Story

As a **guitarist**,
I want **a much larger chord vocabulary in the library**,
so that **I can explore richer, jazzier voicings beyond the basic triads and sevenths.**

## Acceptance Criteria

From `epics.distillate.md#Story 6.2`.

1. **AC1 — New chord types.** Add ~15–20 chord types to `chords.js` with correct root-relative intervals. Candidate set: `6`, `m6`, `m7♭5` (half-diminished), `add9`, `9`, `m9`, `maj9`, `11`, `13`, `7♭5`, `7♯5`, `7sus4`, `aug7`, `6/9`, `min11`, `maj13` (final list at dev time).
2. **AC2 — Sensible ordering.** `CHORD_NAMES` keeps the common chords first so the free-tier preview (first N) remains the useful basics; extended chords follow.
3. **AC3 — Fretboard rendering.** The existing chord-highlight path renders 5+ note / extended chords correctly on the fretboard in any tuning (no overflow/crash for 6-note chords).
4. **AC4 — Gating.** Expanded chords follow the existing free-preview / premium-lock pattern in `ChordLibrary` (premium per provisional decision) — free users see them locked with the paywall, premium sees all.
5. **AC5 — No regressions** to existing chord selection/highlight, the chord library list, or the progression builder (which reads the same chord data).

## Tasks / Subtasks

- [ ] **Task 1: Extend `chords.js`** — add the new entries with verified intervals; keep common chords first in insertion order.
- [ ] **Task 2: Verify rendering** — check a few extended chords (9/11/13) highlight correctly across tunings; confirm no layout break for 5–6 note chords.
- [ ] **Task 3: Gating check** — confirm `ChordLibrary` free/preview/locked split still behaves with the larger list; PaywallCard triggers on locked extended chords.
- [ ] **Task 4: Tests** — extend `ChordLibrary`/chord-data tests: interval correctness for a sample of new chords, list length, ordering keeps basics first.
- [ ] **Task 5: Regression** — `type-check`, `lint`, `pnpm test`, `pnpm build`; verify progression builder unaffected.

## Developer Context

**Depends on:** nothing; **underpins 6.3** (jazzify draws on the larger vocabulary). Sequenced **after Epic 5**.

- `chords.js` today: 12 types, `{ name: { intervals:[…] } }`, `CHORD_NAMES = Object.keys(CHORDS)`.
- `ChordLibrary.tsx` gates `FREE_CHORD_NAMES = first 5`; the rest lock for non-premium. Ordering therefore controls what's free.

### Fixed Constraints
- **`chords.js` is editable app-data** (provisional decision — it is NOT in the frozen list). Do NOT touch `musicTheory.js`/`tunings.js`/`scales.js`.
- No new API routes; no new runtime deps.
- Tailwind v4 CSS-first; `@/` alias.

### File Structure
- **MODIFIED:** `frontend/src/data/chords.js` (+ any chord-data test)

## Success Criteria
✅ ~15–20 new correct chord types · ✅ basics still first (free preview intact) · ✅ extended chords render on the board · ✅ gating intact · ✅ progression builder unaffected · ✅ tests/type-check/lint/build green

## Deferred / Out of Scope
- Chords-in-key (6.1) · substitutions/jazzify (6.3) · custom user-defined chords
