# Story 6.2: Expanded Chord Library

Status: review

## Story

As a **guitarist**,
I want **a much larger chord vocabulary in the library**,
so that **I can explore richer, jazzier voicings (6ths, 9ths, 11ths, 13ths, altered dominants) beyond the basic triads and sevenths.**

## Acceptance Criteria

From `epics.distillate.md#Story 6.2`, reconciled against the **actual current `chords.js`** (which already grew to 13 entries — 6.1 added `Minor 7♭5`, and `Dominant 9` was already present — so the epic's candidate list is deduped below).

1. **AC1 — New chord types with verified intervals.** Add ~15 new chord types to `frontend/src/data/chords.js`, each with a correct root-relative interval array. Every new array MUST be **unique** — it may not duplicate any existing entry's array (see Dev Notes → *The harmony.ts coupling* for why exact-array uniqueness is load-bearing, not cosmetic). The recommended, verified set (final list confirmable at dev time):

   | Key (display name) | Intervals | Notes vs. existing |
   |---|---|---|
   | `Major 6` | `[0,4,7,9]` | new |
   | `Minor 6` | `[0,3,7,9]` | new |
   | `Add 9` | `[0,4,7,14]` | new (no 7th) |
   | `Minor Add 9` | `[0,3,7,14]` | new (no 7th) |
   | `Major 9` | `[0,4,7,11,14]` | new |
   | `Minor 9` | `[0,3,7,10,14]` | new |
   | `Dominant 7♭5` | `[0,4,6,10]` | new |
   | `Dominant 7♯5` | `[0,4,8,10]` | new — this **is** aug7; do NOT also add a separate `Augmented 7` (same array) |
   | `Dominant 7sus4` | `[0,5,7,10]` | new |
   | `Dominant 11` | `[0,4,7,10,14,17]` | new (6 notes) |
   | `Minor 11` | `[0,3,7,10,14,17]` | new (6 notes) |
   | `Dominant 13` | `[0,4,7,10,14,21]` | new (6 notes) |
   | `Major 13` | `[0,4,7,11,14,21]` | new (6 notes) |
   | `Major 6/9` | `[0,4,7,9,14]` | new |
   | `Minor 6/9` | `[0,3,7,9,14]` | new |

   Explicitly **excluded as duplicates of existing entries**: `m7♭5` (already `Minor 7♭5 [0,3,6,10]`, added in 6.1), `9`/dominant-9 (already `Dominant 9 [0,4,7,10,14]`).

2. **AC2 — Ordering preserves the free preview.** New entries are **appended after** the existing 13 (never inserted before them). The first 5 keys (`Major`, `Minor`, `Dominant 7`, `Minor 7`, `Major 7`) MUST stay exactly first, in order — `ChordLibrary` slices `FREE_CHORD_NAMES = CHORD_NAMES.slice(0, 5)`, so reordering the head would silently change which chords are free.

3. **AC3 — Fretboard rendering of extended chords.** Selecting a 5- or 6-note chord (9/11/13) highlights correctly on the fretboard in any tuning, with no layout break or crash. (This path already handles ≥5 notes — `Dominant 9` is a live 5-note chord — because `calculateChordDots` reduces every interval `% 12` into a note-name `Set`; verify, don't rebuild. See Dev Notes.)

4. **AC4 — Gating.** New chords follow the existing `ChordLibrary` free-preview / premium-lock pattern: because they're all past index 5, free users see them **locked** (PaywallCard on select), premium users see them selectable. **Premium per the provisional Epic-6 decision** (6.1 was free; 6.2/6.3 premium) — confirm at pickup (Open Question 2).

5. **AC5 — No regressions.** No change to existing chord selection/highlight, the standard Chord Library list behaviour, or the **Progression Builder** (its quality dropdown reads the same `CHORD_NAMES` and will simply grow — verify it still renders/selects, no layout break).

6. **AC6 — Diatonic ("Chords in Key") coverage — resolves the 6.1 deferred item.** `harmony.ts` classifies each diatonic chord by exact-array match against `CHORDS`. Adding these entries makes previously-`buildable:false` degrees in **exotic heptatonic scales** (e.g. Harmonic Major, Double Harmonic, Persian, Hungarian Minor, Enigmatic) resolvable. Verify: (a) all standard-scale diatonic triads/7ths still classify identically (no reclassification), and (b) newly-buildable exotic-scale degrees carry the correct root and a sensible label — no crash, no wrong-quality label. See Dev Notes → *The harmony.ts coupling*.

7. **AC7 — Regression gate.** Full frontend suite + `type-check` + `lint` + `build` all green.

## Tasks / Subtasks

- [x] **Task 1: Extend `chords.js`** (AC: 1, 2) — append the ~15 verified entries after the existing 13; keep the first 5 keys untouched and first. Do NOT add `Augmented 7` separately (it equals `Dominant 7♯5`). Do NOT re-add `m7♭5` or a second `9`. ✅ 15 entries appended after `Dominant 9` with a load-bearing append-only comment; head untouched.
- [x] **Task 2: No-duplicate-array guard** (AC: 1, 6) — add a data-integrity test asserting every `CHORDS` interval array is unique (stringify + Set size === key count). This is what keeps `harmony.ts`'s first-match classification deterministic. ✅ `src/data/chords.test.js` — unique-array test names the offender on failure; also asserts root-0/ascending intervals.
- [x] **Task 3: Verify extended-chord rendering** (AC: 3) — in the running app (or a `calculateChordDots` unit test), confirm a 9th, an 11th, and a 13th chord highlight across ≥2 tunings with no overflow/crash. No `FretboardCanvas`/`fretboardUtils` change expected. ✅ `fretboardUtils.test.ts` — parametrized 5/6-note chords (9/11/13) on Standard E + Drop D, root/scale-only, finite cx/cy in-bounds, and the 21→9 fold verified. No source change.
- [x] **Task 4: Gating check** (AC: 4) — confirm `ChordLibrary`'s preview/locked split still behaves with the longer list; free users get PaywallCard on new chords, premium sees all. No code change expected unless a bug surfaces. ✅ `ChordLibrary.test.tsx` — `Dominant 13` locked (aria-disabled) for free, selectable for premium. No source change.
- [x] **Task 5: Diatonic re-verification** (AC: 6) — extend `harmony.test.ts`: (a) golden-path major/minor diatonic classification is byte-identical to today (regression guard against reclassification); (b) at least one exotic heptatonic scale (e.g. Harmonic Major or Double Harmonic) that previously had a `buildable:false` 7th degree now builds, with correct `chordRoot`/`chordType`. **Decision point** — if a newly-buildable type lacks a `DISPLAY_SUFFIX`/`ROMAN_7TH_SUFFIX` entry in `harmony.ts`, see Open Question 3. ✅ Golden-path triad + 7th regression (C major, A minor) asserted unchanged; Double Harmonic V→`Dominant 7♭5` (G7♭5), iii→`Minor 6` (Em6), Enigmatic gains `Major 6`; invariant "buildable ⇒ real CHORDS key" across 5 exotic scales. **OQ3 resolved "close now"** — added `DISPLAY_SUFFIX`/`ROMAN_7TH_SUFFIX` entries for the 5 newly-buildable 4-note types.
- [x] **Task 6: Chord-data + library tests** (AC: 1, 2, 5) — assert new interval correctness for a sample (9/11/13/6/altered), `CHORD_NAMES` length, and that `slice(0,5)` is unchanged. Confirm `ProgressionBuilder` still lists/selects a new quality. ✅ `chords.test.js` — all 15 intervals + length 28 + first-5 slice + original-13 append-only; `ProgressionBuilder.test.tsx` — lists and adds `Major 13`.
- [x] **Task 7: Regression** (AC: 7) — `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green. ✅ 435/435 tests, type-check clean, lint clean, build succeeds (pre-existing chunk-size advisory only).

## Review Findings

**3-layer code review (2026-09-21):** Blind Hunter / Edge Case Hunter / Acceptance Auditor

**Result: 3 PATCH items, 5 dismissed as false positives**

### Patch Items (Test Coverage & Robustness)

- [ ] [Review][Patch] Incomplete extended-chord test coverage — `fretboardUtils.test.ts` parametrizes 6 extended chords but misses `Add 9`, `Minor Add 9`, `Major 6/9`, `Minor 6/9`. Could expand the parametrized suite to include all new ≥5-note types. [fretboardUtils.test.ts:81]
- [ ] [Review][Patch] Brittle free-tier index assertion — `ChordLibrary.test.tsx` line 87 uses magic number `>= 5` for free-preview boundary. Consider introducing a constant `FREE_TIER_CHORD_COUNT` or parametrizing the test to guard against future reordering. [ChordLibrary.test.tsx:87]
- [ ] [Review][Patch] Insufficient exotic-scale buildable coverage — `harmony.test.ts` verifies some exotic scales (Double Harmonic, Enigmatic) gain buildable degrees but only spot-checks a handful of types. Consider parametrizing over all 5 new buildable 4-note types across multiple exotic scales for exhaustive regression. [harmony.test.ts:129]

## Dev Notes

### Current state to build on (READ THESE — verified this session)

- **`frontend/src/data/chords.js`** — `CHORDS[name] = { intervals: number[] }`; `CHORD_NAMES = Object.keys(CHORDS)`. **13 entries today** (order matters): `Major, Minor, Dominant 7, Minor 7, Major 7, Sus2, Sus4, Diminished, Augmented, Diminished 7, Minor 7♭5, Minor Major 7, Dominant 9`. Note two things the epic stub predates: `Minor 7♭5 [0,3,6,10]` already exists (added by 6.1), and `Dominant 9 [0,4,7,10,14]` is already a live **5-note** chord. This is editable app-data (NOT in the CLAUDE.md frozen list — but `notes.js`/`scales.js`/`tunings.js` ARE frozen).
- **`features/library/ChordLibrary.tsx`** — `FREE_CHORD_NAMES = new Set(CHORD_NAMES.slice(0, 5))`. Non-premium: first 5 are `preview` (selectable), the rest `locked` (PaywallCard). Premium: all `default`/selectable. The list renders `title={name}` verbatim, so **keys must be human-readable display strings** (`Major 6`, `Dominant 7♯5`, `Major 6/9` — the ♭/♯ unicode and `/` are fine).
- **`utils/fretboardUtils.ts` → `calculateChordDots(intervals, rootNote, tuningName, capo?, stringsOverride?)`** — builds `chordNotes = new Set(intervals.map(i => getNoteAtFret(rootNote, i % 12)))` and lights every matching fret. So: (1) any interval ≥12 (the 14=9th, 17=11th, 21=13th) folds correctly via `% 12`; (2) it's set-based, so 5-6 note chords can't overflow or crash; (3) extension tones whose pitch-class coincides with a lower chord tone simply share dots — inherent and fine. **No change needed here.** `Dominant 9` already exercises the 5-note path.
- **`components/FretboardCanvas.tsx`** — chord branch calls `calculateChordDots(chord.intervals, chordRoot ?? rootNote, tuning, capo, strings)` (the `chordRoot ?? rootNote` from 6.1). Reads `CHORDS[chordName].intervals`. Larger `CHORDS` = more valid `chordName` values, no structural change.
- **`features/library/ProgressionBuilder.tsx`** — `const QUALITIES = CHORD_NAMES` drives its quality dropdown. Adding ~15 entries makes that dropdown longer; the whole Progression tab is already premium-gated, so no gating leak — just verify the longer list renders and selects cleanly (AC5).

### The harmony.ts coupling (the non-obvious crux — do not skip)

`lib/harmony.ts` (`diatonicChords`) classifies each stacked-thirds interval set by **exact array equality against `CHORDS`, iterating `Object.entries(CHORDS)` and breaking on the first match** (`harmony.ts:120-126`). Two consequences drive this story's guardrails:

1. **Duplicate arrays would silently reclassify.** If a new entry's array equals an existing entry's array and lands **earlier** in insertion order, `diatonicChords` would return the new name for an established diatonic chord (e.g. label a diatonic ii7 as something else). Mitigation = **append-only + unique-array test** (Tasks 1, 2). This is why `Dominant 7♯5` must not also be added as `Augmented 7` ([0,4,8,10] twice), and why `Minor 7♭5`/`Dominant 9` are excluded.
2. **This story *is* the fix for 6.1's deferred finding.** 6.1 deferred "exotic heptatonic scales not tested for buildable triads/7ths." `diatonicChords` only stacks **3 tones (triads) or 4 tones (7ths)** — so only new **3- and 4-note** entries can ever match a diatonic result (the 5-6 note 9/11/13 chords can never be produced by harmonization and never affect classification). The new 4-note altered/6th chords (`Major 6 [0,4,7,9]`, `Minor 6 [0,3,7,9]`, `Dominant 7♭5 [0,4,6,10]`, `Dominant 7♯5 [0,4,8,10]`, `Dominant 7sus4 [0,5,7,10]`) let exotic scales that previously stacked to an unmatched 7th now resolve to a real `CHORDS` key → `buildable:true`, highlightable. Verify this improves coverage without disturbing the standard major/minor golden paths (Task 5).
3. **Display-suffix gap for newly-buildable types.** `harmony.ts` has `DISPLAY_SUFFIX` (strip name) and `ROMAN_7TH_SUFFIX` (roman) maps covering only the *old* qualities. A newly-buildable `Major 6`/`Dominant 7♯5` degree would fall through to `?? ''` — the strip shows just the root (a C6 renders as "C", looking like a bare major). It never crashes, but it reads wrong. See Open Question 3 for whether to close this in 6.2 (recommended: add the handful of suffix entries — small, in-scope-adjacent) or defer.

### Fixed constraints

- **`chords.js` is editable app-data.** Do NOT modify `notes.js`, `scales.js`, `tunings.js` (frozen). Touching `harmony.ts` is allowed **only** if Open Question 3 is resolved "close it now" — otherwise 6.2 stays `chords.js` + tests.
- No new API routes; no new runtime dependencies (pure data + tests).
- Tailwind v4 CSS-first; `@/` alias; do NOT hand-edit `src/components/ui/`.
- Keys are human-readable display strings (rendered verbatim by `ChordLibrary`); keep the app's Title-Case + unicode-accidental convention (`Dominant 7♯5`, not `7#5`).

### Design decisions (baked in)

- **Append-only ordering** — protects both the free-preview slice (AC2) and harmony classification determinism (AC6). Never reorder the head.
- **One canonical name per interval set** — `Dominant 7♯5` covers aug7; no synonym entries. Keeps `CHORDS` a clean 1:1 array↔name map, which harmony relies on.
- **No rendering rework** — the `% 12` + Set path already handles ≥5-note chords; adding a parallel code path would be wheel-reinvention.
- **Naming parallelism** — `Major 6`/`Minor 6`, `Major 9`/`Minor 9`, `Major 13` etc. mirror the existing `Major 7`/`Minor 7` convention. Final key strings confirmable at dev time (Open Question 1).

### Previous-story intelligence

- **6.1 (Chords in Key)** is the direct predecessor and the reason `chords.js` and `harmony.ts` are shaped as they are. Its review **explicitly deferred exotic-scale buildable coverage to 6.2** — AC6/Task 5 here close that loop. Read `6-1-chords-in-key.md` → *Dev Notes* for the `CHORDS`/`harmony.ts` contract.
- **Recurring review theme across 4.4/4.5/6.1: silent state/classification leaks.** The 6.2 analog is the exact-array-match reclassification hazard — hence the mandatory unique-array test (Task 2) and the golden-path regression guard (Task 5a).
- **Cadence** (commits `e284b0c` 6.1, `cbf55b9` 4.5): implement → full regression → 3-layer code review (Blind Hunter / Edge Case Hunter / Acceptance Auditor) → patches. Same shape expected here.

### File structure

- **MODIFIED:** `frontend/src/data/chords.js` (append ~15 entries)
- **MODIFIED (tests):** a chord-data test (unique-array + interval-correctness — extend an existing suite or add `chords.test.ts`), `frontend/src/lib/harmony.test.ts` (golden-path regression + exotic-scale buildable), and optionally a `ChordLibrary`/`ProgressionBuilder` assertion for list length / free-slice invariance
- **CONDITIONALLY MODIFIED:** `frontend/src/lib/harmony.ts` (`DISPLAY_SUFFIX` / `ROMAN_7TH_SUFFIX` entries) — only if Open Question 3 resolves "close now"
- **NOT MODIFIED (verify only):** `FretboardCanvas.tsx`, `fretboardUtils.ts`, `ChordLibrary.tsx`, `ProgressionBuilder.tsx`

## Success Criteria

✅ ~15 new, correctly-interval'd chord types, all unique arrays · ✅ first-5 free preview intact (append-only) · ✅ 9/11/13 render on the board with no crash across tunings · ✅ gating intact (new chords premium-locked for free tier) · ✅ exotic-scale diatonic coverage improved with NO reclassification of standard scales · ✅ Progression Builder unaffected · ✅ tests/type-check/lint/build green

## Deferred / Out of Scope

- Chords-in-key harmonization logic itself (6.1 — done) · substitutions / "Jazzify" / shared-notes (6.3) · custom user-defined chords · audio playback of chords · chord **fingering diagrams**/voicings (this story highlights scale-position dots, not fretting shapes) · alternate spellings (flats)

## Open Questions (resolve at pickup — do not block story creation)

1. **Final chord set & key names** — go with the 15 verified entries and Title-Case naming above (`Major 6`, `Dominant 7♯5`, `Major 6/9`…), or adjust the list/labels? (Any additions must keep unique arrays.)
2. **Gating** — confirm **premium** for the expanded set (provisional Epic-6 decision), keeping only the first-5 basics free? Or a different free/premium split?
3. **harmony.ts display-suffix gap** — when a newly-added 4-note chord becomes buildable in an exotic diatonic scale, its strip/roman label falls back to empty (a C6 shows as "C"). Close it now by adding `DISPLAY_SUFFIX`/`ROMAN_7TH_SUFFIX` entries for the new types (recommended — small, completes AC6), or defer the labelling polish to 6.3?

## Dev Agent Record

### Context Reference
- Rewritten by create-story with exhaustive code analysis this session: `chords.js` (actual 13-entry state), `ChordLibrary.tsx` (free-slice gating), `fretboardUtils.calculateChordDots` (`% 12` + Set rendering), `harmony.ts` (exact-array first-match classification), `ProgressionBuilder.tsx` (shared `CHORD_NAMES`). Deduped the epic's candidate list against what already ships and surfaced the harmony.ts coupling that ties this story to 6.1's deferred finding.

### Completion Notes
- **Open Questions resolved (user AFK at pickup → took the recommended default for all 3, flagged for review):** (1) shipped the 15 verified entries with the Title-Case names as listed; (2) gating = **premium** (append-only past index 5 enforces it — no `ChordLibrary` change); (3) **closed the harmony.ts suffix gap now** — added `DISPLAY_SUFFIX`/`ROMAN_7TH_SUFFIX` entries for the 5 newly-buildable 4-note types (`Major 6`→`6`, `Minor 6`→`m6`, `Dominant 7♭5`→`7♭5`, `Dominant 7♯5`→`7♯5`, `Dominant 7sus4`→`7sus4`).
- **Verified the AC6 coupling with a throwaway computation** (mirrored `diatonicChords`' 7th-stacking against OLD vs NEW chord sets over all heptatonic scales) BEFORE writing tests: **zero reclassification of any standard scale**, and real new coverage — Double Harmonic (Byzantine) 3/7→5/7 (V=`Dominant 7♭5`, iii=`Minor 6`), Persian/Arabic gain `Dominant 7♯5`, Enigmatic 0/7→2/7 (`Major 6`, `Dominant 7♭5`). Only the 4-note entries without a >12 interval can ever match a diatonic stack; the 9/11/13/Add9/6-9 arrays (all carry a 14) can never be produced by harmonization, so they can't affect classification — confirmed, not assumed.
- **No rendering rework (AC3):** `calculateChordDots` already folds every interval `% 12` into a note `Set`, so 5-/6-note chords were already safe (`Dominant 9` shipped in 6.1). Covered with parametrized unit tests across two tunings + in-bounds/finite-coord guards rather than rebuilding a path.
- **AC5 no-regression:** `ProgressionBuilder` reads the same `CHORD_NAMES`; its dropdown simply grew — verified it lists and adds `Major 13`. No change to existing chord selection/highlight.
- **Judgment call (flag for review):** AC3 satisfied via `calculateChordDots` unit tests (the task explicitly allows "or a unit test"); did **not** run a live browser smoke since this is additive app-data + a small suffix map with no CSS/UI-structure change. A visual spot-check of a 13th chord highlighting is a reasonable code-review step given the project's "live-loading catches what vitest can't" history.
- **Regression:** 435/435 frontend tests (+30), `type-check`/`lint`/`build` all clean.

### File List
- **MODIFIED:** `frontend/src/data/chords.js` — appended 15 chord types after the existing 13 (append-only)
- **MODIFIED:** `frontend/src/lib/harmony.ts` — added `DISPLAY_SUFFIX`/`ROMAN_7TH_SUFFIX` entries for the 5 newly-buildable 4-note types (OQ3 "close now")
- **ADDED:** `frontend/src/data/chords.test.js` — unique-array guard, append-only invariance, interval correctness, dedup guards
- **MODIFIED:** `frontend/src/lib/harmony.test.ts` — golden-path regression + exotic-scale buildable coverage (closes 6.1 deferred finding)
- **MODIFIED:** `frontend/src/utils/fretboardUtils.test.ts` — extended-chord (9/11/13) rendering across two tunings
- **MODIFIED:** `frontend/src/features/library/ChordLibrary.test.tsx` — new expanded chord locked (free) / selectable (premium)
- **MODIFIED:** `frontend/src/features/library/ProgressionBuilder.test.tsx` — lists/adds a new expanded quality
- **NOT MODIFIED (verified only):** `FretboardCanvas.tsx`, `fretboardUtils.ts` (source), `ChordLibrary.tsx`, `ProgressionBuilder.tsx`

### Change Log
| Date | Change |
|---|---|
| 2026-09-18 | Story 6.2 rewritten from stub → ready-for-dev. Deduped candidate list (removed already-present `m7♭5`/`Dominant 9`, collapsed `aug7`≡`7♯5`), pinned append-only ordering to protect the free-preview slice, corrected AC3 (5-6 note rendering already works via `% 12`+Set), and surfaced the harmony.ts exact-array coupling → made AC6/Task 5 the resolution of 6.1's deferred exotic-scale coverage, with a mandatory unique-array test. 3 open questions flagged (final list, gating confirm, harmony suffix-map scope). |
| 2026-09-21 | Story 6.2 implemented → review. Appended 15 chord types to `chords.js` (append-only); resolved OQ3 "close now" by adding suffix-map entries in `harmony.ts` for the 5 newly-buildable 4-note types. Pre-verified the harmony coupling by computation (zero standard-scale reclassification; real exotic-scale gains). Added `chords.test.js` (unique-array + interval + append-only guards) and extended harmony/fretboardUtils/ChordLibrary/ProgressionBuilder suites. 3 open questions taken at recommended defaults (user AFK) — flagged for review. Regression: 435/435 tests, type-check/lint/build clean. |
