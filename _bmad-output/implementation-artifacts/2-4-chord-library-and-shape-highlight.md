# Story 2.4: Chord Library & Shape Highlight

Status: done

## Dev Context
- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **guitarist**,
I want to browse chord qualities in the library panel and see those notes highlighted on the fretboard,
so that I can visualise chord shapes across any tuning without leaving the panel.

## Acceptance Criteria

**AC1** — Given the Chord Library tab is open,
When the user views the chord list,
Then the first 5 chords (`CHORD_NAMES.slice(0, 5)`) render as `preview` LibraryItems (selectable, "Preview" badge visible), and all remaining chords render as `locked` LibraryItems (muted + lock Badge, `aria-disabled="true"`).

**AC2** — Given a `preview` LibraryItem in the chord list,
When the user clicks it,
Then it activates (indigo tint + checkmark), `useFretboardStore.chordName` updates to that chord name, and the fretboard re-renders showing chord tones highlighted using FretDot `'root'` (amber) and `'scale'` (indigo) states (instant, no spinner).

**AC3** — Given an active chord and the user changes the active tuning (via ControlBar),
When the fretboard re-renders,
Then the chord highlight dots recalculate against the new tuning's string pitches (tuning-aware) — no user action required.

**AC4** — Given a chord is active in `useFretboardStore.chordName`,
When the user views the chord list,
Then that chord renders as `active` (indigo tint + checkmark).

**AC5** — Given a `locked` LibraryItem in the chord list,
When the user clicks it,
Then `PaywallCard` opens anchored to that item (desktop) or inline (mobile) — identical behaviour to Story 2.2 / ScaleLibrary locked items.

**AC6** — Given the `active` variant takes priority,
When a chord is both "in the free tier" and "currently active",
Then it renders as `active` (not `preview`).

**AC7** — Given a chord is currently active (`aria-selected="true"`),
When the user clicks that same chord again (toggle/deselect),
Then `useFretboardStore.chordName` is set to `null` and the fretboard returns to showing scale highlight dots.

## Tasks / Subtasks

- [x] Task 1: Create chord data file (AC: 1, 2, 3, 7)
  - [x] New file: `frontend/src/data/chords.js` (JS not TS — same convention as scales.js, tunings.js)
  - [x] Export `CHORDS` object: 12 chord qualities, key = display name, value = `{ intervals: number[] }`
  - [x] Export `CHORD_NAMES = Object.keys(CHORDS)` — array of 12 names
  - [x] First 5 in insertion order are the free tier (Major, Minor, Dominant 7, Minor 7, Major 7)
  - [x] See exact chord table in Dev Notes below
  - [x] Do NOT add TypeScript types to this file

- [x] Task 2: Add chordName state to fretboardStore (AC: 2, 4, 7)
  - [x] File: `frontend/src/stores/fretboardStore.ts`
  - [x] Add `chordName: string | null` to `FretboardState` interface
  - [x] Add `setChordName: (name: string | null) => void` to `FretboardState` interface
  - [x] Add `chordName: null as string | null` to `DEFAULT_FRETBOARD_STATE`
  - [x] Add `setChordName: (chordName) => set({ chordName })` to the `create()` call
  - [x] Do NOT change any other existing fields or setters

- [x] Task 3: Add calculateChordDots to fretboardUtils (AC: 2, 3)
  - [x] File: `frontend/src/utils/fretboardUtils.ts`
  - [x] Export `calculateChordDots(intervals: number[], rootNote: string, tuningName: string, capoPosition?: number): FretDotData[]`
  - [x] Build chord note set using ONLY existing imports: `new Set(intervals.map(i => getNoteAtFret(rootNote, i % 12)))`
  - [x] Per-string, per-fret loop: `isRoot(note, rootNote)` → `'root'` state; `chordNotes.has(note)` → `'scale'` state
  - [x] Same skip logic as calculateFretboardDots: `if (fret < capoPosition) continue`
  - [x] No new imports needed — all functions already imported from musicTheory.js; TUNINGS already imported from tunings.js
  - [x] See exact implementation in Dev Notes below

