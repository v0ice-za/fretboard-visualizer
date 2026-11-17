# Story 7.1: Key-Root Marker & Fretboard Colour Legend

Status: done (code review skipped by owner choice 2026-11-16)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a guitarist viewing a chord inside a key,
I want to still see where the key centre sits and know what every dot colour means,
so that I never lose harmonic context.

## Acceptance Criteria

1. **New `key-root` marker.** While a chord is displayed (`chordName` set and found in `CHORDS`) AND the effective chord root (`chordRoot ?? rootNote`) is a different pitch class from the key `rootNote`, every fretboard position whose note is the key root (within the playable range: `fret >= capoPosition`, 0–24, all 6 strings, custom-tuning `strings` override honoured) shows a key-root marker.
2. **Hollow ring, not a fill.** The marker is a stroke-only ring (`fill="none"`) with a radius larger than the root dot (so it encircles, never covers, a dot underneath), `pointer-events="none"`, no glow filter. The shape, not only the colour, distinguishes it.
   - If the key-root pitch is also a chord tone (e.g. C in A minor), the chord-tone dot renders exactly as today **plus** the ring around it; the ring renders no note text in that case (the dot already shows it).
   - If the key-root position is not a chord tone, the ring renders alone; when note names are on, it shows the note name in `var(--color-text-primary)` (same token as the nut labels).
   - If chord root and key root are the same pitch class, no rings render at all.
3. **Everywhere a chord is shown.** Chord Library, Diatonic (Chords in Key), Jazzify, and Progression Builder stepping all get correct rings. This works automatically once AC 4 is fixed, because all of them go through `fretboardStore.chordName`/`chordRoot` → `FretboardCanvas`.
4. **Progression stepping stops overwriting the key.** `useProgressionPlayback` sets `chordName` + `chordRoot` for the active entry and never calls `setRootNote`. Call order is `setChordName(entry.chordName)` → `setChordRoot(entry.rootNote)` (setChordName resets chordRoot). The snapshot/restore logic saves and restores `{ chordName, chordRoot }` (restoring in the same order), not `rootNote`. The key (`rootNote`), the URL `?key=`, and the transpose target for preset loading stay fixed throughout playback.
5. **Theme token.** A new `--color-dot-key-root` custom property is defined in all 6 theme blocks of `index.css` (`:root`/light, `[data-theme="dark"]`, `neon`, `mono`, `vibrant`, `minimal`). Each value clears **≥ 3:1** non-text contrast against that theme's `--color-fretboard`, is a visibly different hue/lightness from that theme's `--color-dot-root`, and the ratios are **computed in a test**, not eyeballed. FretDot uses `var(--color-dot-key-root, <dark fallback>)`.
6. **Legend.** A fretboard legend renders below the board in the main app (not in the Custom Tuning Creator preview). It lists **only** the marker kinds present in the current render, in a fixed order, each as swatch + text label:
   - Chord view: **Chord root** (`root`), **Chord tone** (`scale`), **Key root** (`key-root`, ring swatch), **Freeform mark** (`freeform`).
   - Scale view: **Root** (`root`), **Scale note** (`scale`), **Mode note** (`mode`), **Mode root** (`mode-root`), **Freeform mark** (`freeform`).
   - Swatches reuse the same `--color-dot-*` tokens and opacities as `FretDot` (read from `DOT_CONFIG`, not hardcoded) so they can't drift. The key-root and freeform swatches reproduce the ring and dashed-ring shapes.
   - Hidden entirely when there are no dots on the board.
   - Rendered as a semantic list (`<ul aria-label="Fretboard legend">`), always text-labelled, wraps cleanly at 375px, and does not scroll with the horizontally scrolling board.
7. **Accessible name.** When a chord is shown, the fretboard `aria-label` names the chord and the key, e.g. `"D Minor chord in the key of C on Standard E tuning"` (chord labelled verbatim as `${root} ${type}`, see 6.3 note in Dev Notes), plus the existing capo suffix. Scale-view labels are unchanged.
8. **No regressions.** Scale-view rendering (no chord) is byte-for-byte unchanged apart from the legend. Freeform dots still render on top. The < 100 ms re-render NFR holds (existing FretboardCanvas perf test). `npm test`, `tsc --noEmit`, `eslint`, and `vite build` are all green.
9. **Live verification.** In a real browser, check C major → Diatonic `ii` (Dm), `vi` (Am, the overlapping-ring case), and `I` (C, no rings); a Progression preset stepped with ←/→ (key selector stays on C, rings follow correctly); and the legend in all 6 themes (premium themes via `VITE_DEV_UNLOCK_PREMIUM`) at desktop and 375px width.

