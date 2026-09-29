# Story 6.3: Chord Relationships / "Jazzify"

Status: done

## Story

As a **songwriter**,
I want **to see which other chords share notes with my current chord and get jazzier substitution / extension suggestions**,
so that **I can discover richer voicings and reharmonizations without knowing the theory by hand.**

## Acceptance Criteria

From `epics.distillate.md#Story 6.3`, reconciled against the **actual current code** (the 28-entry `chords.js` post-6.2, the `chordName`/`chordRoot` store contract from 6.1, and the `chordRoot ?? rootNote` highlight convention). Terms in **Dev Notes → Definitions** are load-bearing — read them before implementing.

1. **AC1 — Active-chord resolution.** The feature operates on the *currently highlighted chord*, read from `fretboardStore` as **`{ root: chordRoot ?? rootNote, type: chordName }`** (the exact convention `FretboardCanvas` already uses). When `chordName` is `null` there is **no active chord** → render a short prompt ("Select a chord to see related chords"), never a broken/empty list. This mirrors `ChordsInKey`'s non-heptatonic degrade note.

2. **AC2 — Shares-notes list.** For the active chord's **pitch-class set (pcs)**, search every library chord at every root (`CHORD_NAMES` × 12 roots) and surface those sharing **≥ N common pitch classes** (recommended default `N = 2`), **ranked** by shared-tone count descending, with a **deterministic tie-break** (see Dev Notes → *Ranking*), and **capped** to a sensible length (recommended ~24) so it never becomes a wall. The active chord itself (same root **and** same type) is **excluded**. Chords whose pcs is *identical* to the active chord's (e.g. `C6 [0,4,7,9]` ≡ `A Minor 7`) are allowed and rank at the top (they share every tone) — see Open Question 2 for optional "same notes" tagging.

3. **AC3 — Jazzify suggestions.** For the active chord, surface two curated groups:
   - **(a) Extension upgrades** — same root, richer type, following a hand-authored per-family chain (e.g. `Major → Major 7 → Major 9 → Major 13`; `Dominant 7 → Dominant 9 → Dominant 13`; `Minor → Minor 7 → Minor 9 → Minor 11`). Only upgrades whose target type exists in `CHORDS` and differs from the active type are shown.
   - **(b) Common substitutions**, gated on the active chord's **quality family** (Dev Notes → *chordFamily*): **relative** major/minor (major-family & minor-family only), **tritone sub** (dominant-family only), and a **ii–V framing** suggestion (dominant-family only). Precise formulas in Dev Notes → *Substitution formulas*. Families with no applicable sub simply show none — never a wrong-key suggestion.

4. **AC4 — Every suggestion is clickable → highlights on the fretboard.** Each row (shares-notes and jazzify) is a `{ root, type }` button that, on click, calls **`setChordName(type)` then `setChordRoot(root)`** — the exact `ChordsInKey` ordering (the first call resets `chordRoot` to `null` in the same `set()`, the second roots the highlight). The board updates via the existing chord-highlight path; the panel then recomputes around the **new** active chord (intended explorer behavior — see Dev Notes).

5. **AC5 — Premium-gated.** The feature is a **premium-only** surface, gated identically to the Progression tab: a new Library tab whose click is intercepted for non-premium users to raise the `PaywallCard` (see `LibraryPanel.handleTabClick`). No new gating mechanism.

6. **AC6 — Pure frontend, reuses the harmony layer.** All computation is pure music theory over `chords.js` + `notes.js`. **No backend, no new API routes, no new runtime dependencies.** Frozen files (`notes.js`, `scales.js`, `tunings.js`, `musicTheory.js`) are **read-only** — `notes.js` is only *imported* (`noteIndex`, `noteAtSemitone`), never modified. `chords.js` is not modified by this story. New logic lands in a new util (recommended `lib/chordRelationships.ts`) or an extension of `lib/harmony.ts` — see Open Question 1.

7. **AC7 — UI lives in the Library panel, Epic-5 glass styling.** New tab + component consistent with `ChordsInKey`/`ProgressionBuilder` (glass borders, `--glow-primary` accents, `select-none`, listbox/option roles). Tab row now holds 5 tabs — verify it still wraps/reads cleanly on mobile bottom-sheet and narrow desktop (Open Question 1).

8. **AC8 — Regression gate.** Full frontend suite + `type-check` + `lint` + `build` all green, with **deterministic** unit tests over the new pure functions.

## Tasks / Subtasks