- [x] Task 4: Update FretboardCanvas to support chord highlighting (AC: 2, 3, 7)
  - [x] File: `frontend/src/components/FretboardCanvas.tsx`
  - [x] Add `chordName?: string | null` to `FretboardCanvasProps`
  - [x] Import `CHORDS` from `@/data/chords.js` (JS import; cast to `Record<string, { intervals: number[] }>` inline)
  - [x] Import `calculateChordDots` from `@/utils/fretboardUtils`
  - [x] Update the `dots` useMemo: when `chordName` is set and exists in CHORDS, return `calculateChordDots(intervals, rootNote, tuning, capoPosition)` INSTEAD of `calculateFretboardDots(...)` — chord dots REPLACE scale dots; freeform dots still render separately
  - [x] Add `chordName` to the useMemo dependency array
  - [x] Freeform dots are unaffected — they always render via the separate `freeformDots` memo

- [x] Task 5: Create ChordLibrary component (AC: 1, 2, 4, 5, 6, 7)
  - [x] New file: `frontend/src/features/library/ChordLibrary.tsx`
  - [x] Import `CHORD_NAMES` from `@/data/chords.js` (cast as `string[]`)
  - [x] Import `useFretboardStore` from `@/stores/fretboardStore`
  - [x] Import `LibraryItem` from `./LibraryItem`
  - [x] Define: `const FREE_CHORD_NAMES = new Set((CHORD_NAMES as string[]).slice(0, 5))`
  - [x] Props: `interface ChordLibraryProps { onPaywallTrigger: (el: HTMLElement) => void }`
  - [x] Read `chordName` + `setChordName` from `useFretboardStore()`
  - [x] Variant priority: `name === chordName → 'active'`; `FREE_CHORD_NAMES.has(name) → 'preview'`; else `'locked'`
  - [x] `onSelect`: `() => setChordName(chordName === name ? null : name)` — clicking active chord deselects it (sets null)
  - [x] `onPaywallTrigger`: pass through as-is
  - [x] Wrapper: `<div className="flex flex-col gap-1" role="listbox" aria-label="Chord Library">`
  - [x] See exact implementation in Dev Notes below

- [x] Task 6: Update LibraryPanel to use ChordLibrary (AC: 1, 2, 4, 5, 6, 7)
  - [x] File: `frontend/src/features/library/LibraryPanel.tsx`
  - [x] Import `ChordLibrary` from `./ChordLibrary`
  - [x] Remove `CHORD_DEMOS` constant entirely
  - [x] Remove `import LibraryItem, { type LibraryItemVariant } from './LibraryItem'` — no longer needed in LibraryPanel (LibraryItem used via ScaleLibrary/ChordLibrary internally)
  - [x] In `tabContent`, replace the chord tab branch with `<ChordLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />`
  - [x] The outer `<div className="flex-1 overflow-y-auto p-4">` wrapper remains; both tabs render a child that provides its own listbox wrapper
  - [x] Final tabContent shape: `activeTab === 'scale' ? <ScaleLibrary .../> : <ChordLibrary .../>`
  - [x] See exact target structure in Dev Notes below

- [x] Task 7: Update App.jsx to pass chordName to FretboardCanvas (AC: 2, 3, 7)
  - [x] File: `frontend/src/App.jsx`
  - [x] Add `chordName` to the destructured state from `useFretboardStore()`
  - [x] Pass `chordName={chordName}` to `<FretboardCanvas ...>`

- [x] Task 8: Tests for ChordLibrary (AC: 1–7)
  - [x] New file: `frontend/src/features/library/ChordLibrary.test.tsx`
  - [x] Reset stores in `beforeEach`: `useFretboardStore.setState({ chordName: DEFAULT_FRETBOARD_STATE.chordName })`
  - [x] Test: all N chord names rendered — `screen.getAllByRole('option')` has length `(CHORD_NAMES as string[]).length`
  - [x] Test: first 5 chords are `preview` — each has text "Preview" visible; `screen.getAllByText('Preview')` has length 5
  - [x] Test: 6th chord (`CHORD_NAMES[5]`) is `locked` — has `aria-disabled="true"`
  - [x] Test: active chord overrides locked — set `useFretboardStore.setState({ chordName: (CHORD_NAMES as string[])[7] })`, render, confirm `aria-selected="true"`
  - [x] Test: active chord overrides preview — set `useFretboardStore.setState({ chordName: (CHORD_NAMES as string[])[0] })`, render, confirm `aria-selected="true"` and only 4 "Preview" badges remain
  - [x] Test: clicking a preview chord calls `setChordName` — verify `useFretboardStore.getState().chordName === previewChord`
  - [x] Test: clicking an active chord sets chordName to null (deselect) — set store chordName first, click same item, verify `getState().chordName === null`
  - [x] Test: clicking a locked chord calls `onPaywallTrigger` — pass mock fn, click locked item, expect called
  - [x] Use `byTitle` helper for accessible name matching (same pattern as ScaleLibrary.test.tsx)

