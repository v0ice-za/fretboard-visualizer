# Story 6.1: Chords in Key (Diatonic Chords)

Status: done

## Story

As a **songwriter**,
I want **to see the chords that belong to the selected key + scale**,
so that **I instantly know which chords fit what I'm playing — without working out the harmony by hand.**

## Acceptance Criteria

From `epics.distillate.md#Story 6.1`, reconciled against the **actual current code** (the source docs assume a `chordName + root` highlight state that doesn't fully exist yet — see Dev Notes → Architectural gap; this AC list corrects for that).

1. **AC1 — Diatonic computation.** For the active `rootNote` + `scaleName`, compute the diatonic chords by stacking scale thirds on each degree (triads by default). Each chord's **quality is derived** from the scale's own interval set (Major/Minor/Diminished/Augmented), never hardcoded to the major I-ii-iii pattern. E.g. `A` + `Natural Minor (Aeolian)` → `Am B° C Dm Em F G` (i ii° III iv v VI VII), NOT the major pattern.
2. **AC2 — "Chords in Key" UI.** A new **`In Key` tab in the Library panel** (`LibraryPanel.tsx`, alongside Scales/Chords/Progression) shows each degree with its Roman-numeral quality (major = uppercase `I`, minor = lowercase `ii`, dim = `vii°`, aug = `III+`) **and** the concrete chord name (`C major → C Dm Em F G Am Bdim`). Aurora glass styling (Epic 5), `select-none` on clickable text.
3. **AC3 — Fretboard highlight.** Clicking a degree highlights that chord's shape on the fretboard **at that degree's own root** in the active tuning (ii in C major = **D**-rooted minor, while the C-major scale stays put). The active degree is visually marked. Clicking the active degree again clears the highlight. This reuses `calculateChordDots` but requires a new `chordRoot` field in `fretboardStore` (see Dev Notes → Architectural gap — this is the crux of the story).
4. **AC4 — Optional 7ths.** A toggle extends harmonization to diatonic 7th chords. Major-scale example: `Imaj7 ii7 iii7 IVmaj7 V7 vi7 vii∅7`. The half-diminished (m7♭5) case needs a decision — see Dev Notes → Half-diminished gap; default path adds one entry to `chords.js`.
5. **AC5 — Graceful degrade.** Only 7-note (heptatonic) scales harmonize (`intervals.length === 7`). Non-heptatonic scales (pentatonics, blues, whole-tone, diminished, chromatic, Japanese, Hirajoshi, bebop) show a short *"Harmonization needs a 7-note scale"* note instead — never a crash, never wrong chords. (The store default `Pentatonic Minor` is non-heptatonic, so the degrade state is what the user sees on first open — get it right.)
6. **AC6 — Free tier.** No premium gating on this tab (confirmed in `epics.distillate.md`). The `In Key` tab is always selectable; no lock badge, no `PaywallCard`.
7. **AC7 — No backend / frozen files.** Pure client-side computation; **no new API routes**. Harmonization logic in a NEW `frontend/src/lib/harmony.ts` that *reads* `scales.js` + `chords.js` + `notes.js`. **`tunings.js`, `scales.js`, and `notes.js`/`musicTheory` must NOT be modified** (`chords.js` is editable app-data — not in the CLAUDE.md frozen list — and AC4 may add exactly one entry to it).
8. **AC8 — Regression.** Full frontend suite + `type-check` + `lint` + `build` green. No behavioural change to the existing Scale/Chord/Progression tabs or the standard `ChordLibrary` highlight path.

## Tasks / Subtasks

- [x] **Task 1: Harmony util** (AC: 1, 4, 5) — NEW `frontend/src/lib/harmony.ts`
  - [x] `diatonicChords(rootNote: string, scaleName: string, opts?: { sevenths?: boolean }): DiatonicChord[]` returning `{ degree: number; roman: string; chordRoot: string; chordType: string; notes: string[]; buildable: boolean }[]`.
  - [x] Guard: if the scale's `intervals.length !== 7`, return `[]` (caller renders the degrade note). Looks scale intervals up from `SCALES[scaleName].intervals` using the exact verbose key.
  - [x] For each degree `i` (0..6): stacks thirds by taking scale degrees `i`, `i+2`, `i+4` (mod 7, +12 per octave wrap) — and `i+6` when `sevenths`. Interval set = each tone's semitone offset from the chord root, normalized to `[0,11]`.
  - [x] Classifies the interval set against `CHORDS` by exact array match → `chordType`. No match → `buildable: false`, `chordType: ''` (never emits a non-`CHORDS` key); the degree renders greyed + non-clickable.
  - [x] `chordRoot = noteAtSemitone(rootNote, intervals[i])`. `notes` = chord tones as note names. `roman` cased by derived quality (upper=major/aug, lower=minor/dim) with `°`/`+` for triads and `maj7`/`7`/`∅7`/`°7` suffixes for 7ths. `chordDisplayName()` helper exported for the strip display name.
- [x] **Task 2: fretboardStore — independent chord root** (AC: 3) — MODIFIED `frontend/src/stores/fretboardStore.ts`
  - [x] Added `chordRoot: string | null` (default `null`) + `setChordRoot`. Null → chord highlights at `rootNote` (preserves existing `ChordLibrary` behaviour).
  - [x] `setChordName` now always resets `chordRoot: null` in the same `set()` (clears a stale diatonic root on both select and clear); the In-Key feature calls `setChordRoot` *after* `setChordName`. Cross-feature leak guard test added.
- [x] **Task 3: Render at chord root** (AC: 3) — MODIFIED `frontend/src/components/FretboardCanvas.tsx` + `frontend/src/App.jsx`
  - [x] `FretboardCanvas` accepts `chordRoot?: string | null`; chord branch calls `calculateChordDots(chord.intervals, chordRoot ?? rootNote, …)`; `chordRoot` added to the `useMemo` deps.
  - [x] `App.jsx` pulls `chordRoot` from the store and passes it to `<FretboardCanvas chordRoot={chordRoot} … />`.
- [x] **Task 4: "Diatonic" tab UI** (AC: 2, 5, 6) — NEW `frontend/src/features/library/ChordsInKey.tsx` (+ test) + MODIFIED `LibraryPanel.tsx`
  - [x] Added `'inKey'` to the `Tab` union, `TAB_LABELS` (`'Diatonic'` — per user decision), `TAB_ORDER` (after `'chord'`), and the `tabContent` switch. FREE — not added to the `handleTabClick` premium gate.
  - [x] `ChordsInKey` reads `rootNote`, `scaleName`, `chordName`, `chordRoot`; calls `diatonicChords(...)`; renders the degree strip. Active degree = `chordType === chordName && chordRoot === store.chordRoot`. Click sets `setChordName(chordType)` then `setChordRoot(chordRoot)`; active re-click calls `setChordName(null)`.
  - [x] Empty result → "Harmonization needs a 7-note scale" note. Aurora glass styling + `select-none`.
- [x] **Task 5: 7ths toggle** (AC: 4) — in `ChordsInKey.tsx`
  - [x] Local `useState` toggle re-runs `diatonicChords(..., { sevenths: true })`. m7♭5 resolved via **Option A** — added `'Minor 7♭5': [0,3,6,10]` to `chords.js`, so `vii∅7` renders on the fretboard.
- [x] **Task 6: Tests** (AC: 1–5) — NEW `harmony.test.ts` + `ChordsInKey.test.tsx`; extended `fretboardStore.test.ts` + `LibraryPanel.test.tsx`
  - [x] `diatonicChords('C', 'Major (Ionian)')` → roots `C D E F G A B`, types `Major Minor Minor Major Major Minor Diminished`, romans `I ii iii IV V vi vii°`.
  - [x] `diatonicChords('A', 'Natural Minor (Aeolian)')` → `Am Bdim C Dm Em F G` (i ii° III iv v VI VII) — proves quality is derived.
  - [x] `diatonicChords('A', 'Pentatonic Minor')` → `[]` (degrade). Plus unknown-scale + 8-note scale degrade cases.
  - [x] 7ths: `diatonicChords('C', 'Major (Ionian)', { sevenths: true })` → `Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5` / romans `Imaj7 ii7 iii7 IVmaj7 V7 vi7 vii∅7`.
  - [x] `fretboardStore`: `setChordName(null)` clears `chordRoot`; `setChordName(name)` resets a previously-set `chordRoot`.
  - [x] `ChordsInKey` component: heptatonic degrees, pentatonic degrade note, click wires `setChordName`+`setChordRoot`, active re-click clears, 7ths toggle, single-active-degree. `LibraryPanel`: Diatonic tab is free (no paywall).
- [x] **Task 7: Regression** (AC: 8) — `type-check`, `lint`, `test`, `build` all green (403/403 tests). `ChordLibrary` highlight still roots at `rootNote` via the null-chordRoot path; Scales/Progression tabs untouched.

## Dev Notes

### Current state to build on (READ THESE — verified this session)

- **`data/scales.js`** — `SCALES[name] = { intervals: number[], category }`. Keys are verbose: `'Major (Ionian)'`, `'Natural Minor (Aeolian)'`, `'Dorian'`, `'Harmonic Minor'`, … Heptatonic (7-note) scales are the diatonic modes + Harmonic/Melodic Minor + Harmonic Major + Phrygian Dominant + Hungarian Minor + Double Harmonic + Persian + Arabic + Lydian Dominant + Super Locrian + Enigmatic. Everything else (pentatonic ×2, blues ×2, whole-tone, diminished ×2, chromatic, Japanese, Hirajoshi, bebop ×3) is non-heptatonic → degrade.
- **`data/chords.js`** — `CHORDS[name] = { intervals: number[] }`, matched by **exact interval-array equality**. Available triads: `Major [0,4,7]`, `Minor [0,3,7]`, `Diminished [0,3,6]`, `Augmented [0,4,8]` — all four diatonic triad qualities are covered. 7ths present: `Major 7 [0,4,7,11]`, `Minor 7 [0,3,7,10]`, `Dominant 7 [0,4,7,10]`, `Diminished 7 [0,3,6,9]`. Also `Sus2/Sus4/Minor Major 7/Dominant 9`. `CHORD_NAMES = Object.keys(CHORDS)`.
- **`data/notes.js`** (this is the "music theory" util — there is **no** `musicTheory.js` despite CLAUDE.md's wording; the frozen intent covers `notes.js` too): `CHROMATIC_NOTES` (sharps), `normalizeNote`, `noteIndex`, `noteAtSemitone(rootNote, semitones)`. Use `noteAtSemitone` for degree roots. **Do not modify `notes.js`.**
- **`stores/fretboardStore.ts`** — `chordName: string | null` + `setChordName`. There is **no chord root** today; the chord renders at `rootNote`.
- **`components/FretboardCanvas.tsx`** — chord branch (≈ line 65): `calculateChordDots(chord.intervals, rootNote, tuning, capoPosition, strings)`. `calculateChordDots(intervals, rootNote, tuningName, capo?, stringsOverride?)` already takes an arbitrary root — so rooting a chord elsewhere is a one-arg change once `chordRoot` exists.
- **`features/library/ChordLibrary.tsx`** — sets `chordName` (root = current `rootNote`); free preview = first 5 `CHORD_NAMES` via `slice(0,5)`.
- **`features/library/LibraryPanel.tsx`** — tabs `'scale' | 'chord' | 'progression'` via `Tab` union + `TAB_LABELS` + `TAB_ORDER` + `tabContent` switch; sliding indicator (5.3) measures the active tab automatically, so a 4th tab just works. Premium gating lives in `handleTabClick` (progression only) — leave `inKey` out of it.

### Architectural gap (the crux — don't miss this)

The epic's AC says "reuses existing chord-highlight rendering + chordName/root state," but **there is no independent chord-root state** — chords are hardwired to `rootNote`. Diatonic chords each have a *different* root (ii of C major = D). Setting `rootNote = D` would drag the whole scale to D, which is wrong. Fix = add `chordRoot: string | null` to the store and let `FretboardCanvas` render the chord at `chordRoot ?? rootNote`. This keeps the C-major scale on-screen while highlighting a D-minor shape. This is 3 small edits (store field, canvas arg + dep, App prop) and is the highest-risk-if-skipped part of the story.

### Half-diminished gap (AC4 decision — flagged for the user)

Stacking a 7th on the major-scale vii degree gives **m7♭5 / half-diminished `[0,3,6,10]`**, which is **not** in `CHORDS` (only fully-diminished `Diminished 7 [0,3,6,9]` exists). Without a matching `CHORDS` key the highlight path can't render it. Two options:
- **(A) Default/recommended:** add one entry `'Minor 7♭5': { intervals: [0,3,6,10] }` to `chords.js` (editable app-data). Correct and minimal. Side effect: it appears as a 13th item in the standard Chord Library (premium, since it's past the `slice(0,5)` free window) — a benign, arguably nice addition that also seeds 6.2.
- **(B) Defer to 6.2:** in 7ths mode, render the vii chord as the plain diminished **triad** (`vii°`) and note "7th needs expanded library." Keeps `chords.js` untouched but makes AC4 slightly incomplete.

The naturally-occurring m7♭5 also shows up as ii° in harmonic-minor-family scales, so option A benefits more than just the major key.

### Display & computation details (prevent dev fumbles)

- **`chordType` is a verbose `CHORDS` key** (`'Minor'`, `'Diminished'`, `'Major 7'`), which is what the highlight path needs — but it's NOT the display name. The strip shows `chordRoot + short suffix`. Suffix map: Major→`` (empty), Minor→`m`, Diminished→`dim` (or `°`), Augmented→`+`, `Major 7`→`maj7`, `Minor 7`→`m7`, `Dominant 7`→`7`, `Minor 7♭5`→`m7♭5` (or `∅7`). So `chordRoot='D', chordType='Minor'` → **`Dm`**; `chordRoot='B', chordType='Diminished'` → **`Bdim`**.
- **Compute from `SCALES[scaleName].intervals` directly** (an ordered array). Do NOT reuse `fretboardUtils.getScaleNotes()` — it returns an **unordered `Set`** of note names, useless for stacking thirds by degree index.
- **Names are sharp-spelled** (`A#`, not `Bb`) — `noteAtSemitone` normalizes to `CHROMATIC_NOTES` (sharps). This is the app-wide convention; don't "fix" it to flats. (C major and A natural minor have no accidentals, so the golden-path tests stay clean.)
- **`modeIndex` is irrelevant to harmonization** — it drives a separate parallel-mode overlay. Harmonize from `rootNote` + `scaleName` only. (The chord branch in `FretboardCanvas` already short-circuits the scale/mode render while a chord is active, so no overlay conflict.)

### Design decisions

- **7ths toggle = local component state**, not a persisted store field (no AC requires it to survive reloads or appear in the URL/session — keep the store surface minimal; 4.4/4.5 both showed extra store fields create restore/leak edge cases).
- **Degrade = a short note**, not partial chords — showing "only buildable chords" for a pentatonic invites wrong-looking harmony; the note is clearer and can't be misread.
- **Active-degree detection** by `(chordType === chordName && chordRoot === store.chordRoot)`, not by degree index — robust if the user changes key while a chord is highlighted.

### Previous-story intelligence

- **4.3 Chord Progression Builder** is the closest analog (pure-frontend, chord-based, lives in the Library panel): see `features/library/ProgressionBuilder.tsx`, `stores/progressionStore.ts`, `hooks/useProgressionPlayback.ts` for the established patterns (Zustand store, glass styling, click-to-highlight).
- **Cross-feature state leaks are the recurring review finding** (4.4 cross-account session leak; 4.5 theme guard) — hence the explicit Task 2 requirement that switching between the standard Chord tab and the In-Key tab never leaves a stale `chordRoot`. Add a test for it.
- Recent commits (`cbf55b9` 4.5, `f373880` 4.4) all follow: implement → full regression → 3-layer code review → patches. Same shape here.

### Fixed constraints

- Do NOT modify `tunings.js`, `scales.js`, `notes.js`. New logic in `lib/harmony.ts`. `chords.js` may gain at most the one AC4 entry (option A).
- No new API routes (pure frontend).
- Tailwind v4 CSS-first; do NOT hand-edit `src/components/ui/`; `@/` alias; new components under `features/library/`.
- Follow Epic 5 Aurora glass styling + `select-none` on clickable text for any new UI.
- All chord `chordType` values emitted by `diatonicChords` MUST be valid `CHORDS` keys (the highlight path looks them up in `CHORDS`).

### File structure

- **NEW:** `frontend/src/lib/harmony.ts` (+ `harmony.test.ts`); `frontend/src/features/library/ChordsInKey.tsx` (+ `ChordsInKey.test.tsx`)
- **MODIFIED:** `frontend/src/stores/fretboardStore.ts` (add `chordRoot` + reset semantics; extend `fretboardStore.test.ts`), `frontend/src/components/FretboardCanvas.tsx` (chord-root arg + dep), `frontend/src/App.jsx` (pass `chordRoot`), `frontend/src/features/library/LibraryPanel.tsx` (4th tab); **possibly** `frontend/src/data/chords.js` (AC4 option A — one entry)

## Success Criteria
✅ Correct derived diatonic chords for major AND minor (not hardcoded) · ✅ degree click highlights at the degree's own root while the scale stays put · ✅ 7ths toggle with a resolved m7♭5 story · ✅ graceful non-heptatonic degrade (incl. the default Pentatonic Minor) · ✅ free, no paywall · ✅ no backend / no frozen-file changes · ✅ no regression to Chord/Scale/Progression tabs · ✅ tests/type-check/lint/build green

## Deferred / Out of Scope
- Expanded chord vocabulary (6.2) · substitutions / jazzify / shared-notes (6.3) · audio playback of chords · secondary dominants / borrowed chords · inversions / voice-leading

## Open Questions (resolve at pickup — do not block story creation)
1. **AC4 half-diminished:** go with option **A** (add `'Minor 7♭5' [0,3,6,10]` to `chords.js`, recommended) or option **B** (defer, render vii as a triad in 7ths mode)?
2. **Tab label:** `In Key` (proposed) vs `Chords in Key` vs `Diatonic` — any preference for the tab text?

### Review Findings (Code Review — 2026-09-15)

**[Review Layer Results]** Blind Hunter (5 findings, all false positives dismissed), Edge Case Hunter (3 findings, 2 actionable, 1 deferred), Acceptance Auditor (0 violations — all 8 ACs met).

**Patch findings (actionable) — both applied:**
- [x] [Review][Patch] Invalid `rootNote` validation in `diatonicChords()` — Added guard: `if (noteIndex(rootNote) === -1) return []` (mirrors the non-heptatonic degrade). Regression test added (`'X'`/`''` roots → `[]`). [frontend/src/lib/harmony.ts]
- [x] [Review][Patch] Sevenths toggle breaks active-chord highlight — Added `handleSeventhsToggle` that calls `setChordName(null)` on toggle, so a pre-highlighted chord (e.g. Dm) doesn't orphan when its type shifts (Minor → Minor 7). Regression test added. [frontend/src/features/library/ChordsInKey.tsx]

**Deferred (pre-existing / out of scope):**
- [x] [Review][Defer] Exotic heptatonic scales (Hungarian Minor, Persian, Enigmatic, etc.) not tested for buildable triads — code handles non-buildable via `buildable: false` + disabled button, but no test proves all 7-note scales harmonize cleanly. Low risk (graceful, no crash). Belongs with 6.2's expanded-vocabulary work.

**Dismissed (6 total):** Blind Hunter's 5 findings were all false positives — (1) "missing store state" (the store diff was real, the agent got a truncated prompt), (2) "inconsistent noteAtSemitone signatures" (the fn normalizes mod-12 internally), (3) "stale chordRoot on deselect" (setChordName(null) resets it atomically), (4) "missing Dominant 9 suffix" (9ths are never diatonically stacked), (5) a comment-clarity nit. Plus Edge Case Hunter's invalid-root finding was upgraded to a patch rather than dismissed.

## Dev Agent Record
### Context Reference
- Created by create-story with exhaustive code analysis (data files, fretboardStore, FretboardCanvas, LibraryPanel all read directly this session).

### Agent Model Used
claude-opus-4-8 (Amelia / bmad-dev-story) — implemented; haiku-4-5 (Blind Hunter / Edge Case Hunter / Acceptance Auditor) — reviewed

### Debug Log References
None — implementation was clean; all 403 tests, type-check, lint, and build passed on first full run.

### Completion Notes List
- **Open questions resolved at pickup (user decisions):** (1) m7♭5 → **Option A** — added `'Minor 7♭5': { intervals: [0,3,6,10] }` to `chords.js` so the major-key `vii∅7` (and harmonic-minor `ii°7`) highlight on the fretboard; it also appears as a 13th item in the standard Chord Library (premium, benign — seeds 6.2). (2) Tab label → **`Diatonic`**.
- **Harmony algorithm:** stacks scale thirds by array index with octave-wrap (+12 per wrap), so tones stay ascending and the derived interval set matches `CHORDS` keys directly. Quality is derived from the 3rd/5th of the interval set, never hardcoded — verified by the A-natural-minor test (`i ii° III iv v VI VII`).
- **The crux (independent chord root):** `chordRoot: string|null` added to `fretboardStore`; `FretboardCanvas` renders the active chord at `chordRoot ?? rootNote`, so a diatonic ii-chord highlights D-rooted while the C-major scale stays on screen. Existing `ChordLibrary` path is unchanged (null chordRoot → roots at `rootNote`).
- **Cross-feature leak guard (4.4/4.5 recurring finding):** `setChordName` always resets `chordRoot: null` in the same `set()`, so a chord picked from the standard Chord tab can never inherit a leftover diatonic root. The In-Key feature calls `setChordRoot` *after* `setChordName`. Dedicated store test covers it.
- **Graceful degrade:** only heptatonic scales harmonize (`intervals.length === 7`); everything else returns `[]` and the tab shows a "needs a 7-note scale" note. The store default (Pentatonic Minor) hits this path on first open — verified.
- Frozen files respected: `tunings.js`, `scales.js`, `notes.js`, `musicTheory.js` untouched. `chords.js` gained exactly the one AC4 entry. No new API routes.

### File List
- **NEW:** `frontend/src/lib/harmony.ts`
- **NEW:** `frontend/src/lib/harmony.test.ts`
- **NEW:** `frontend/src/features/library/ChordsInKey.tsx`
- **NEW:** `frontend/src/features/library/ChordsInKey.test.tsx`
- **MODIFIED:** `frontend/src/stores/fretboardStore.ts` (add `chordRoot` + `setChordRoot`; `setChordName` resets `chordRoot`)
- **MODIFIED:** `frontend/src/stores/fretboardStore.test.ts` (chordRoot + leak-guard tests)
- **MODIFIED:** `frontend/src/components/FretboardCanvas.tsx` (`chordRoot` prop + render-at-chord-root + dep)
- **MODIFIED:** `frontend/src/App.jsx` (pull + pass `chordRoot`)
- **MODIFIED:** `frontend/src/features/library/LibraryPanel.tsx` (4th `Diatonic` tab)
- **MODIFIED:** `frontend/src/features/library/LibraryPanel.test.tsx` (Diatonic-tab-is-free test)
- **MODIFIED:** `frontend/src/data/chords.js` (AC4 Option A — one `Minor 7♭5` entry)

### Change Log
| Date | Change |
|---|---|
| 2026-09-15 | Story 6.1 created → ready-for-dev. Grounded in the real data-file shapes (verbose SCALES/CHORDS keys), surfaced the missing independent chord-root state (the real design work), the half-diminished `chords.js` gap for AC4, and the cross-feature `chordRoot` leak guard. Gating confirmed free per epics.distillate. Epic 6 flipped backlog → in-progress. |
| 2026-09-15 | Story 6.1 implemented → review. Added `harmony.ts` (derived diatonic chords, triads + 7ths, heptatonic-only degrade), independent `chordRoot` store field + render-at-chord-root, free `Diatonic` Library tab with 7ths toggle. Open questions resolved: m7♭5 Option A (added to `chords.js`), tab label `Diatonic`. 403/403 frontend tests green (+46 new), type-check/lint/build clean. |
| 2026-09-15 | Code review → done. 3-layer parallel review (Blind Hunter / Edge Case Hunter / Acceptance Auditor). Auditor: 0 AC violations across all 8 ACs + leak guard confirmed. 2 patches applied: (1) invalid-`rootNote` guard in `diatonicChords()`, (2) auto-clear highlight on 7ths toggle to prevent an orphaned highlight. 1 deferred (exotic-scale buildable coverage → 6.2), 6 dismissed (all 5 Blind Hunter findings were false positives). +2 regression tests. 405/405 frontend tests green, type-check/lint/build clean. |