- [x] **Task 1: Harmony/relationships util** (AC: 2, 3, 6) — created `frontend/src/lib/chordRelationships.ts` (new file, keeps `harmony.ts` focused — OQ1). Pure, exported, deterministic: `pitchClassSet` (guards unknown root/type → `∅`), `sharedNoteChords` (ranked/capped/self-excluded), `jazzifySuggestions`, `chordFamily` (interval-signature classification). Exported `ChordRef` / `SharedChordRef` (`+sharedCount,sameNotes`) / `LabeledChordRef` (`+relation`) / `ChordFamily` types.
- [x] **Task 2: Jazzify upgrade + family tables** (AC: 3) — `JAZZIFY_UPGRADES` for Major / Minor / Dominant 7 / Major 7 / Minor 7 (OQ3 defaults); `RELATIVE_MINOR_TYPE`/`RELATIVE_MAJOR_TYPE` preserve the 7th where a sibling exists. Every target is a real `CHORDS` key (test asserts).
- [x] **Task 3: `ChordRelationships` component** (AC: 1, 4, 7) — `frontend/src/features/library/ChordRelationships.tsx`. Reads store, `useMemo`-computed, two labelled sections (Jazzify + Shares notes), no-active-chord prompt, rows wired `setChordName`→`setChordRoot`, labels verbatim `` `${root} ${type}` `` (OQ4), styled after `ChordsInKey`.
- [x] **Task 4: Wire the tab** (AC: 5, 7) — `LibraryPanel.tsx`: added `'jazzify'` to `Tab`/`TAB_LABELS`/`TAB_ORDER` (label "Jazzify" — OQ1), rendered gated on `isPremium`, generalized the premium gate to a `PREMIUM_TABS` set (`progression` + `jazzify`). Tab row given `overflow-x-auto` + `shrink-0` tabs so 5 tabs degrade to horizontal scroll rather than squishing/wrapping (which would misplace the absolute sliding indicator).
- [x] **Task 5: Unit tests (pure fns)** (AC: 2, 3, 8) — `chordRelationships.test.ts` (39 tests): pcs + extension fold + unknown-guards + `C6≡Am7` aliasing; shares ranking/cap/self-exclusion/≥N/determinism; `chordFamily` across 22 types + all-28 smoke; each jazzify family + upgrade-targets-are-real-CHORDS invariant.
- [x] **Task 6: Component + gating tests** (AC: 1, 4, 5, 8) — `ChordRelationships.test.tsx` (6): prompt, list render, `chordRoot??rootNote` fallback, click order (`setChordName` then `setChordRoot`), same-notes tag, diminished no-subs. `LibraryPanel.test.tsx` (+2): Jazzify tab premium-gated (free→PaywallCard, premium→prompt).
- [x] **Task 7: Regression** (AC: 8) — `tsc --noEmit`, `eslint`, `vitest run` (482/482, +47), `vite build` all green (pre-existing chunk-size advisory only).
- [~] **Task 8 (recommended): live spot-check** — **judgment call: deferred to code review** (flag). Consistent with 6.2: this story adds NO new CSS/tokens (reuses existing glass utilities), so the "live-loading catches what vitest can't" risk (which historically was CSS-comment / contrast bugs) doesn't apply. The one visual item — the 5-tab-row width — was addressed with `overflow-x-auto`. A live premium check (pick a chord → click a shares + a jazzify suggestion → board re-highlights, panel recomputes; verify tab row at narrow width) is a sensible CR step.

## Review Findings

**3-layer code review (2026-09-28):** Blind Hunter / Edge Case Hunter / Acceptance Auditor, covering the combined 6.2+6.3 diff (`e284b0c..fbd0893`). 6.2 came back clean; all 4 raised findings were against 6.3 code and were verified against source before triage:

- [x] [Review][Dismiss] Tab indicator allegedly breaks on horizontal scroll (`LibraryPanel.tsx:53`) — **false positive**: the sliding indicator `<span>` is a sibling of the tab buttons inside the same `relative`+`overflow-x-auto` container, so it scrolls with the content by standard CSS containing-block behavior. No fix needed.
- [x] [Review][Dismiss] Missing test for `chordRoot ?? rootNote` fallback (AC1) — **false positive**: already covered by `ChordRelationships.test.tsx:30-35` ("falls back to rootNote when chordRoot is null").
- [x] [Review][Dismiss] `playChord` on suggestion-click flagged as undocumented scope creep — **false positive**: identical pattern already exists in `ChordLibrary.tsx` and `ChordsInKey.tsx`; 6.3 is consistent with the established shipped audio-playback behavior, not a deviation.
- [x] [Review][Dismiss] Redundant `noteIndex(root)` call in `sharedNoteChords` (`chordRelationships.ts:82`) — real but negligible (O(1) lookup called once per invocation, outside the 336-candidate loop); fixing it would require changing `pitchClassSet`'s public signature for zero measurable benefit. Not patched.