- [x] Task 9: Tests for calculateChordDots in fretboardUtils.test.ts (AC: 2, 3)
  - [x] File: `frontend/src/utils/fretboardUtils.test.ts`
  - [x] Test: `calculateChordDots([0, 4, 7], 'A', 'Standard E')` returns dots where root notes have state `'root'`, other chord tones have state `'scale'`, and no dots appear for non-chord notes
  - [x] Test: `calculateChordDots` result changes when tuning changes — verify different `FretDotData[]` for Standard E vs Drop D (AC3 tuning-awareness)
  - [x] Test: capoPosition skips frets below capo — no dot with `fret < capoPosition`

- [x] Task 10: Regression guard — LibraryPanel.test.tsx (AC: 1–7)
  - [x] File: `frontend/src/features/library/LibraryPanel.test.tsx`
  - [x] Update `beforeEach` to do a full fretboardStore reset: `useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })` (was only resetting `scaleName`; now chordName must also be null)
  - [x] All 8 existing tests remain valid — no structural test changes needed
  - [x] The `'clicking locked LibraryItem shows PaywallCard'` test still finds a locked item via `aside.querySelector('button[aria-disabled="true"]')` because the default tab is Scale Library, which still has locked items starting at index 5

- [x] Task 11: Final validation
  - [x] `npm run type-check` → zero errors
  - [x] `npm run lint` → zero errors
  - [x] `npm test` → all pass, no regressions (target: ≥174 tests, was 163)

---

## Dev Notes

### What already exists — DO NOT re-create

```
frontend/src/
  data/scales.js                   — SCALE_NAMES, SCALES; pattern to follow for chords.js
  data/tunings.js                  — TUNINGS; do NOT touch
  utils/musicTheory.js             — getNoteAtFret, getScaleNotes, isRoot; do NOT touch
  utils/fretboardUtils.ts          — calculateFretboardDots, FretDotData, DotState, getDotCx, getDotCy; MODIFY to add calculateChordDots
  stores/fretboardStore.ts         — MODIFY only: add chordName + setChordName
  features/library/LibraryItem.tsx — all 4 variants implemented; use as-is
  features/library/ScaleLibrary.tsx — template for ChordLibrary; do NOT modify
  features/library/LibraryPanel.tsx — MODIFY: replace CHORD_DEMOS with ChordLibrary
  components/FretboardCanvas.tsx   — MODIFY: add chordName prop + calculateChordDots branch
  App.jsx                          — MODIFY: add chordName to destructure + FretboardCanvas prop
```

### Chord data — `frontend/src/data/chords.js`

```js
export const CHORDS = {
  'Major':          { intervals: [0, 4, 7] },
  'Minor':          { intervals: [0, 3, 7] },
  'Dominant 7':     { intervals: [0, 4, 7, 10] },
  'Minor 7':        { intervals: [0, 3, 7, 10] },
  'Major 7':        { intervals: [0, 4, 7, 11] },
  'Sus2':           { intervals: [0, 2, 7] },
  'Sus4':           { intervals: [0, 5, 7] },
  'Diminished':     { intervals: [0, 3, 6] },
  'Augmented':      { intervals: [0, 4, 8] },
  'Diminished 7':   { intervals: [0, 3, 6, 9] },
  'Minor Major 7':  { intervals: [0, 3, 7, 11] },
  'Dominant 9':     { intervals: [0, 4, 7, 10, 14] },
}

export const CHORD_NAMES = Object.keys(CHORDS)
```

Free tier = first 5 in insertion order: Major, Minor, Dominant 7, Minor 7, Major 7.
First locked chord = `CHORD_NAMES[5]` = `'Sus2'`.

**Interval 14 (Dominant 9)**: `14 % 12 = 2`, so the 9th (D above C, when root = C) is computed correctly via `getNoteAtFret(rootNote, 14 % 12)`. The same note appears an octave lower via interval 2. Both are highlighted; this is correct and expected.

### `calculateChordDots` — exact implementation

Add to `frontend/src/utils/fretboardUtils.ts` after `calculateFretboardDots`:

