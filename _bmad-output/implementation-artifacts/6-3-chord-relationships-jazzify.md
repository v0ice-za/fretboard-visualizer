# Story 6.3: Chord Relationships / "Jazzify"

Status: backlog

## Story

As a **songwriter**,
I want **to find chords that share notes with my current chord and get "jazzier" substitution ideas**,
so that **I can enrich a progression and discover reharmonizations I wouldn't have thought of.**

## Acceptance Criteria

From `epics.distillate.md#Story 6.3`.

1. **AC1 — Shared-note discovery.** For the active chord (root + type), compute its pitch-class set and list other chords (from the library, at any of the 12 roots) that share **≥ N common tones**, ranked by overlap. N is tunable (default 2–3).
2. **AC2 — Jazzify suggestions.** Offer targeted reharmonization moves: extension upgrades (triad → 7th/9th/…), the relative major/minor, the tritone substitution for dominant chords, and ii–V framing of the target.
3. **AC3 — Clickable.** Each suggested chord highlights on the fretboard in the active tuning on click (reuses existing chord-highlight path).
4. **AC4 — Premium-gated** (provisional decision); non-premium sees the feature locked with the paywall.
5. **AC5 — No backend.** Pure client-side computation reusing the `lib/harmony.ts` util from 6.1/6.2; **no new API routes**.
6. **AC6 — Consistent UI.** Lives in the Library panel (new tab or contextual sub-panel), styled in the Epic 5 Aurora glass language.

## Tasks / Subtasks

- [ ] **Task 1: Relationship logic** — extend `lib/harmony.ts`: `sharedNoteChords(chord, { minShared })` and `jazzify(chord)` (extensions, relative, tritone sub, ii–V). Return `{ chordRoot, chordType, notes, sharedCount, relationship }[]`.
- [ ] **Task 2: UI** — a "Related / Jazzify" section listing suggestions with the relationship label and shared-note count; Aurora glass, `select-none`.
- [ ] **Task 3: Wire highlight** — click a suggestion → set chord on the board; active suggestion marked.
- [ ] **Task 4: Gating** — premium-lock the section for non-premium via the existing PaywallCard pattern.
- [ ] **Task 5: Tests** — unit-test `sharedNoteChords` (e.g. C major shares notes with Am, Em, F, …) and `jazzify` (C → Cmaj7/Am7/tritone sub); component test for render + highlight + gating.
- [ ] **Task 6: Regression** — `type-check`, `lint`, `pnpm test`, `pnpm build`.

## Developer Context

**Depends on:** **6.2** (richer vocabulary makes suggestions useful) and the `lib/harmony.ts` util from **6.1**. Sequenced **after Epic 5** and after 6.1/6.2.

- Pitch-class set = `(root + interval) mod 12` for each chord interval. Shared tones = set intersection size across candidate chords at all 12 roots.
- Tritone sub: for a dominant chord on root R, the sub is the dominant a tritone away (R+6). Relative: major↔its vi / minor↔its ♭III.

### Fixed Constraints
- **No new API routes**; pure frontend. Do NOT modify `musicTheory.js`/`tunings.js`/`scales.js` (new logic in `lib/harmony.ts`).
- Never trust client subscription state for anything server-side — but this feature has no server surface; gating is UI-only content lock, matching the existing library pattern.
- Tailwind v4 CSS-first; do NOT hand-edit `src/components/ui/`; `@/` alias; follow Epic 5 glass styling.

### File Structure
- **NEW:** relationship UI component under `features/library/` (+ test)
- **MODIFIED:** `frontend/src/lib/harmony.ts` (add relationship/jazzify functions + tests), LibraryPanel (mount point)

## Success Criteria
✅ Ranked shared-note chords · ✅ jazzify moves (extensions, relative, tritone, ii–V) · ✅ click highlights on board · ✅ premium-gated · ✅ no backend/frozen-file changes · ✅ tests/type-check/lint/build green

## Deferred / Out of Scope
- Full reharmonization of an entire progression (future) · voice-leading optimization · audio playback