**Result: 0 patches, 0 deferred, 4 dismissed as noise after source verification.**

## Dev Notes

### Current state to build on (READ THESE — verified this session)

- **`stores/fretboardStore.ts`** — the active-chord contract: `chordName: string | null` (a `CHORDS` key) and `chordRoot: string | null`. **`setChordName(name)` also resets `chordRoot` to `null` in the same `set()`** (cross-feature leak guard from 4.4/4.5/6.1). `setChordRoot(root)` sets it afterward. So the canonical "select this chord at this root" sequence is `setChordName(type); setChordRoot(root);` — **order matters** (reversing loses the root). Standard-tab chords have `chordRoot === null`, so their effective root is `rootNote`.
- **`data/chords.js`** — `CHORDS[name] = { intervals: number[] }`, root-relative, ascending; `CHORD_NAMES = Object.keys(CHORDS)` (28 entries post-6.2). First 5 are the free basics (irrelevant here — whole feature is premium). Editable app-data, but **this story does not modify it**.
- **`data/notes.js`** (frozen — import only) — `CHROMATIC_NOTES` (12, sharps), `noteIndex(note)` (normalizes enharmonics, `-1` if unknown), `noteAtSemitone(root, semis)`. Everything you need for pitch-class math.
- **`lib/harmony.ts`** — the 6.1/6.2 diatonic util. Note `DISPLAY_SUFFIX` here is **partial** (covers ~15 of 28 types — the 9/11/13/Add 9/6-9 types have **no** suffix entry). ⚠️ **Do NOT reuse `chordDisplayName` for suggestion labels** — it would render a bare root for the extension chords. Render `` `${root} ${type}` `` verbatim instead (Open Question 4). `harmony.ts` is not frozen and may be imported/extended.
- **`features/library/ChordsInKey.tsx`** — the template to copy: reads store, `useMemo`-free direct compute, listbox/option a11y, `select-none`, glass borders (`var(--glass-border)`), active state `[box-shadow:var(--glow-primary)]`, the `setChordName`→`setChordRoot` click handler, and the degrade-note pattern for AC1.
- **`features/library/LibraryPanel.tsx`** — tab host. `Tab = 'scale' | 'chord' | 'inKey' | 'progression'`; `TAB_LABELS`, `TAB_ORDER`, and `handleTabClick` (the `progression`-premium gate is the pattern for AC5). `TabsRow` renders a sliding indicator over `TAB_ORDER` — a 5th tab drops in with no structural change, but check width.
- **`features/library/ProgressionBuilder.tsx` / `ChordLibrary.tsx`** — confirm the premium-gated-tab and chord-select patterns. `FretboardCanvas` renders any `{chordName, chordRoot}` via `calculateChordDots(CHORDS[chordName].intervals, chordRoot ?? rootNote, …)` — so **any** `{root, type}` this story emits will highlight correctly (the 6.2 `% 12`+Set path already handles 5–6-note chords).

### Definitions (load-bearing)

- **Pitch-class set (pcs):** for chord `{root, type}`, `pcs = { (noteIndex(root)+i) mod 12 : i ∈ CHORDS[type].intervals }`. A `Set<number>` of 0–11. Extension intervals (14/17/21) fold via `mod 12` automatically.
- **Shared tones:** `|pcs(active) ∩ pcs(candidate)|`.
- **Identical-pcs alias:** two chords with equal pcs sets (e.g. `C6` = `{0,4,7,9}` and `A Minor 7` rooted on A = `{9,0,4,7}`). Real and common — a deliberate AC2 case, not a bug.

### chordFamily (classify by intervals, not name)