```ts
export function calculateChordDots(
  intervals: number[],
  rootNote: string,
  tuningName: string,
  capoPosition = 0
): FretDotData[] {
  const strings = (TUNINGS as Record<string, string[]>)[tuningName] ?? TUNINGS['Standard E']
  // Build note set using getNoteAtFret(rootNote, semitone) — avoids importing CHROMATIC_NOTES/noteIndex
  const chordNotes = new Set(intervals.map(i => getNoteAtFret(rootNote, i % 12)))
  const dots: FretDotData[] = []

  for (let stringIdx = 0; stringIdx < STRING_COUNT; stringIdx++) {
    const openNote = strings[stringIdx]
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      if (fret < capoPosition) continue
      const note = getNoteAtFret(openNote, fret)
      if (isRoot(note, rootNote)) {
        dots.push({ fret, string: stringIdx, state: 'root', note, cx: getDotCx(fret), cy: getDotCy(stringIdx) })
      } else if (chordNotes.has(note)) {
        dots.push({ fret, string: stringIdx, state: 'scale', note, cx: getDotCx(fret), cy: getDotCy(stringIdx) })
      }
    }
  }
  return dots
}
```

No new imports needed — `getNoteAtFret`, `isRoot`, `TUNINGS`, `STRING_COUNT`, `FRET_COUNT`, `getDotCx`, `getDotCy` are all already in scope.

### `ChordLibrary.tsx` — exact structure

```tsx
// frontend/src/features/library/ChordLibrary.tsx
import { CHORD_NAMES } from '@/data/chords.js'
import { useFretboardStore } from '@/stores/fretboardStore'
import LibraryItem from './LibraryItem'

const FREE_CHORD_NAMES = new Set((CHORD_NAMES as string[]).slice(0, 5))

interface ChordLibraryProps {
  onPaywallTrigger: (el: HTMLElement) => void
}

export default function ChordLibrary({ onPaywallTrigger }: ChordLibraryProps) {
  const { chordName, setChordName } = useFretboardStore()

  return (
    <div className="flex flex-col gap-1" role="listbox" aria-label="Chord Library">
      {(CHORD_NAMES as string[]).map((name) => {
        const variant = name === chordName
          ? 'active'
          : FREE_CHORD_NAMES.has(name)
          ? 'preview'
          : 'locked'

        return (
          <LibraryItem
            key={name}
            title={name}
            variant={variant}
            onSelect={() => setChordName(chordName === name ? null : name)}
            onPaywallTrigger={onPaywallTrigger}
          />
        )
      })}
    </div>
  )
}
```

**Deselect toggle**: `setChordName(chordName === name ? null : name)` — when clicking the active chord, sets null; otherwise sets the name. LibraryItem only calls `onSelect` when variant is not `'locked'` — so locked items never fire setChordName.

### `LibraryPanel.tsx` — target state after Task 6

```tsx
// Removed: import LibraryItem, { type LibraryItemVariant } from './LibraryItem'
// Removed: const CHORD_DEMOS = [...]
// Added:
import ChordLibrary from './ChordLibrary'

// tabContent becomes:
const tabContent = (
  <div className="flex-1 overflow-y-auto p-4">
    {activeTab === 'scale'
      ? <ScaleLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />
      : <ChordLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />
    }
  </div>
)
```

`ChordLibrary` provides its own `role="listbox"` wrapper div, so no extra wrapper needed in LibraryPanel.

### `FretboardCanvas.tsx` — chord branch in dots useMemo

```tsx
// New import (add to existing imports):
import { CHORDS } from '@/data/chords.js'
import { calculateChordDots, ... } from '@/utils/fretboardUtils'   // add calculateChordDots to existing import

// Add to FretboardCanvasProps:
chordName?: string | null;

// Update the existing dots useMemo:
const dots = useMemo(() => {
  if (chordName) {
    const chord = (CHORDS as Record<string, { intervals: number[] }>)[chordName]
    if (chord) return calculateChordDots(chord.intervals, rootNote, tuning, capoPosition)
  }
  return calculateFretboardDots(tuning, rootNote, scaleName, capoPosition, modeIndex)
}, [tuning, rootNote, scaleName, capoPosition, modeIndex, chordName])
```

The `freeformDots` useMemo is UNCHANGED — freeform dots always render on top, unaffected by chord state.

### `fretboardStore.ts` — exact additions only

