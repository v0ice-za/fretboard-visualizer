# Story 1.7: Capo Support

Status: done

## Dev Context
<!-- Load only these — distillates are lossless and 4× smaller than full docs -->
- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX Spec: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`

## Story

As a **guitarist who uses a capo**,
I want to set capo position so I see correct notes relative to the capo,
So that scale and tuning visualizations match what I actually hear.

## Acceptance Criteria

**Given** the app is open
**When** the ControlBar renders
**Then** a capo Slider (range 0–12) is present between the Scale select and the icon buttons group, labelled "Capo: None" when 0 and "Capo: N" when N > 0

**Given** a capo position N > 0 is set via the Slider
**When** the fretboard renders
**Then** a thick amber vertical bar (capo indicator, styled like the nut) appears at the left boundary of fret N's column, spanning the full string height

**Given** a capo position N > 0 is set
**When** the fretboard renders
**Then** a semi-transparent dark overlay covers frets 0 through N−1 (the region from x=0 to the capo indicator x), making them visually dimmed/inactive

**Given** a capo position N > 0 is set
**When** the fretboard renders
**Then** the nut string labels (left of the nut) show the sounded pitch at fret N for each string (e.g. capo=2 on Standard E: labels become F#, C#, A, E, B, F# top-to-bottom)

**Given** a capo position N is set
**When** any state change occurs (tuning, key, scale, mode, capo)
**Then** scale and root highlight dots recalculate with frets 0 through N−1 skipped — no dots appear in the dimmed region (already enforced by `calculateFretboardDots`)

**Given** the Slider is moved to 0
**When** the fretboard renders
**Then** no dim overlay, no capo indicator, nut labels revert to standard open string tuning notes — standard display restored

**Given** capo N > 0 is active
**When** the URL is copied and re-opened
**Then** capo restores from `?capo=N` query param; capo=0 is NOT written to URL (omit when default)

## Tasks / Subtasks

- [x] Task 1: Clamp `setCapoPosition` in `fretboardStore.ts`
  - [x] Change `setCapoPosition: (capoPosition) => set({ capoPosition })` to `setCapoPosition: (pos: number) => set({ capoPosition: Math.max(0, Math.min(12, pos)) })`
  - [x] Run `npm run type-check` — zero errors

- [x] Task 2: Install shadcn Slider
  - [x] Run `npx shadcn@latest add slider` from `frontend/`
  - [x] Verify `frontend/src/components/ui/slider.tsx` is created
  - [x] Run `npm run type-check` — zero errors from the new file

- [x] Task 3: Add capo Slider to `ControlBar.tsx`
  - [x] Add `capoPosition, setCapoPosition` to the `useFretboardStore()` destructure
  - [x] Import `Slider` from `@/components/ui/slider`
  - [x] Add capo Slider between the Scale `<Select>` and the right-aligned icon buttons `<div>`
  - [x] Slider: `min={0} max={12} step={1} value={[capoPosition]} onValueChange={(v) => setCapoPosition(Array.isArray(v) ? v[0] : v)}`
  - [x] Visible label adjacent to slider: `"Capo: None"` when capoPosition=0, `"Capo: ${capoPosition}"` when > 0
  - [x] Slider container: `aria-label="Capo position"` on the wrapping element; label is `id="capo-label"`, Slider gets `aria-labelledby="capo-label"`
  - [x] Width: constrain slider to ~80px (`w-20`) so it fits the ControlBar without crowding
  - [x] Run `npm run type-check` — zero errors

- [x] Task 4: Update `App.jsx` to pass `capoPosition` to `FretboardCanvas`
  - [x] Add `capoPosition` to the destructured values from `useFretboardStore()`
  - [x] Pass `capoPosition={capoPosition}` to `<FretboardCanvas />`
  - [x] Keep `.jsx` — do NOT convert to `.tsx`
  - [x] Run `npm run type-check` — zero errors

- [x] Task 5: Update `FretboardCanvas.tsx` — visual capo rendering
  - [x] Add `capoPosition` to the `ariaLabel` useMemo dependency array; update `generateAriaLabel` call to include capo context
  - [x] Update `generateAriaLabel` in `fretboardUtils.ts` to accept `capoPosition?: number` 5th param; when > 0 append `", capo at fret ${capoPosition}"` to the aria string
  - [x] **Dim overlay**: `<rect data-testid="capo-dim" ...>` renders after fretboard surface rect, before strings
  - [x] **Capo indicator bar**: `<line data-testid="capo-indicator" ...>` amber, renders after fret lines, before dots
  - [x] **Nut labels with capo pitch**: shows `getNoteAtFret(openNote, capoPosition)` when capo > 0; `getNoteAtFret` added to musicTheory import
  - [x] Run `npm run type-check` — zero errors

- [x] Task 6: Update `useUrlState.ts` — add `?capo=N` URL sync
  - [x] Add `capoPosition, setCapoPosition` to the `useFretboardStore()` destructure
  - [x] Hydration effect: reads `?capo=N`, parses int, validates 1–12, calls `setCapoPosition`
  - [x] Push effect: includes `capo` only when `capoPosition > 0`; omits when 0
  - [x] `capoPosition` added to push effect dependency array
  - [x] Run `npm run type-check` — zero errors

- [x] Task 7: Write tests
  - [x] `fretboardStore.test.ts`
    - [x] Test: `setCapoPosition(15)` → `capoPosition` clamps to 12
    - [x] Test: `setCapoPosition(-1)` → `capoPosition` clamps to 0
    - [x] Test: `setCapoPosition(5)` → `capoPosition` is 5
  - [x] `FretboardCanvas.test.tsx`
    - [x] Test: `capoPosition=3` → `data-testid="capo-dim"` rect is present
    - [x] Test: `capoPosition=3` → `data-testid="capo-indicator"` line is present
    - [x] Test: `capoPosition=0` → neither `capo-dim` nor `capo-indicator` is rendered
    - [x] Test: `capoPosition=3` → no dots rendered at frets 0, 1, 2
    - [x] Test: `capoPosition=2` → nut label at index 0 (high e) is "F#" not "E"
  - [x] `ControlBar.test.tsx`
    - [x] Test: Slider renders with a container having `aria-label="Capo position"`
    - [x] Test: when `capoPosition` store value is 0, label text includes "None"
    - [x] Test: when `capoPosition` store value is 5, label text includes "5"

- [x] Task 8: Final validation
  - [x] `npm run type-check` → zero errors
  - [x] `npm run lint` → zero errors, zero warnings
  - [x] `npm test` → 85 tests pass (73 + 12 new capo tests, no regressions)
  - [ ] `npm run dev` → capo slider in ControlBar; setting capo=3 dims frets 1–2, shows amber bar, shifts nut labels; resetting to 0 restores full fretboard

### Review Findings

- [x] [Review][Patch] Slider onValueChange: missing number type guard can corrupt store with NaN [ControlBar.tsx:91] — fixed: guard `if (typeof n === 'number')` added.

- [x] [Review][Patch] useUrlState.test.ts: no tests for capo URL hydration or conditional push [frontend/src/hooks/useUrlState.test.ts] — fixed: 6 new tests added (hydration valid/invalid/boundary + push present/absent).

- [x] [Review][Defer] URL hydration: parseInt('12.5')=12, decimal capo param silently accepted [frontend/src/hooks/useUrlState.ts:31] — deferred, pre-existing

- [x] [Review][Defer] Store: freeformMarks at frets below capo persist when capo raised [frontend/src/stores/fretboardStore.ts] — deferred, Story 1.8 concern

---

## Dev Notes

### What Already Exists — Do NOT Re-Create

**Store — capoPosition already wired (Story 1.4):**
- `frontend/src/stores/fretboardStore.ts` — `capoPosition: number` default `0`, `setCapoPosition: (pos) => set({ capoPosition })` (line 44). Task 1 MODIFIES the setter to add clamping. Do NOT add a new field.

**fretboardUtils.ts — capoPosition already skips dots:**
- Line 100: `if (fret < capoPosition) continue;` — frets below capo produce no dots. This is correct and must NOT be changed.
- Only change needed in fretboardUtils: update `generateAriaLabel` signature to add `capoPosition?` param (5th param, after existing 4).

**FretboardCanvas.tsx — capoPosition prop already exists:**
- Lines 27–28: `capoPosition?: number` prop, default `0`. It is already passed to `calculateFretboardDots` (line 46). App.jsx does NOT currently pass it (line 19 of App.jsx only passes tuning/rootNote/scaleName/modeIndex). Task 4 wires App.jsx.

**Nut line rendering (DO NOT CHANGE):**
- Lines 91–99 of FretboardCanvas.tsx: nut `<line>` at x=NUT_X=40, amber-bone color `#b8a980`, strokeWidth=5. Keep as-is. The capo indicator is an additional line drawn on top, distinct in amber `#f59e0b`.