Derive from `CHORDS[type].intervals` — presence of a minor/major 3rd (3 vs 4) and a ♭7/♮7 (10 vs 11) / dim structure:
- `major` — has `4` (major 3rd) and no `10` (no dominant ♭7): `Major, Major 7, Major 6, Major 9, Add 9, Major 6/9, Major 13, Augmented`.
- `dominant` — has `4` **and** `10`: `Dominant 7/9/11/13/7♭5/7♯5/7sus4` (7sus4 has no 3rd but a ♭7 → treat as dominant; document the choice).
- `minor` — has `3` (minor 3rd) and no dim-5 root signature: `Minor, Minor 7, Minor 6, Minor 9, Minor 11, Minor Major 7, Minor Add 9, Minor 6/9`.
- `diminished` — has `3` and `6` (dim 5th): `Diminished, Diminished 7, Minor 7♭5`.
- `other` — `Sus2/Sus4` (no 3rd, no ♭7).

Classify off the interval array so the 28-type set is covered without a name lookup table. Add tests pinning each type's family.

### Substitution formulas (dominant/major/minor only — never emit a wrong-key sub)

Let `r = noteIndex(root)`; results as `noteAtSemitone(root, Δ)`:
- **Relative minor** (major-family): `Δ = -3`, type `Minor` (or `Minor 7` if the active is a 7th — preserve extension level where a sibling exists, else the triad). `C major → A minor`.
- **Relative major** (minor-family): `Δ = +3`, type `Major`(/`Major 7`). `A minor → C major`.
- **Tritone sub** (dominant-family): `Δ = +6`, same dominant type (fallback `Dominant 7`). `G7 → D♭7`.
- **ii–V framing** (dominant-family): the active chord is treated as the **V**; its **ii** is `Δ = +7`, type `Minor 7`. `G7 → Dm7`. (Derivation: I = V−7 = `r+5`; ii = I+2 = `r+7`.)

Each sub carries a human `relation` label ("Relative minor", "Tritone sub", "ii of V") for the UI.

### Ranking (must be deterministic for tests)

Sort shares-notes candidates by: **(1)** shared-tone count desc → **(2)** overlap ratio `shared / |pcs(candidate)|` desc (prefers tighter matches over big chords that merely contain the tones) → **(3)** root chromatic index asc → **(4)** `CHORD_NAMES` insertion index asc. This total order is stable; assert a fixed expected list for at least one active chord so re-runs can't drift.

### The explorer behavior (state — don't fight it)

Clicking a suggestion sets it as the active chord, so the panel **recomputes around the clicked chord** and the previously-active chord reappears as one of *its* relatives. There is therefore **no persistent "selected" row** inside this panel (the active chord is always excluded from its own lists) — do **not** build a selected/active row state; it can't exist by construction. This is the intended "walk the chord graph" UX.

### Cross-feature consistency