```ts
// Add to FretboardState interface:
chordName: string | null;
setChordName: (name: string | null) => void;

// Add to DEFAULT_FRETBOARD_STATE:
chordName: null as string | null,

// Add to create() body:
setChordName: (chordName) => set({ chordName }),
```

### `App.jsx` — additions only

```jsx
// Before:
const { tuning, rootNote, scaleName, modeIndex, capoPosition, freeformMarks, noteNamesVisible, freeformModeActive, toggleFreeformMark } = useFretboardStore();

// After:
const { tuning, rootNote, scaleName, modeIndex, capoPosition, freeformMarks, noteNamesVisible, freeformModeActive, toggleFreeformMark, chordName } = useFretboardStore();

// And on FretboardCanvas JSX, add:
chordName={chordName}
```

### Test patterns — ChordLibrary.test.tsx

Follow ScaleLibrary.test.tsx exactly. Key differences:
- Import `CHORD_NAMES` from `@/data/chords.js` instead of SCALE_NAMES
- Reset `chordName` (not `scaleName`) in beforeEach
- Add a deselect test (no equivalent in ScaleLibrary)
- Accessible name helper (same pattern): `const byTitle = (name: string) => (n: string) => n === name || n === name + 'Preview'`
- CHORD_NAMES has no names with parentheses, but use `byTitle` anyway for correctness

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChordLibrary from './ChordLibrary'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { CHORD_NAMES } from '@/data/chords.js'

const byTitle = (name: string) => (n: string) => n === name || n === name + 'Preview'

beforeEach(() => {
  useFretboardStore.setState({ chordName: DEFAULT_FRETBOARD_STATE.chordName })
})