## Tasks / Subtasks

- [x] **Task 1: Pure marker + legend logic in `utils/fretboardUtils.ts`** (AC: 1, 2, 6)
  - [x] 1.1 Extend `DotState` with `'key-root'`.
  - [x] 1.2 Add `calculateKeyRootMarkers(keyRoot, chordRoot, tuningName, capoPosition = 0, stringsOverride?)` → `FretDotData[]` (state `'key-root'`), using the same loop/skip rules as `calculateChordDots` (`fret < capoPosition` skipped, `isRoot()` for pitch-class comparison). Return `[]` when `isRoot(chordRoot, keyRoot)`.
  - [x] 1.3 Add pure `getLegendEntries({ chordActive, states })` → ordered `{ state, label }[]` per AC 6, where `states` is the set of states actually rendered (chord/scale dots + key-root markers + freeform dots). Empty input → `[]`. `chordActive` must use the **same guard as the `dots` memo**: `chordName` is set AND resolves in `CHORDS`. A leftover unknown `chordName` renders scale dots, so it must get scale-view labels, never "Chord root/Chord tone" over scale dots.
  - [x] 1.4 Extend `generateAriaLabel` with an optional trailing `chord?: { root: string; type: string } | null`. When given: `"${root} ${type} chord in the key of ${rootNote} on ${tuning} tuning"` + existing capo suffix (mode suffix omitted in chord view, because the mode overlay isn't rendered then).
  - [x] 1.5 Unit tests in `fretboardUtils.test.ts` (there's no direct `generateAriaLabel` test yet, so add one): C-major key / Dm chord → ring count equals every C position in Standard E (frets 0–24); capo 3 excludes frets < 3; custom `strings` override; same-root → `[]`; enharmonic safety via `isRoot`; `getLegendEntries` ordering for both views and the empty case; aria label with and without chord, with capo.

- [x] **Task 2: Ring rendering in `components/FretDot.tsx`** (AC: 2, 5)
  - [x] 2.1 Add a `'key-root'` entry to `DOT_CONFIG` (fill `var(--color-dot-key-root, #f1f5f9)`, radius ≈ 16, opacity 1, textColor `var(--color-text-primary, #e2e8f0)`).
  - [x] 2.2 In `FretDot`, when `state === 'key-root'`: render ONE circle with `fill="none"`, `stroke={fill}`, `strokeWidth={2.5 * sizeScale}`, `pointer-events="none"`, class `fret-dot` (keeps the 80 ms transition), and no filter. Render text only when `showNoteName`. Keep `data-state="key-root"` on the `<g>`.
  - [x] 2.3 **Update `FretDot.test.tsx`.** Adding `'key-root'` to `DOT_CONFIG` **breaks `tsc`** unless you do this: the contrast suite declares `type DotState = keyof typeof DOT_CONFIG` (L190) and types `FILL`/`TEXT` as `Record<ThemeName, Record<DotState, string>>` (L204, L214), so both objects become missing a key. Change L190 to `type DotState = Exclude<keyof typeof DOT_CONFIG, 'key-root'>`, and build `states` (L223) as `(Object.keys(DOT_CONFIG) as (keyof typeof DOT_CONFIG)[]).filter((s): s is DotState => s !== 'key-root')`. A ring has no fill to composite, so it doesn't belong in that suite. Then add:
    - (a) structural ring tests: `fill="none"`, stroke is the var, `pointer-events="none"`, no filter, `r` > the root dot's `r`, single circle.
    - (b) a new `describe` asserting ring stroke vs `BOARD[theme]` ≥ 3:1 for all 6 themes, using a new `RING` mirror of the `index.css` values you choose (Task 3.1).
    - (c) lone-ring note text (`--color-text-primary`) vs `BOARD[theme]` ≥ 4.5:1 per theme. Light/dark define this token in `oklch()`, so use these pre-converted hex mirrors (all pass):

      | Theme | `--color-text-primary` | as hex | vs board |
      |---|---|---|---|
      | light | `oklch(0.20 0.01 270)` | `#14161b` | 16.05 |
      | dark | `oklch(0.9 0.01 235)` | `#d8dfe4` | 14.52 |
      | neon | `#e4e4e7` | `#e4e4e7` | 15.32 |
      | mono | `#f4f4f5` | `#f4f4f5` | 15.17 |
      | vibrant | `#e2e8f0` | `#e2e8f0` | 13.40 |
      | minimal | `#1c1917` | `#1c1917` | 15.14 |

- [x] **Task 3: Theme tokens in `index.css`** (AC: 5)
  - [x] 3.1 Add `--color-dot-key-root` beside the other `--color-dot-*` tokens in all 6 blocks (lines ≈ 125, 241, 332, 406, 477, 559). Pre-computed starting values (contrast vs `--color-fretboard`):

    | Theme | Board | Suggested ring | Ratio | Root dot (for distinctness) |
    |---|---|---|---|---|
    | light (`:root`) | `#f1f1f4` | `#0f172a` | 15.84 | `#fbbf24` gold |
    | dark | `#0b0b16` | `#f1f5f9` | 17.85 | `#fbbf24` gold |
    | neon | `#0d0d0d` | `#ffffff` | 19.44 | `#4ade80` green |
    | mono | `#1e1e1e` | `#fbbf24` | 9.99 | `#f8fafc` white — see note |
    | vibrant | `#102030` | `#f1f5f9` | 15.08 | `#fbbf24` gold |
    | minimal | `#efefe8` | `#0f172a` | 15.46 | `#92400e` brown |

    **Mono note:** mono is a grayscale theme and its root dot is already near-white, so a white ring would differ from the root only by shape. The suggested gold is the one non-gray accent. If that clashes with the theme's intent, use a mid-gray (e.g. `#a3a3a3`) and recompute. Whatever you choose must pass the Task 2.3 test.
  - [x] 3.2 **Do NOT write a literal `*/` inside a CSS comment.** In Story 4.5 this silently broke the whole stylesheet, and it was only caught by loading the page in Chrome.

- [x] **Task 4: Wire into `components/FretboardCanvas.tsx`** (AC: 1, 3, 6, 7, 8)
  - [x] 4.1 Compute `keyRootMarkers` in a `useMemo`, only when `chordName` resolves in `CHORDS` (same guard as the existing `dots` memo): `calculateKeyRootMarkers(rootNote, chordRoot ?? rootNote, tuning, capoPosition, strings)`.
  - [x] 4.2 Render order: chord/scale `dots` → key-root rings → freeform dots → hit targets (the rings must sit above chord dots but must never intercept clicks). Use a distinct key prefix (`key-root-${fret}-${string}`), because a ring and a chord dot share a position.
  - [x] 4.3 Pass `showNoteName={noteNamesVisible && !chordDotAt(fret, string)}` to rings so an overlapping ring doesn't duplicate the dot's label. Use a `Set` of `"fret-string"` built from `dots` (not an O(n²) scan).
  - [x] 4.4 Pass the chord to `generateAriaLabel` when a chord is shown, and add chord inputs to that memo's dependencies.
  - [x] 4.5 Add prop `showLegend?: boolean` (default `false`). When true, render `<FretboardLegend entries={...} />` **after** the `fretboard-scroll-wrapper` div, not inside it. Wrap both in a fragment or container **without** changing the scroll wrapper's `data-testid` or styles (existing tests query it).

- [x] **Task 5: `components/FretboardLegend.tsx` (new)** (AC: 6)
  - [x] 5.1 Presentational only: takes `entries: { state: DotState; label: string }[]`. Returns `null` when empty.
  - [x] 5.2 Swatch: a tiny inline `<svg>` per entry using `DOT_CONFIG[state]` fill and opacity. Ring for `key-root`, and fill plus dashed ring for `freeform`, matching FretDot's shapes. Swatch `aria-hidden`; the label text carries the meaning.
  - [x] 5.3 Layout: `flex flex-wrap gap-x-4 gap-y-1` with small muted text (`text-xs text-muted-foreground`). No glass surface (it's board chrome, and density is on hold for the UX session). Must not overflow at 375px.
  - [x] 5.4 Tests (`FretboardLegend.test.tsx`): empty → renders nothing; chord-view entries/labels/order; scale-view entries; ring swatch has `fill="none"`; list semantics (`getByRole('list', { name: 'Fretboard legend' })`).

- [x] **Task 6: Fix progression key-overwrite in `hooks/useProgressionPlayback.ts`** (AC: 4)
  - [x] 6.1 Replace `setRootNote(entry.rootNote); setChordName(entry.chordName)` with `setChordName(entry.chordName); setChordRoot(entry.rootNote)`.
  - [x] 6.2 Snapshot type becomes `{ chordName: string | null; chordRoot: string | null }`. Restore in the order `setChordName(saved.chordName)` → `setChordRoot(saved.chordRoot)`, in BOTH the stop branch and the unmount cleanup.
  - [x] 6.3 Leave the `playChord` call as it is. Removing it belongs to Story 7.2; don't pre-empt it here.
  - [x] 6.4 **Update every test that asserts the old key-overwrite.** These tests encode the bug. Rewrite them to assert `chordRoot` (plus `rootNote` unchanged). Do NOT "fix" them by restoring `setRootNote`:
    - `hooks/useProgressionPlayback.test.tsx`, "restores the pre-playback fretboard state on unmount" (L30-44). While stepping, assert `rootNote` **stays** `'E'`, `chordName === 'Major'`, `chordRoot === 'C'`. After unmount, assert `chordName`/`chordRoot` are restored to their pre-playback values.
    - `features/library/ProgressionBuilder.test.tsx`, "clicking a row makes it active and applies its shape to the fretboard" (L80: `rootNote` → `'A'`). Expect `chordRoot === 'A'` and `rootNote` unchanged.
    - `features/library/ProgressionBuilder.test.tsx`, "Next / Prev step through and drive the fretboard" (L90, L93). Expect `chordRoot` `'C'` then `'A'`, with `rootNote` unchanged.
    - `features/library/ProgressionBuilder.test.tsx`, "ArrowRight / ArrowLeft step through the progression" (immediately after). Same conversion if it asserts `rootNote`.
    - Add a new test: across a full step sequence, `rootNote` never changes.
  - [x] 6.5 Regression test in `ProgressionBuilder.test.tsx`: key = C, load a preset, step to chord 2 (e.g. G), then load another preset → it transposes to **C**, not G. (Before this fix, `loadPreset` read the overwritten `rootNote`.)

- [x] **Task 7: App wiring** (AC: 6)
  - [x] 7.1 `App.jsx`: pass `showLegend` to the main `<FretboardCanvas>`. Leave `features/settings/CustomTuningCreator.tsx`'s preview canvas alone (the default `false` keeps its legend off).

- [x] **Task 8: Verification** (AC: 8, 9)
  - [x] 8.1 `cd frontend && npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all green. If the known-flaky `FretboardCanvas` "< 100ms" test fails under full-suite load, re-run it in isolation and note the result. Don't loosen the threshold in this story.
  - [x] 8.2 Live browser check per AC 9 (`npm run dev` with `VITE_DEV_UNLOCK_PREMIUM=true` in `.env.local`). Record what you saw in the Completion Notes. Pattern 3 from the Epic 6 retro: jsdom doesn't lay out SVG/CSS, so a legend overflow or an invisible ring will only show up live.

### Review Findings

- [x] [Review][Decision] Mono theme's key-root ring breaks its own documented CVD-safety invariant — `--color-dot-key-root: #fbbf24` (gold) is the only hue-based dot colour in a theme whose own code comment (`index.css:404-408`) states dots are deliberately differentiated by **lightness, not hue**, "the most colour-vision-deficiency-safe scheme available," with a computed contrast-ratio table that was never extended to include key-root. The new "ring differs from root dot" test only checks raw string inequality (`RING[theme] !== FILL[theme].root`), not computed perceptual/CVD distinguishability, and nothing checks gold against `mode-root` (`#a8a29e`, a similarly muted warm tone). This is the same "owner decision on mono ring colour" already flagged in the Dev Agent Record, now with sharper evidence that it conflicts with a prior, tested design guarantee. **Resolved: kept gold (owner choice 1/3 — "keep gold, but do it properly").** `index.css`'s mono comment now documents the FILLS-only scope of the lightness-not-hue rule, the computed ring-vs-board ratio (9.99:1), and the structural reason gold-vs-mode-root is unreachable: `calculateFretboardDots` (mode/mode-root) and `calculateKeyRootMarkers` (key-root) are mutually exclusive in `FretboardCanvas`'s `dots` memo — a chord always wins. Added a regression test (`FretboardCanvas.test.tsx`, "never renders key-root markers together with mode/mode-root dots") that proves this structurally rather than by inequality alone. 654/654 tests, `tsc`, and `eslint` all green after the fix.
- [x] [Review][Patch] `FretboardCanvas.tsx` return value wrapped in a new `<>...</>` fragment (to hang `FretboardLegend` off it) without re-indenting the enclosed `<div>` [frontend/src/components/FretboardCanvas.tsx:127-129] — resolved: re-indented lines 129-405 (the `<div>...</div>` and `<FretboardLegend />`) one level under the fragment. No logic change.
- [x] [Review][Defer] Freeform marks always render their note name (`showNoteName={noteNamesVisible}` unconditionally) without checking overlap with a lone key-root ring's note name — if both coincide with note names on, two `<text>` elements render stacked [frontend/src/components/FretboardCanvas.tsx:339-366] — deferred, pre-existing (freeform already didn't check overlap with scale/root dots before this story; not a new regression)
- [x] [Review][Defer] `useProgressionPlayback`'s `setChordName` → `setChordRoot` are two separate `set()` calls, so `chordRoot` is transiently `null` between them [frontend/src/hooks/useProgressionPlayback.ts:39-40] — deferred, no live defect (no direct store subscribers or persist middleware exist today; React 18 batches the effect). Combine into one `setState` call if a future subscriber is added.
- [x] [Review][Defer] `CHORD_LEGEND`/`SCALE_LEGEND` arrays must be manually kept in sync with the `DotState` union — no compile-time signal if a future dot state is added without a matching legend entry [frontend/src/utils/fretboardUtils.ts:848-861] — deferred, code-quality follow-up, not a defect
- [x] [Review][Defer] No test exercises changing the key (`rootNote`) while a progression is actively playing, then stopping [frontend/src/hooks/useProgressionPlayback.test.tsx] — deferred, behavior is correct by construction (hook never touches `rootNote`), test-coverage gap only
- [x] [Review][Defer] AC9's 375px check used a workaround (constraining `#fretboard` to 343px) rather than a real mobile viewport/device emulation — deferred, already self-disclosed in the Dev Agent Record as a follow-up

## Dev Notes

### Current state of the files this story touches

| File | Today | This story changes | Must preserve |
|---|---|---|---|
| `utils/fretboardUtils.ts` | `DotState` = 5 states. `calculateChordDots` emits `'root'` for the chord root and `'scale'` for other chord tones. `generateAriaLabel` is scale-only. | New state, new `calculateKeyRootMarkers`, `getLegendEntries`, optional chord arg for the aria label. | `calculateFretboardDots` and `calculateChordDots` untouched. Existing aria-label strings unchanged when no chord is shown (`FretboardCanvas.test.tsx:8-20` asserts them). |
| `components/FretDot.tsx` | `DOT_CONFIG: Record<DotState, …>`, all fills are `var(--color-dot-*, hex)`. Freeform draws a second dashed ring circle. The glow filter applies to mode/mode-root. | Add `key-root` config + ring branch. | Every existing state renders identically (FretDot tests assert exact attributes). |
| `components/FretboardCanvas.tsx` | While a chord is shown, `dots` = chord dots ONLY; scale and key context vanish. Render order: surface → capo dim → strings → nut → frets → capo → inlays → nut labels → fret numbers → dots → freeform → hit targets. | Add a rings layer between dots and freeform; legend after the scroll wrapper; chord-aware aria label. | `fretboard-scroll-wrapper`/`fretboard-svg` test ids and styles; hit targets stay last (topmost) so freeform clicks work. |
| `hooks/useProgressionPlayback.ts` | Each step calls `setRootNote(entry.rootNote)` + `setChordName(entry.chordName)`, which **overwrites the key**. That also flips the URL `?key=` and changes what `loadPreset` transposes to. Snapshot is `{rootNote, chordName}`. | Use `chordName`/`chordRoot`, and snapshot `{chordName, chordRoot}`. | ←/→ stepping, form-control guard, restore on stop and on unmount, "untouched if never stepped" behaviour. |
| `index.css` | 6 theme blocks: `:root` (light) L53, `[data-theme="dark"]` L167, `neon` L272, `mono` L344, `vibrant` L418, `minimal` L490. `--color-dot-*` at ≈ L125/241/332/406/477/559. | Add one token per block. | Everything else. |
| `App.jsx` | Renders the main `FretboardCanvas` in `#fretboard`. | Add `showLegend`. | The `gridArea` wiring (the fix for the Epic 6 retro regression). |

### Why the chord-view legend labels differ from the scale view
`calculateChordDots` reuses `'root'` and `'scale'` for the chord root and chord tones. The same DotState therefore means something different depending on whether a chord is shown, and `getLegendEntries` must take `chordActive` to label them correctly. Don't add new DotStates for chord root or chord tone. That would force changes across FretDot, the tests, and all 6 theme blocks for no visual difference.

### Chord label wording (from 6.3)
`harmony.ts`'s `DISPLAY_SUFFIX` only covers about 15 of the 28 chord types, so chord UIs label chords verbatim as `${root} ${type}` (e.g. `"D Minor"`, `"C Dominant 7sus4"`). Do the same in the aria label. Don't use `chordDisplayName`.

### Store call-order gotcha (from 6.3)
`setChordName` resets `chordRoot` to `null` in the same `set()`. Always call `setChordName` **then** `setChordRoot`. `ChordsInKey.tsx:50-51` and `ChordRelationships.tsx:61-62` already do this; follow their pattern.

### Behaviour changes that are intended (don't treat them as regressions)
Because progression stepping no longer rewrites `rootNote`, these now stay fixed on the selected key during playback, where before they followed each chord:
- the Diatonic (Chords in Key) chord list,
- the key context Jazzify reads,
- the URL `?key=` param (`useUrlState` pushes `rootNote`),
- the transpose target for `loadPreset` (Task 6.5).

All four are the point of the fix. A reviewer who flags any of them as a regression is wrong.

### Which surfaces produce rings (no code change needed besides Task 6)
- **Chord Library:** `setChordName(name)` only, so `chordRoot` is null, the chord is rooted at the key, and no rings render. That's correct: a Chord Library chord *is* at the key root.
- **Diatonic:** `setChordName` → `setChordRoot(degreeRoot)`. Rings appear for every degree except I.
- **Jazzify:** same pattern. Rings appear for suggestions whose root differs from the key.
- **Progression:** rings work only after Task 6.

### Enharmonics
`CHROMATIC_NOTES` spells with sharps, but always compare pitch classes through `isRoot()` from `@/utils/musicTheory.js` (it's already used by `calculateChordDots`). Never use `===` on note names.

### Architecture compliance
- Frontend-only. No new API routes, no backend, no schema changes.
- Fretboard renders from Zustand state (architecture rule). Keep marker computation pure in `utils/` and memoized in the canvas.
- Do NOT modify frozen data files (`data/notes.js`, `data/tunings.js`, `data/scales.js`). Treat `utils/musicTheory.js` (`getNoteAtFret`, `isRoot`, `getScaleNotes` over `data/notes.js`) as read-only too — nothing here needs to change it.
- Tailwind v4 CSS-first: tokens go in `index.css`. There's no `tailwind.config.js`.
- Don't hand-edit `components/ui/*` (shadcn).

### Project structure notes
- `FretboardLegend.tsx` goes in `components/`, next to `FretboardCanvas.tsx`/`FretDot.tsx`. CLAUDE.md prefers `features/` for new components, but all fretboard-rendering components already live in `components/`, and there's no `features/fretboard/` directory. Keeping the legend next to `DOT_CONFIG` avoids a cross-feature import. This is a deliberate exception; mention it in the Completion Notes.
- `components/Fretboard.jsx` is legacy/unrelated. Don't touch it.

### Testing standards
- Vitest + Testing Library, co-located `*.test.ts(x)`, and the `@/` alias.
- The contrast tests mirror `index.css` values by hand, because jsdom doesn't resolve CSS variables on SVG attributes. Keep every mirror in sync, since a stale mirror silently mis-reports contrast (a 4.5 review finding).
- Compute colour-blind separation and contrast; don't eyeball them (Epic 4/5 lesson).
- 596 tests pass at story start (1 known-flaky timing test in `FretboardCanvas.test.tsx`).

### Previous-work intelligence
- **Epic 6 retro, Pattern 3:** layout bugs are invisible to jsdom. The live check in AC 9 is mandatory, not optional.
- **Epic 6 retro, Pattern 1:** review agents produced many false positives. When this story is reviewed, verify each finding against the source before patching, and use a different model from the implementer (project feedback rule).
- **4.5:** the `--color-dot-*` tokens are live (FretDot reads them through `var()` with hex fallbacks). A literal `*/` in a CSS comment broke the app.
- **Recent commit `b61adf4`** (review of the metronome/tuner work) introduced some defensive noise elsewhere (e.g. `isPremium ?? false`). Don't copy that style. Match the surrounding code: minimal guards, no empty catch blocks.

### References
- [Source: _bmad-output/planning-artifacts/epics.distillate.md#Story 7.1]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-09-29.md#4.1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.distillate.md#Epic 7 additions]
- [Source: _bmad-output/planning-artifacts/architecture.distillate.md] (frontend state/rendering rules)
- [Source: _bmad-output/implementation-artifacts/epic-6-retro-2026-09-28.md#Challenges & Patterns]
- [Source: frontend/src/components/FretDot.test.tsx#note-name contrast] (contrast helper pattern to reuse)
- [Source: backlog.md#Distinguish the KEY's root note] (original requirement)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- Red → green per task. New tests failed first as expected (utils 11, FretDot 3, canvas 9, progression 6), then passed after implementation.
- Full suite: 653/653 (596 at start, +57). `npm run type-check`, `npm run lint`, `npm run build` all clean. The known-flaky `FretboardCanvas` <100ms test passed in the full run.
- `tsc -b` fails with TS6310 (tsconfig.node.json may not disable emit). That's pre-existing and unrelated. The project's own `type-check` script (`tsc --noEmit`) is the gate, and it passes.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- **Task 1:** `DotState` gains `'key-root'`. Added `calculateKeyRootMarkers` (same loop/capo/strings-override rules as `calculateChordDots`, `isRoot()` pitch-class comparison, `[]` when the chord is rooted on the key) and `getLegendEntries` (fixed-order chord-view vs scale-view label tables). `generateAriaLabel` takes an optional chord and drops the mode suffix in chord view. Added the first direct `generateAriaLabel` tests.
- **Task 2:** FretDot `key-root` renders one stroke-only circle (r 16 vs the root dot's 13, stroke 2.5×scale, `pointer-events="none"`, no glow, keeps the `fret-dot` class for the 80 ms transition). The contrast suite type is narrowed with `Exclude<…, 'key-root'>`. Added ring 3:1, ring≠root, and lone-ring text 4.5:1 checks for all 6 themes.
- **Task 3:** `--color-dot-key-root` added to all 6 theme blocks: light `#0f172a`, dark `#f1f5f9`, neon `#ffffff`, **mono `#fbbf24`**, vibrant `#f1f5f9`, minimal `#0f172a`. No `*/` inside CSS comments (69/69 balanced). **Mono owner decision (resolved in code review):** gold is the only hue-based dot colour in a theme whose own comment documents a lightness-only palette. Kept gold; see Review Findings and the Change Log entry below for the resolution.
- **Code-review follow-up (2026-09-29):** resolved the mono-ring decision-needed finding — kept gold, scoped the "lightness not hue" comment in `index.css` to the FILL palette specifically, documented the computed 9.99:1 ring-vs-board ratio, and added a `FretboardCanvas.test.tsx` regression test proving key-root and mode/mode-root dots are structurally mutually exclusive (a chord always wins in the `dots` memo), which is why the mono ring's gold can never collide on-screen with `mode-root`'s similarly warm-toned grey. The one `patch` finding (a cosmetic fragment-indentation nit in `FretboardCanvas.tsx`) was left as an open action item by owner choice. 654/654 tests, `tsc --noEmit`, and `eslint` all green after the fix.
- **Task 4:** FretboardCanvas decides "chord shown" from whether `chordName` resolves in `CHORDS`. The dots, rings, legend labels and aria-label all use that one flag, so an unknown chord name falls back to the scale view everywhere. Rings render after chord dots and before freeform dots. Ring note names are suppressed where a chord dot already labels the position (lookup is a `Set`). The legend renders outside the scroll wrapper behind an opt-in `showLegend` prop, so the Custom Tuning Creator preview has no legend.
- **Task 5:** new presentational `components/FretboardLegend.tsx`. Swatches are drawn from `DOT_CONFIG` (same tokens and opacities as the dots), with the ring and dashed-ring shapes reproduced, `aria-hidden`, inside a labelled `<ul>`. **Deliberate location exception:** it lives in `components/` next to FretDot and FretboardCanvas, not `features/`, because all fretboard rendering lives there and it imports `DOT_CONFIG`.
- **Task 6:** `useProgressionPlayback` now sets `setChordName` → `setChordRoot` and never touches `rootNote`. The snapshot is `{chordName, chordRoot}`, restored in the same order on both stop and unmount. `playChord` is untouched (that's Story 7.2). Rewrote the 3 tests that encoded the key overwrite (1 hook test, 2 ProgressionBuilder tests; the ArrowRight test never asserted `rootNote`). Added: key never changes while stepping; a diatonic chord (name + root) restores after playback stops; a preset transposes to the key after stepping (the regression).
- **Task 7:** `App.jsx` passes `showLegend` to the main canvas only.
- **Task 8, live check** (Chrome, dev server with `VITE_DEV_UNLOCK_PREMIUM`), key C major:
  - Diatonic `ii` Dm: 12 hollow rings on every C, legend "Chord root · Chord tone · Key root", aria "D Minor chord in the key of C on Standard E tuning".
  - `vi` Am: 12 rings, all 12 encircling a C chord-tone dot.
  - `I` C: 0 rings, no "Key root" entry.
  - Progression "I–V–vi–IV" stepped with arrow keys: key selector and URL `?key=` stayed on C throughout, rings on G/F, 0 rings on C.
  - Live computed ring vs board, all 6 themes (oklch converted through a canvas): light 15.4, dark 18.95, neon 19.44, mono 9.99, vibrant 15.08, minimal 15.46. The legend swatch stroke matched the ring in every theme.
  - Narrow width: the browser window couldn't actually be resized (maximized; innerWidth stayed 1463), so I constrained `#fretboard` to 343 px (375 minus the 16 px gutters) instead. The 3-item legend fits one row; a 6-item worst case wraps to 2 rows with no overflow. The board scrolls, the legend doesn't. **A true 375 px device check is still worth doing by hand.**
  - No console errors after a reload.
- **Out-of-scope fix (needed for the lint gate):** `lib/metronome.ts:83` and `lib/tunerEngine.ts:75` had unused `catch (e)`/`catch (err)` bindings introduced by commit `b61adf4`, which failed `npm run lint`. I changed them to `catch {}`. Behaviour is unchanged; the rest of that commit's code is untouched.
- **Review follow-up (2026-11-16):** Resolved the one open `[Review][Patch]` finding — re-indented the fragment-wrapped JSX in `FretboardCanvas.tsx` (lines 129-405: the `<div>` scroll wrapper and `<FretboardLegend />`) one level under the `<>...</>` the previous pass introduced. Whitespace-only change, no logic touched. Full gate re-run: `tsc --noEmit` clean, `eslint .` clean, `vitest run` 654/654 passing, `vite build` succeeds. No new tests needed (cosmetic formatting fix).
- **Observed, not fixed (pre-existing, outside scope):**
  - Chrome screenshots timed out for about 30 s right after selecting a chord. The DOM stayed responsive, so this is most likely the auto-play audio on select (premium dev flag). It supports doing Story 7.2 next.
  - The mode chips row is clipped on the left ("Ionian" is cut off) before any chord is selected. This is a layout issue for the UX density session.

### File List

- `frontend/src/utils/fretboardUtils.ts` (modified)
- `frontend/src/utils/fretboardUtils.test.ts` (modified)
- `frontend/src/components/FretDot.tsx` (modified)
- `frontend/src/components/FretDot.test.tsx` (modified)
- `frontend/src/components/FretboardCanvas.tsx` (modified)
- `frontend/src/components/FretboardCanvas.test.tsx` (modified)
- `frontend/src/components/FretboardLegend.tsx` (new)
- `frontend/src/components/FretboardLegend.test.tsx` (new)
- `frontend/src/hooks/useProgressionPlayback.ts` (modified)
- `frontend/src/hooks/useProgressionPlayback.test.tsx` (modified)
- `frontend/src/features/library/ProgressionBuilder.test.tsx` (modified)
- `frontend/src/index.css` (modified)
- `frontend/src/App.jsx` (modified)
- `frontend/src/lib/metronome.ts` (modified: lint-only, out of scope, see notes)
- `frontend/src/lib/tunerEngine.ts` (modified: lint-only, out of scope, see notes)
- `_bmad-output/implementation-artifacts/7-1-key-root-marker-and-fretboard-legend.md` (story record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status)

## Change Log

- 2026-09-29: Implemented Story 7.1. Key-root hollow-ring marker (new `key-root` DotState + `--color-dot-key-root` in 6 themes), fretboard legend, chord-aware aria-label, and the progression fix so stepping no longer overwrites the selected key. +57 tests (653 total). Two unused catch bindings from `b61adf4` fixed to unblock lint.
- 2026-09-29: Code review (Sonnet 5, different model from implementation). Resolved the mono-ring decision-needed finding: kept gold, rewrote the `index.css` mono comment to document the fill-only scope of the lightness rule and the computed 9.99:1 ring-vs-board ratio, and added a regression test proving key-root and mode/mode-root dots can never co-render. +1 test (654 total). Left one cosmetic patch finding (fragment indentation in `FretboardCanvas.tsx`) as an open action item. Status → in-progress pending that item.
- 2026-11-16: Resolved the remaining open Patch finding — re-indented the fragment-wrapped JSX block in `FretboardCanvas.tsx` (the scroll-wrapper `<div>` and `<FretboardLegend />` under the `<>...</>`). Whitespace-only, no behaviour change. `tsc`, `eslint`, `vitest run` (654/654), and `vite build` all green. All Review Findings now resolved/deferred-by-design; story moved to `review`.