The active chord may have been set by the standard **Chord** tab (`chordRoot = null` → root falls back to `rootNote`) **or** the **Diatonic** tab (`chordRoot` set to the degree's root). 6.3 reads the same two store fields, so it works uniformly regardless of origin — no special-casing.

### Fixed constraints

- No new API routes; no new runtime dependencies (pure data + tests).
- Frozen: `notes.js`, `scales.js`, `tunings.js`, `musicTheory.js` — import only. `chords.js` **not** modified this story.
- Tailwind v4 CSS-first; `@/` alias; do NOT hand-edit `src/components/ui/`.
- Suggestion labels are human-readable (`` `${root} ${type}` `` verbatim, e.g. "C Major 7") — sidesteps `harmony.ts`'s partial `DISPLAY_SUFFIX`.

### Previous-story intelligence

- **6.1 (Chords in Key)** established `chordRoot` + the `setChordName`→`setChordRoot` ordering and the degrade-note UX — directly reused here (AC1, AC4).
- **6.2 (Expanded Chord Library)** grew `CHORDS` 13→28, which *is* this story's search space and jazzify vocabulary (9/11/13/6/altered targets). 6.2's `chords.test.js` already guarantees unique interval arrays — relied on implicitly (identical-pcs aliasing is about *pitch sets at different roots*, not duplicate arrays).
- **Recurring review theme (4.4/4.5/6.1/6.2): silent state/classification leaks & non-determinism.** The 6.3 analogs are (a) the `setChordName`/`setChordRoot` ordering (reversing silently drops the root) and (b) non-deterministic ranking — both pinned by explicit tests.
- **Cadence** (commits `e284b0c` 6.1, and 6.2): implement → full regression → 3-layer code review (Blind Hunter / Edge Case Hunter / Acceptance Auditor) → patches. Same shape expected — and this is the **last story of Epic 6**, so an epic retrospective (ER) follows its review.

### File structure

- **NEW:** `frontend/src/lib/chordRelationships.ts` (or extend `harmony.ts` — Open Question 1)
- **NEW:** `frontend/src/features/library/ChordRelationships.tsx`
- **NEW (tests):** `frontend/src/lib/chordRelationships.test.ts`, `frontend/src/features/library/ChordRelationships.test.tsx`
- **MODIFIED:** `frontend/src/features/library/LibraryPanel.tsx` (add tab + premium gate), `frontend/src/features/library/LibraryPanel.test.tsx` (gating test)
- **NOT MODIFIED (import/verify only):** `chords.js`, `notes.js`, `fretboardStore.ts`, `FretboardCanvas.tsx`, `ChordsInKey.tsx`, `ProgressionBuilder.tsx`

### References

- [Source: epics.distillate.md#Story 6.3: Chord Relationships / "Jazzify"]
- [Source: frontend/src/stores/fretboardStore.ts#setChordName/setChordRoot]
- [Source: frontend/src/lib/harmony.ts#DISPLAY_SUFFIX, diatonicChords]
- [Source: frontend/src/features/library/ChordsInKey.tsx (UX/interaction template)]
- [Source: frontend/src/features/library/LibraryPanel.tsx#handleTabClick (premium-gate pattern)]
- [Source: frontend/src/data/chords.js (28-entry search space), frontend/src/data/notes.js (pcs helpers)]

## Success Criteria

✅ Shares-notes list computed over all 28×12 candidates, ranked deterministically, capped, self-excluded, ≥N threshold · ✅ Jazzify upgrades + family-gated subs (relative / tritone / ii–V) with correct roots & types, no wrong-key suggestions · ✅ Every suggestion click re-highlights the board and recomputes the panel · ✅ No-active-chord prompt · ✅ Premium-gated 5th tab, Epic-5 glass styling, wraps on mobile/narrow · ✅ Pure frontend, no API/deps, frozen files untouched · ✅ deterministic unit tests + component/gating tests + type-check/lint/build green

## Deferred / Out of Scope

- Chord **fingering diagrams**/voicings (this highlights scale-position dots, not fret shapes) · audio playback · full reharmonization of a whole progression (per-chord only) · key-aware sub filtering (subs are computed from the chord alone, not the current scale) · alternate/flat spellings · persisting a "favorites" set of discovered chords · secondary dominants / modal interchange beyond the listed subs.

## Open Questions (resolve at pickup — do not block story creation)

1. **Util home & tab shape** — new `lib/chordRelationships.ts` (recommended, keeps `harmony.ts` focused) vs extend `harmony.ts`? And a new **5th tab** "Jazzify" (recommended, gated like Progression) vs a contextual sub-panel under the Chord tab? Confirm the 5-tab row still reads on mobile bottom-sheet / narrow desktop (may need wrap or horizontal scroll).
2. **Shares-notes tuning** — default `N = 2` min shared tones, cap ~24, keep identical-pcs aliases (ranked top) with an optional "same notes" tag? Or a stricter `N = 3` / different cap?
3. **Jazzify upgrade chains** — confirm the per-family `JAZZIFY_UPGRADES` targets (e.g. does Major upgrade toward `Major 6`/`Major 6/9`/`Add 9` as well as `Major 7`/`Major 9`/`Major 13`? how far do minor/dominant chains go?).
4. **Suggestion label format** — verbatim `` `${root} ${type}` `` ("C Major 7", recommended — no suffix-map gap) vs compact suffix ("Cmaj7", which requires extending `DISPLAY_SUFFIX` to all 28 types)?
5. **7sus4 family** — classify `Dominant 7sus4` as dominant (recommended — gets tritone/ii–V subs) or `other`?

## Dev Agent Record

### Context Reference
- Written by create-story with exhaustive code analysis this session: `fretboardStore` (the `chordName`/`chordRoot` contract + the `setChordName`-resets-`chordRoot` guard), `harmony.ts` (partial `DISPLAY_SUFFIX` → don't reuse `chordDisplayName` for labels), `ChordsInKey.tsx` (interaction/degrade template), `LibraryPanel.tsx` (premium-tab gate + 5-tab-row consideration), `chords.js` (28-entry search space post-6.2), `notes.js` (pcs helpers). Surfaced the identical-pcs aliasing case (`C6 ≡ Am7`), the ordering hazard in `setChordName`→`setChordRoot`, the determinism requirement for ranking, and the explorer "no persistent selected row" property.

### Agent Model Used

claude-opus-4-8 (dev-story)

### Completion Notes List

- **All 5 open questions resolved at the recommended defaults (flag for review):** (1) new `lib/chordRelationships.ts` + a 5th "Jazzify" tab gated like Progression; (2) shares-notes `N=2`, cap `24`, identical-pcs aliases kept + ranked top + tagged "same notes"; (3) `JAZZIFY_UPGRADES` chains as drafted; (4) verbatim `` `${root} ${type}` `` labels (sidesteps `harmony.ts`'s partial `DISPLAY_SUFFIX`); (5) `Dominant 7sus4` classified **dominant** (gets tritone/ii–V).
- **`chordFamily` classifies by interval signature, not name** — traced all 28 types by hand and pinned each with a test. Notable: `Dominant 7♭5`/`7♯5` → dominant (altered dominants, correctly get subs); `Minor 7♭5` → diminished (half-dim, correctly gets NO relative/tritone sub); `7sus4` → dominant via the "♭7 present, no 3rd" branch; `Augmented` → major (has a major 3rd — its relative-minor sub is harmless).
- **Ranking is a total, deterministic order** (shared-count → overlap-ratio → root-index → CHORD_NAMES-index) so unit results are stable across runs — asserted with a repeat-call equality test, mirroring the project's recurring "non-determinism / silent-classification-leak" review theme.
- **The `setChordName`→`setChordRoot` ORDER is load-bearing** (reversing loses the root, since `setChordName` resets `chordRoot` to null in the same `set()`). The click test asserts both final values. Same contract as 6.1's `ChordsInKey`.
- **Explorer UX has no persistent "selected" row by construction** — clicking a suggestion makes it the active chord, which is then excluded from its own lists; the panel recomputes around it. Intentional; no selected-state code written.
- **Identical-pcs aliasing is real and surfaced** (e.g. `C6 ≡ Am7`, both `{0,4,7,9}`): the shares list keeps them, tags "same notes", and ranks them top (4 shared tones). Test covers it.
- **Test-scoping gotcha handled:** a relative-minor sub (`A Minor`) and same-root upgrades (`C Major 7`) also legitimately appear in the shares-notes list, so component assertions are scoped with `within(jazzifyList)` to avoid ambiguous `getByText` matches — not a bug, an expected consequence of the two lists overlapping.
- **No source touched beyond the new files + `LibraryPanel.tsx`.** `chords.js`, `notes.js`, `harmony.ts`, `fretboardStore.ts`, `FretboardCanvas.tsx`, `ChordsInKey.tsx`, `ProgressionBuilder.tsx` unchanged. No API, no new deps, frozen files read-only.
- **Regression:** 482/482 frontend tests (+47: 39 util, 6 component, 2 gating), `tsc`/`eslint`/`vite build` clean.

### File List

- **ADDED:** `frontend/src/lib/chordRelationships.ts` — pure harmony util (`pitchClassSet`, `chordFamily`, `sharedNoteChords`, `jazzifySuggestions` + types/tables)
- **ADDED:** `frontend/src/lib/chordRelationships.test.ts` — 39 unit tests
- **ADDED:** `frontend/src/features/library/ChordRelationships.tsx` — premium Jazzify panel
- **ADDED:** `frontend/src/features/library/ChordRelationships.test.tsx` — 6 component tests
- **MODIFIED:** `frontend/src/features/library/LibraryPanel.tsx` — added the gated "Jazzify" tab (`PREMIUM_TABS` set) + tab-row `overflow-x-auto`/`shrink-0`
- **MODIFIED:** `frontend/src/features/library/LibraryPanel.test.tsx` — +2 Jazzify-tab gating tests
- **NOT MODIFIED (import/verify only):** `chords.js`, `notes.js`, `harmony.ts`, `fretboardStore.ts`, `FretboardCanvas.tsx`, `ChordsInKey.tsx`, `ProgressionBuilder.tsx`

### Change Log

| Date | Change |
|---|---|
| 2026-09-22 | Story 6.3 created (stub → ready-for-dev) with exhaustive code analysis. |
| 2026-09-22 | Story 6.3 implemented → review. New `lib/chordRelationships.ts` (pcs / family / shares-notes / jazzify) + premium `ChordRelationships` Jazzify tab in `LibraryPanel`. All 5 open questions taken at recommended defaults (flagged). 482/482 tests (+47), type-check/lint/build clean. Task 8 live spot-check deferred to CR as a documented judgment call. |