describe('ChordLibrary', () => {
  it('renders all chord names as LibraryItems', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength((CHORD_NAMES as string[]).length)
  })

  it('first 5 chords are preview variant (show "Preview" badge)', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    expect(screen.getAllByText('Preview')).toHaveLength(5)
    ;(CHORD_NAMES as string[]).slice(0, 5).forEach((name) => {
      const btn = screen.getByRole('option', { name: byTitle(name) })
      expect(btn).not.toHaveAttribute('aria-disabled', 'true')
      expect(btn).not.toHaveAttribute('aria-selected', 'true')
    })
  })

  it('6th chord is locked (aria-disabled="true")', () => {
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const sixthChord = (CHORD_NAMES as string[])[5] // 'Sus2'
    const btn = screen.getByRole('option', { name: byTitle(sixthChord) })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('active chord overrides locked status (chord outside free tier)', () => {
    const lockedChord = (CHORD_NAMES as string[])[7] // 'Diminished'
    useFretboardStore.setState({ chordName: lockedChord })
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const btn = screen.getByRole('option', { name: byTitle(lockedChord) })
    expect(btn).toHaveAttribute('aria-selected', 'true')
    expect(btn).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('active chord overrides preview status (chord inside free tier)', () => {
    const previewChord = (CHORD_NAMES as string[])[0] // 'Major'
    useFretboardStore.setState({ chordName: previewChord })
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    const btn = screen.getByRole('option', { name: byTitle(previewChord) })
    expect(btn).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('Preview')).toHaveLength(4)
  })

  it('clicking a preview chord updates fretboardStore.chordName', async () => {
    const user = userEvent.setup()
    const previewChord = (CHORD_NAMES as string[])[1] // 'Minor'
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    await user.click(screen.getByRole('option', { name: byTitle(previewChord) }))
    expect(useFretboardStore.getState().chordName).toBe(previewChord)
  })

  it('clicking an active chord sets chordName to null (deselect)', async () => {
    const user = userEvent.setup()
    const previewChord = (CHORD_NAMES as string[])[0] // 'Major'
    useFretboardStore.setState({ chordName: previewChord })
    render(<ChordLibrary onPaywallTrigger={() => {}} />)
    await user.click(screen.getByRole('option', { name: byTitle(previewChord) }))
    expect(useFretboardStore.getState().chordName).toBeNull()
  })

  it('clicking a locked chord calls onPaywallTrigger', async () => {
    const user = userEvent.setup()
    const onPaywallTrigger = vi.fn()
    const lockedChord = (CHORD_NAMES as string[])[5] // 'Sus2'
    render(<ChordLibrary onPaywallTrigger={onPaywallTrigger} />)
    const lockedBtn = screen.getByRole('option', { name: byTitle(lockedChord) })
    await user.click(lockedBtn)
    expect(onPaywallTrigger).toHaveBeenCalledWith(lockedBtn)
  })
})
```

### fretboardUtils.test.ts — additions for calculateChordDots

Add to the existing test file. Follow existing test style:

```ts
describe('calculateChordDots', () => {
  it('returns root dots (state="root") and chord tone dots (state="scale") for A Major on Standard E', () => {
    const dots = calculateChordDots([0, 4, 7], 'A', 'Standard E')
    const rootDots = dots.filter(d => d.state === 'root')
    const scaleDots = dots.filter(d => d.state === 'scale')
    expect(rootDots.length).toBeGreaterThan(0)
    expect(scaleDots.length).toBeGreaterThan(0)
    // All root dots are 'A'
    rootDots.forEach(d => expect(d.note).toBe('A'))
    // No non-chord state dots (no 'mode' or 'freeform')
    expect(dots.every(d => d.state === 'root' || d.state === 'scale')).toBe(true)
  })

  it('different tunings produce different dot positions for the same chord', () => {
    const dotsE = calculateChordDots([0, 4, 7], 'A', 'Standard E')
    const dotsDropD = calculateChordDots([0, 4, 7], 'A', 'Drop D')
    // Drop D changes low string from E to D — different set of fret/string combinations
    expect(dotsE).not.toEqual(dotsDropD)
  })

  it('capoPosition skips frets below capo', () => {
    const dots = calculateChordDots([0, 4, 7], 'A', 'Standard E', 3)
    expect(dots.every(d => d.fret >= 3)).toBe(true)
  })
})
```

### Architecture guardrails

- `ChordLibrary.tsx` → `frontend/src/features/library/` (library domain — matches architecture dir spec)
- `chords.js` → `frontend/src/data/` (plain data, JS not TS — same convention as scales.js)
- Do NOT add URL sync for `chordName` in this story — not in the epic ACs; deferred if needed
- Do NOT modify `scales.js`, `tunings.js`, or `musicTheory.js`
- Do NOT modify `LibraryItem.tsx` — already supports all 4 variants
- Do NOT call any API — all data is local
- Do NOT add `useSubscriptionStore.isPremium` to `ChordLibrary` — free tier is static (first 5), same as ScaleLibrary
- The `chordName` store field is NOT URL-synced — `useUrlState.ts` is unchanged in this story

### Regression risk: existing tests

**LibraryPanel.test.tsx**: `'clicking locked LibraryItem shows PaywallCard'` uses `aside.querySelector('button[aria-disabled="true"]')` which finds the first locked item visible. Since the default active tab is `'scale'`, the scale library still renders and still has locked items (starting at index 5: Natural Minor Aeolian). This test continues to pass unchanged — just needs the beforeEach to also reset `chordName` via full DEFAULT_FRETBOARD_STATE spread.

**ScaleLibrary.test.tsx**: Completely unaffected — no ScaleLibrary changes.

**FretboardCanvas.test.tsx**: Existing tests pass `scaleName` and no `chordName` — `chordName` defaults to `undefined` which is falsy, so the dots memo falls through to `calculateFretboardDots` as before. No existing FretboardCanvas tests break.

### File list for this story

**New files:**
- `frontend/src/data/chords.js`
- `frontend/src/features/library/ChordLibrary.tsx`
- `frontend/src/features/library/ChordLibrary.test.tsx`

**Modified files:**
- `frontend/src/stores/fretboardStore.ts` — add chordName + setChordName
- `frontend/src/utils/fretboardUtils.ts` — add calculateChordDots
- `frontend/src/components/FretboardCanvas.tsx` — add chordName prop + chord dots branch
- `frontend/src/App.jsx` — add chordName to store destructure + FretboardCanvas prop
- `frontend/src/features/library/LibraryPanel.tsx` — replace CHORD_DEMOS with ChordLibrary
- `frontend/src/features/library/LibraryPanel.test.tsx` — full DEFAULT_FRETBOARD_STATE reset in beforeEach
- `frontend/src/utils/fretboardUtils.test.ts` — add calculateChordDots tests
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — mark 2-4 in-progress → done

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- No blocking issues. All imports resolved cleanly. `CHORD_NAMES` typed as `string[]` inline at call sites (same pattern as scales.js in ScaleLibrary).

### Completion Notes List

- Task 1: `chords.js` created with 12 chord qualities; free tier = first 5 in insertion order; Dominant 9 interval 14 correctly handled via `% 12`
- Task 2: `fretboardStore.ts` — `chordName: string | null` + `setChordName` added to interface, DEFAULT_FRETBOARD_STATE, and `create()` body; no other fields changed
- Task 3: `calculateChordDots` exported from `fretboardUtils.ts`; uses only existing imports; placed before `calculateFreeformDots`
- Task 4: `FretboardCanvas.tsx` — `chordName` prop added; `dots` useMemo branches on chordName; freeformDots memo unchanged
- Task 5: `ChordLibrary.tsx` created; deselect toggle logic `chordName === name ? null : name` implemented correctly
- Task 6: `LibraryPanel.tsx` — removed `CHORD_DEMOS` and `LibraryItem`/`LibraryItemVariant` import; replaced chord tab branch with `<ChordLibrary />`
- Task 7: `App.jsx` — `chordName` added to destructure and passed to `FretboardCanvas`
- Task 8: 8 ChordLibrary tests — all AC scenarios covered including deselect (unique to ChordLibrary vs ScaleLibrary)
- Task 9: 3 calculateChordDots tests — root/scale state, tuning-awareness, capo skip
- Task 10: `LibraryPanel.test.tsx` `beforeEach` updated to full `DEFAULT_FRETBOARD_STATE` spread; all 8 existing tests pass unchanged
- Task 11: type-check ✅, lint ✅, tests 174/174 ✅ (target was ≥174)

### File List

- `frontend/src/data/chords.js` (new)
- `frontend/src/features/library/ChordLibrary.tsx` (new)
- `frontend/src/features/library/ChordLibrary.test.tsx` (new)
- `frontend/src/stores/fretboardStore.ts` (modified — chordName + setChordName)
- `frontend/src/utils/fretboardUtils.ts` (modified — calculateChordDots added)
- `frontend/src/components/FretboardCanvas.tsx` (modified — chordName prop + chord dots branch)
- `frontend/src/App.jsx` (modified — chordName destructure + FretboardCanvas prop)
- `frontend/src/features/library/LibraryPanel.tsx` (modified — replaced CHORD_DEMOS with ChordLibrary)
- `frontend/src/features/library/LibraryPanel.test.tsx` (modified — full DEFAULT_FRETBOARD_STATE reset)
- `frontend/src/utils/fretboardUtils.test.ts` (modified — calculateChordDots tests added)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — 2-4 in-progress → review)

### Change Log

- 2026-06-01: Story 2.4 implemented — ChordLibrary with 12 chords (5 free/7 locked), calculateChordDots, FretboardCanvas chord highlighting, 11 new tests (174 total)

---

### Review Findings

- [x] [Review][Patch] `class` instead of `className` JSX attribute — confirmed false positive; file already used `className`
- [x] [Review][Patch] Mobile Sheet portal renders on desktop when `sidePanel=true` — fixed: `isMobile` guard via `window.matchMedia` on mount; Sheet only opens when on mobile viewport [frontend/src/features/library/LibraryPanel.tsx:16,84]
- [x] [Review][Patch] Tab buttons missing `role="tablist"` on parent div — fixed: added `role="tablist"` [frontend/src/features/library/LibraryPanel.tsx:24]
- [x] [Review][Patch] `ChordLibrary.test.tsx` `beforeEach` resets only `chordName` — fixed: spread `DEFAULT_FRETBOARD_STATE` [frontend/src/features/library/ChordLibrary.test.tsx:10]
- [x] [Review][Defer] Locked chord externally activated renders as `active` and can be deselected without paywall [frontend/src/features/library/ChordLibrary.tsx:17-21] — deferred, pre-existing; Story 3.6 enforcement makes this moot for non-premium users
- [x] [Review][Defer] `capoPosition > 0` skips open strings (fret 0) in chord dots, potentially showing incomplete voicing — deferred, pre-existing behavior identical to calculateFretboardDots
- [x] [Review][Defer] AC7 deselect path not tested for a formerly-locked chord externally set as active — deferred, currently unreachable state in this story's UI; revisit in Story 3.6 [frontend/src/features/library/ChordLibrary.test.tsx]
- [x] [Review][Defer] SVG `aria-label` not updated when chord mode is active — screen readers announce stale scale label — deferred, out of story spec scope [frontend/src/components/FretboardCanvas.tsx]