**FretDot and music theory engine — DO NOT TOUCH:**
- `FretDot.tsx`, `musicTheory.js`, `tunings.js`, `scales.js` — no changes needed.

### Capo Dim Overlay — Render Position

The dim overlay rect must be placed in the SVG **after the fretboard background rect** but **before the fret lines and strings**, so it dims the wood/background area without obscuring the fret wires (which should remain visible as ghost lines).

Suggested render order in the SVG group:
1. `FretDotDefs` (SVG defs)
2. Fretboard surface rect (existing, `fill=color-fretboard`)
3. **Capo dim overlay rect** (new, `fill="rgba(0,0,0,0.55)"`) ← insert here
4. String lines (existing)
5. Nut line (existing)
6. Fret vertical lines (existing)
7. Fret position inlays (existing)
8. **Capo indicator bar** (new, amber line) ← insert after fret lines, before dots
9. Nut labels (existing, updated to show capoed pitch)
10. Fret numbers (existing)
11. FretDot components (existing)

### Capo Indicator x Position

For capoPosition = N:
- `getFretLineX(N - 1)` is the x of the fret wire just LEFT of fret N
- This is the visual boundary where the capo sits (behind fret N wire, which is the new "nut")
- For N=1: `getFretLineX(0)` = `NUT_X` = 40 (indicator overlaps nut — acceptable for fret 1 capo)
- For N=3: `getFretLineX(2)` ≈ some x > NUT_X — indicator clearly between frets 2 and 3

### Nut Label Capoed Pitch

In the existing nut labels map (`STRING_Y.map((y, i) => ...)`), the current expression is:
```tsx
{strings[STRING_COUNT - 1 - i]}
```

When capo > 0, replace with:
```tsx
{capoPosition > 0
  ? getNoteAtFret(strings[STRING_COUNT - 1 - i], capoPosition)
  : strings[STRING_COUNT - 1 - i]}
```

`getNoteAtFret` must be added to the musicTheory import at the top of FretboardCanvas.tsx:
```tsx
import { FRET_MARKERS, DOUBLE_MARKERS, getNoteAtFret } from '@/utils/musicTheory.js';
```

### Capo Slider in ControlBar — Layout

Place the slider group between the `</Select>` for Scale (line 77) and the `<div className="flex-shrink-0 flex items-center gap-1 ml-auto">` right-aligned icons group (line 80).

```tsx
{/* Capo */}
<div className="flex items-center gap-2 flex-shrink-0">
  <span id="capo-label" className="text-xs text-slate-400 whitespace-nowrap">
    {capoPosition === 0 ? 'Capo: None' : `Capo: ${capoPosition}`}
  </span>
  <Slider
    min={0}
    max={12}
    step={1}
    value={[capoPosition]}
    onValueChange={([v]) => setCapoPosition(v)}
    className="w-20"
    aria-labelledby="capo-label"
  />
</div>
```

### URL Sync — Conditional Capo Param

The push effect in `useUrlState.ts` currently sets:
```ts
setSearchParams(
  { tuning: state.tuning, key: state.rootNote, scale: state.scaleName },
  { replace: true }
);
```

Update to:
```ts
const params: Record<string, string> = {
  tuning: state.tuning,
  key: state.rootNote,
  scale: state.scaleName,
};
if (state.capoPosition > 0) {
  params.capo = String(state.capoPosition);
}
setSearchParams(params, { replace: true });
```

Add `capoPosition` to the dependency array and to the destructure of `useFretboardStore()`.

### Deferred Item Resolved by This Story

From `deferred-work.md`:
> `setCapoPosition` no clamping — accepts negative or out-of-range values; clamp to [0, FRET_COUNT] in Story 1.7 capo slider

Resolved by Task 1. Clamp is [0, 12] (UI range) not [0, FRET_COUNT=24], because the capo Slider only goes to 12 and the store setter is the correct enforcement boundary.

After completing this story, remove the `setCapoPosition` deferred item from `deferred-work.md`.
