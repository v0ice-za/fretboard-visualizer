# Story 1.8: Freeform Marking & Note Names

Status: done

## Dev Context
- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX Spec: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`

## Story

As a **guitarist exploring the fretboard**,
I want to mark arbitrary fret positions with a tap/click and toggle note name labels on all dots,
So that I can annotate custom chord shapes or intervals and read exact pitches at a glance.

## Acceptance Criteria

**Given** freeform mode is active (Pencil button toggled on in ControlBar)
**When** the user clicks (or taps) a fret-position cell on the fretboard
**Then** a cyan freeform FretDot appears at that position (toggles off if already marked)

**Given** freeform mode is active
**When** the user tabs to a fret-position cell and presses Space or Enter
**Then** the same toggle behaviour fires as a mouse click

**Given** freeform marks exist and scale/root dots are also displayed
**When** the fretboard renders
**Then** freeform dots coexist with scale/root/mode dots — freeform renders on top; neither overrides the other

**Given** freeform marks are present
**When** any state change occurs (tuning, key, scale, capo, freeform toggle)
**Then** freeform marks persist in the store (not cleared by other state changes); marks at frets below capoPosition are visually suppressed during render but remain in the store

**Given** the user sets capo=3 and has a freeform mark at fret 2
**When** the fretboard renders
**Then** the mark at fret 2 is not rendered (below capo); lowering capo to 0 reveals it again

**Given** the note-names toggle is off (default on page load)
**When** the fretboard renders
**Then** no pitch text appears inside any fret dot

**Given** the note-names toggle is on (Type button in ControlBar)
**When** the fretboard renders
**Then** the pitch name (e.g. "A", "C#") appears inside every rendered fret dot in JetBrains Mono 7–8px bold

**Given** capo=N > 0 is active and note-names are on
**When** the fretboard renders freeform marks
**Then** the freeform dot's note label shows the sounded pitch (getNoteAtFret(openNote, fret)) — consistent with scale dots

**Given** any combination of state (capo, tuning, noteNamesVisible, freeformMarks)
**When** the URL is copied and re-opened in a new tab
**Then** `?notes=1` restores noteNamesVisible=true; `?marks=fret-string,...` restores freeformMarks; both are omitted from URL when at their defaults (noteNamesVisible=false, freeformMarks empty)

## Tasks / Subtasks

- [x] Task 1: Add bounds guard and mark cap to `toggleFreeformMark` in `fretboardStore.ts`
  - [x] Guard: if `mark.fret < 0 || mark.fret > 24 || mark.string < 0 || mark.string > 5` → early return without state change
  - [x] Cap: if `!exists && state.freeformMarks.length >= 150` → early return (max 150 marks)
  - [x] Run `npm run type-check` — zero errors

- [x] Task 2: Update `FretDot.tsx` — make note name conditional; fix pointer-events on freeform ring
  - [x] Add `showNoteName?: boolean` to `FretDotProps` interface (default: caller passes false; no default value in interface so tests must pass it explicitly)
  - [x] Wrap the `<text>` element in `{showNoteName && (...)}` — text renders ONLY when `showNoteName` is true
  - [x] Add `pointerEvents="none"` (React camelCase) on the freeform ring `<circle>` (the `r={radius + 3}` one) — resolves deferred item from 1.3 CR
  - [x] Do NOT change DOT_CONFIG, GLOW_FILTER_ID, or any other styling
  - [x] Run `npm run type-check` — zero errors

- [x] Task 3: Add `calculateFreeformDots` to `fretboardUtils.ts`
  - [x] Import `FreeformMark` from `@/stores/fretboardStore` at the top of the file
  - [x] Add exported function:
    ```ts
    export function calculateFreeformDots(
      marks: FreeformMark[],
      tuningName: string,
      capoPosition = 0
    ): FretDotData[] {
      const strings = (TUNINGS as Record<string, string[]>)[tuningName] ?? TUNINGS['Standard E'];
      return marks
        .filter(m => m.fret >= capoPosition && m.fret >= 0 && m.fret <= FRET_COUNT && m.string >= 0 && m.string < STRING_COUNT)
        .map(m => ({
          fret: m.fret,
          string: m.string,
          state: 'freeform' as const,
          note: getNoteAtFret(strings[m.string], m.fret),
          cx: getDotCx(m.fret),
          cy: getDotCy(m.string),
        }));
    }
    ```
  - [x] Note: `getDotCy(stringIdx)` returns `STRING_Y[STRING_COUNT - 1 - stringIdx]` — string 0 (low E) maps to BOTTOM of SVG (y=187). The bounds filter `m.string >= 0 && m.string < STRING_COUNT` prevents out-of-range STRING_Y access (addresses deferred `getDotCy no bounds check`)
  - [x] Run `npm run type-check` — zero errors

- [x] Task 4: Update `FretboardCanvas.tsx` — freeform props, click/keyboard handling, note name passthrough
  - [x] Add new props to `FretboardCanvasProps` interface:
    ```ts
    freeformMarks?: FreeformMark[];
    freeformModeActive?: boolean;
    noteNamesVisible?: boolean;
    onFretClick?: (mark: { fret: number; string: number }) => void;
    ```
  - [x] Add import: `import { calculateFreeformDots } from '@/utils/fretboardUtils';`
  - [x] Add import: `import type { FreeformMark } from '@/stores/fretboardStore';`
  - [x] Default props in function signature: `freeformMarks = [], freeformModeActive = false, noteNamesVisible = false, onFretClick`
  - [x] Compute freeform dots in a `useMemo`:
    ```ts
    const freeformDots = useMemo(
      () => calculateFreeformDots(freeformMarks, tuning, capoPosition),
      [freeformMarks, tuning, capoPosition]
    );
    ```
  - [x] Add `freeformMarks, freeformModeActive` to `ariaLabel` useMemo dependency array only if needed (capoPosition already there — keep that; no change needed)
  - [x] Pass `showNoteName={noteNamesVisible}` to EVERY `<FretDot>` call (both `dots.map` and `freeformDots.map`)
  - [x] Render freeform dots AFTER scale dots so cyan appears on top:
    ```tsx
    {freeformDots.map(dot => (
      <FretDot
        key={`free-${dot.fret}-${dot.string}`}
        fret={dot.fret}
        string={dot.string}
        state={dot.state}
        note={dot.note}
        cx={dot.cx}
        cy={dot.cy}
        showNoteName={noteNamesVisible}
      />
    ))}
    ```
  - [x] Add hit-target rects for click/keyboard interaction. Place AFTER freeform dots (topmost SVG layer) so they capture events:
    ```tsx
    {/* Fret hit targets — enable click + keyboard freeform marking */}
    {Array.from({ length: STRING_COUNT }, (_, stringIdx) =>
      Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
        const cx = getDotCx(fret);
        const cy = getDotCy(stringIdx);
        const w = fret === 0 ? NUT_X : (getFretLineX(fret) - getFretLineX(fret - 1));
        const h = 30;
        const isBelowCapo = fret < capoPosition;
        return (
          <rect
            key={`hit-${fret}-${stringIdx}`}
            x={cx - w / 2}
            y={cy - h / 2}
            width={w}
            height={h}
            fill="transparent"
            tabIndex={freeformModeActive && !isBelowCapo ? 0 : -1}
            role={freeformModeActive && !isBelowCapo ? 'button' : undefined}
            aria-label={freeformModeActive && !isBelowCapo ? `String ${stringIdx + 1}, fret ${fret}` : undefined}
            style={{ cursor: freeformModeActive && !isBelowCapo ? 'pointer' : 'default' }}
            onClick={() => {
              if (freeformModeActive && !isBelowCapo && onFretClick) {
                onFretClick({ fret, string: stringIdx });
              }
            }}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && freeformModeActive && !isBelowCapo && onFretClick) {
                e.preventDefault();
                onFretClick({ fret, string: stringIdx });
              }
            }}
          />
        );
      })
    )}
    ```
  - [x] Run `npm run type-check` — zero errors

- [x] Task 5: Update `App.jsx` — pass new props to FretboardCanvas
  - [x] Add `freeformMarks, noteNamesVisible, freeformModeActive, toggleFreeformMark` to the `useFretboardStore()` destructure
  - [x] Pass all new props to `<FretboardCanvas>`:
    ```jsx
    <FretboardCanvas
      tuning={tuning}
      rootNote={rootNote}
      scaleName={scaleName}
      modeIndex={modeIndex}
      capoPosition={capoPosition}
      freeformMarks={freeformMarks}
      freeformModeActive={freeformModeActive}
      noteNamesVisible={noteNamesVisible}
      onFretClick={(mark) => toggleFreeformMark(mark)}
    />
    ```
  - [x] Keep `.jsx` — do NOT convert to `.tsx`
  - [x] Run `npm run type-check` — zero errors

- [x] Task 6: Update `useUrlState.ts` — add `?notes=1` and `?marks=fret-string,...` URL sync
  - [x] Add `noteNamesVisible, setNoteNamesVisible, freeformMarks, toggleFreeformMark` to the `useFretboardStore()` destructure
  - [x] Add to hydration effect (after existing params):
    ```ts
    const urlNotes = searchParams.get('notes');
    if (urlNotes === '1') setNoteNamesVisible(true);

    const urlMarks = searchParams.get('marks');
    if (urlMarks) {
      urlMarks.split(',').forEach(pair => {
        const [f, s] = pair.split('-').map(Number);
        if (Number.isInteger(f) && Number.isInteger(s) && f >= 0 && f <= 24 && s >= 0 && s <= 5) {
          toggleFreeformMark({ fret: f, string: s });
        }
      });
    }
    ```
  - [x] Update push effect to include notes and marks:
    ```ts
    if (state.noteNamesVisible) params.notes = '1';
    if (state.freeformMarks.length > 0) {
      params.marks = state.freeformMarks.map(m => `${m.fret}-${m.string}`).join(',');
    }
    ```
  - [x] Add `noteNamesVisible` and `freeformMarks` to the push effect dependency array
  - [x] Run `npm run type-check` — zero errors

- [x] Task 7: Write tests
  - [x] `fretboardStore.test.ts`
    - [x] Test: `toggleFreeformMark({ fret: -1, string: 0 })` → freeformMarks stays empty (fret below 0 rejected)
    - [x] Test: `toggleFreeformMark({ fret: 25, string: 0 })` → freeformMarks stays empty (fret above 24 rejected)
    - [x] Test: `toggleFreeformMark({ fret: 0, string: -1 })` → freeformMarks stays empty (string below 0 rejected)
    - [x] Test: `toggleFreeformMark({ fret: 0, string: 6 })` → freeformMarks stays empty (string above 5 rejected)
    - [x] Test: add 150 marks, try to add a 151st → freeformMarks.length stays 150
    - [x] Test: `toggleFreeformMark({ fret: 3, string: 2 })` twice → mark added then removed (toggle)
  - [x] `fretboardUtils.test.ts` (new file or extend existing if present)
    - [x] Test: `calculateFreeformDots([{ fret: 5, string: 1 }], 'Standard E', 0)` → returns 1 dot with state='freeform', fret=5, string=1
    - [x] Test: `calculateFreeformDots([{ fret: 2, string: 0 }], 'Standard E', 3)` → returns 0 dots (fret 2 below capo 3)
    - [x] Test: `calculateFreeformDots([{ fret: 3, string: 0 }], 'Standard E', 3)` → returns 1 dot (fret 3 = capo 3 inclusive)
    - [x] Test: `calculateFreeformDots([{ fret: -1, string: 0 }], 'Standard E', 0)` → returns 0 dots (invalid mark filtered)
    - [x] Test: `calculateFreeformDots([{ fret: 0, string: 6 }], 'Standard E', 0)` → returns 0 dots (string 6 out of bounds)
  - [x] `FretDot.test.tsx`
    - [x] Test: renders `<text>` when `showNoteName={true}` is passed
    - [x] Test: does NOT render `<text>` when `showNoteName={false}` is passed (or prop omitted)
    - [x] Test: freeform ring circle has `pointer-events="none"` attribute
  - [x] `FretboardCanvas.test.tsx`
    - [x] Test: clicking a fret hit-target rect calls `onFretClick` with correct `{ fret, string }`
    - [x] Test: click does NOT fire when `freeformModeActive=false`
    - [x] Test: clicking a hit-target at a fret below capoPosition does NOT call `onFretClick`
    - [x] Test: freeform dot appears when `freeformMarks=[{ fret: 5, string: 2 }]` is passed
    - [x] Test: freeform dot NOT rendered when mark is below capoPosition
    - [x] Test: `noteNamesVisible=true` → FretDot receives `showNoteName={true}` (check via text presence in rendered dot)
    - [x] Test: `noteNamesVisible=false` → no text inside dots
    - [x] Test: hit-target has `tabIndex=0` when `freeformModeActive=true`, `tabIndex=-1` when false
  - [x] `useUrlState.test.ts`
    - [x] Test: `?notes=1` → `noteNamesVisible` hydrates to true
    - [x] Test: no `?notes` param → `noteNamesVisible` stays false
    - [x] Test: `?marks=3-2,7-0` → `freeformMarks` contains `[{ fret: 3, string: 2 }, { fret: 7, string: 0 }]`
    - [x] Test: `?marks=25-0` → invalid fret, freeformMarks stays empty
    - [x] Test: `?marks=0-6` → invalid string, freeformMarks stays empty
    - [x] Test: setting `noteNamesVisible=true` pushes `?notes=1` to URL
    - [x] Test: setting `noteNamesVisible=false` omits `?notes` from URL
    - [x] Test: adding a freeform mark pushes `?marks=fret-string` to URL
    - [x] Test: clearing all marks omits `?marks` from URL

- [x] Task 8: Final validation
  - [x] `npm run type-check` → zero errors
  - [x] `npm run lint` → zero errors, zero warnings
  - [x] `npm test` → all tests pass (prior count + new tests, no regressions)
  - [x] `npm run dev` → visual check:
    - Toggle freeform mode → cursor changes on fret positions
    - Click a fret → cyan dot appears; click again → dot disappears
    - Freeform dot coexists with scale dots
    - Set capo=3, place freeform mark on fret 2 → mark invisible; lower capo → reappears
    - Toggle note names → pitch labels appear/disappear on all dots
    - Copy URL with marks+notes → paste in new tab → all state restored

---

## Dev Agent Record

### Completion Notes

Story 1.8 implemented 2026-05-27. All 8 tasks complete.

- **Task 1**: Added bounds guard (fret 0–24, string 0–5) and 150-mark cap to `toggleFreeformMark`. Also added `setFreeformMarks` bulk setter to support idempotent URL hydration (required to avoid React StrictMode double-invocation toggling marks off).
- **Task 2**: Added `showNoteName?` prop to `FretDotProps`, wrapped `<text>` in `{showNoteName && ...}`, added `pointerEvents="none"` to freeform ring circle.
- **Task 3**: Added `calculateFreeformDots` to `fretboardUtils.ts` with capo + bounds filtering.
- **Task 4**: Updated `FretboardCanvas.tsx` — 4 new props, freeformDots useMemo, hit-target rects (150 per string × fret), `showNoteName` passed to all FretDot calls.
- **Task 5**: Updated `App.jsx` to destructure and pass freeformMarks/freeformModeActive/noteNamesVisible/onFretClick to FretboardCanvas.
- **Task 6**: Updated `useUrlState.ts` — hydrates `?notes=1` and `?marks=fret-string,...` using `setFreeformMarks` (not toggleFreeformMark); push effect adds notes/marks to URL; new deps in dependency array.
- **Task 7**: Added 35 new tests across 5 files (fretboardStore, fretboardUtils new file, FretDot, FretboardCanvas, useUrlState). Total: 126 tests, all passing.
- **Task 8**: type-check ✅, lint ✅, all 126 tests ✅, visual check ✅ (Playwright automation confirmed all 9 visual scenarios).

**Key implementation decision**: Used `setFreeformMarks` (bulk setter) for URL hydration instead of calling `toggleFreeformMark` per mark. This prevents React StrictMode's double-invocation of effects from toggling marks off in development mode.

### File List

- `frontend/src/stores/fretboardStore.ts` — bounds guard + cap in toggleFreeformMark; new setFreeformMarks action
- `frontend/src/components/FretDot.tsx` — showNoteName prop; conditional text; pointerEvents="none" on ring
- `frontend/src/utils/fretboardUtils.ts` — FreeformMark import; calculateFreeformDots function
- `frontend/src/components/FretboardCanvas.tsx` — 4 new props; freeformDots useMemo; hit-target rects; showNoteName passthrough; getDotCy import
- `frontend/src/App.jsx` — freeform props destructured and passed to FretboardCanvas
- `frontend/src/hooks/useUrlState.ts` — notes/marks hydration and push; setFreeformMarks used for hydration
- `frontend/src/utils/fretboardUtils.test.ts` — new test file, 7 tests
- `frontend/src/stores/fretboardStore.test.ts` — 8 new bounds/cap tests
- `frontend/src/components/FretDot.test.tsx` — 4 new showNoteName/pointer-events tests
- `frontend/src/components/FretboardCanvas.test.tsx` — 10 new freeform/note-names tests
- `frontend/src/hooks/useUrlState.test.ts` — 9 new notes/marks hydration/push tests
- `_bmad-output/implementation-artifacts/deferred-work.md` — removed 4 resolved deferred items; updated getDotCy item

### Review Findings

- [x] [Review][Patch] Fret 0 exempt from capo suppression — fix `isBelowCapo` to `fret > 0 && fret < capoPosition` [FretboardCanvas.tsx]; fix `calculateFreeformDots` filter to `m.fret === 0 || m.fret >= capoPosition` [fretboardUtils.ts] — decision: open strings are never blocked by capo
- [x] [Review][Patch] `setFreeformMarks` bypasses 150-mark cap [fretboardStore.ts:61] — raw `set({ freeformMarks })` with no length guard; URL hydration validates before calling, but the exposed store action does not enforce the invariant
- [x] [Review][Patch] URL parse: token `"-"` produces `{fret:0, string:0}` [useUrlState.ts:43] — `"".split('-')` gives `["",""]`; `Number("")===0`; both pass `Number.isInteger` check; a malformed `?marks=-` URL hydrates an unintended open-string mark
- [x] [Review][Patch] `e.preventDefault()` inside `onFretClick` guard [FretboardCanvas.tsx:275] — when `freeformModeActive=true` but `onFretClick` is omitted, Space key does not call `preventDefault()`, allowing page scroll with no action; move `e.preventDefault()` outside the `onFretClick` null-check
- [x] [Review][Defer] `modeIndex` not round-tripped in URL [useUrlState.ts] — deferred, pre-existing (story 1.8 scope is notes+marks only)
- [x] [Review][Defer] Hit-target fret 0 width (`NUT_X`) may overlap fret 1 [FretboardCanvas.tsx:255] — deferred, spec-driven (story notes specify `NUT_X` as fret-0 width); geometry unverified

### Change Log

- Story 1.8 implemented: freeform marking, note names, capo suppression, URL sync (Date: 2026-05-27)

---

## Dev Notes

### What Already Exists — Do NOT Re-Create

**Store state is complete (Story 1.4):**
```ts
// fretboardStore.ts — already present, do NOT add these again
freeformMarks: FreeformMark[]   // default []
noteNamesVisible: boolean        // default false
freeformModeActive: boolean      // default false
toggleFreeformMark: (mark) => ...  // toggle logic already written — only add guard/cap
setNoteNamesVisible: (v) => ...
setFreeformModeActive: (v) => ...
```

**ControlBar toggle buttons are already wired (Story 1.5):**
```tsx
// ControlBar.tsx — buttons already exist and functional; DO NOT TOUCH
<button onClick={() => setNoteNamesVisible(!noteNamesVisible)} ...>
  <Type size={16} />
</button>
<button onClick={() => setFreeformModeActive(!freeformModeActive)} ...>
  <Pencil size={16} />
</button>
```

**FretDot already has freeform state (Story 1.3):**
```tsx
// FretDot.tsx DOT_CONFIG — already exists, DO NOT change
freeform: { radius: 11, fill: '#22d3ee', opacity: 0.8, textColor: '#001520' }
```
The freeform ring (`r={radius + 3}`, dashed cyan stroke) already renders — just needs `pointerEvents="none"` added and the `<text>` wrapped in `{showNoteName && ...}`.

**FretboardCanvas already has `capoPosition` prop (Story 1.7).**

**`calculateFretboardDots` already skips frets below capo (Story 1.7):**
```ts
// fretboardUtils.ts line 105 — do NOT change
if (fret < capoPosition) continue;
```
`calculateFreeformDots` (new function) must replicate this filter with `.filter(m => m.fret >= capoPosition ...)`.

### FretboardCanvas stays presentational — no direct store reads

FretboardCanvas currently does NOT import `useFretboardStore`. Keep it that way. All new state comes as props from `App.jsx`. The click action is delegated back via `onFretClick` callback. This preserves testability (tests mock props, not store).

### Hit Target Rect Geometry

Each fret position has a transparent `<rect>` for click/keyboard capture. Approximate sizing:
- **Width**: For fret n (1–24) → `getFretLineX(n) - getFretLineX(n - 1)`. For open (fret 0) → `NUT_X` (full left column). These vary with logarithmic fret spacing (wider at low frets, narrower at high frets).
- **Height**: Fixed 30px centered on `getDotCy(stringIdx)` (string rows are 33px apart — 30px gives 1.5px gap)
- **Transparent fill**: `fill="transparent"` (not `fill="none"` — "none" doesn't capture pointer events)
- **Layer**: Place hit rects LAST in SVG (topmost) so they receive all mouse events

Hit rects at `fret < capoPosition` set `tabIndex={-1}` and no `role` — they are unreachable and ignore clicks.

### freeformDots render after scale dots

SVG z-ordering is DOM order. Freeform dots render AFTER `{dots.map(...)}` so cyan overlaps scale/root/mode dots at the same position. Key: use `key={`free-${dot.fret}-${dot.string}`}` to avoid React key collisions with scale dot keys (`key={`${dot.fret}-${dot.string}`}`).

### URL Encoding for Marks

Format: `?marks=fret-string,fret-string,...`
- Example: 3 marks → `?marks=3-2,7-0,12-4`
- Max: 150 marks × ~5 chars each = ~750 chars + separators → ≈900 chars total — safe for URL
- Hydration splits on `,` then `-`: `urlMarks.split(',').forEach(pair => { const [f, s] = pair.split('-').map(Number); ... })`
- Validation: `Number.isInteger(f) && Number.isInteger(s) && f >= 0 && f <= 24 && s >= 0 && s <= 5`
- `toggleFreeformMark` is called once per mark during hydration — the toggle logic (add if not present) handles this correctly since store starts empty

### Note name for freeform dots

`calculateFreeformDots` computes `note: getNoteAtFret(strings[m.string], m.fret)`. This gives the **sounded pitch at that fret on that string** relative to the tuning — same computation as scale dots. When `capoPosition > 0`, the note at fret < capo is already filtered, so all rendered freeform dots show the pitch the guitarist actually hears.

`strings[m.string]` — string index 0 in `TUNINGS['Standard E']` is `'E'` (low E / thickest / bottom of SVG). String index 5 is `'e'` (high e / thinnest / top of SVG). `getDotCy(stringIdx)` maps string 0 → y=187 (bottom), string 5 → y=22 (top).

### fretboardStore.ts — exact toggleFreeformMark after Task 1

```ts
toggleFreeformMark: (mark) =>
  set((state) => {
    if (mark.fret < 0 || mark.fret > 24 || mark.string < 0 || mark.string > 5) return state;
    const exists = state.freeformMarks.some(
      (m) => m.fret === mark.fret && m.string === mark.string
    );
    if (!exists && state.freeformMarks.length >= 150) return state;
    return {
      freeformMarks: exists
        ? state.freeformMarks.filter(
            (m) => !(m.fret === mark.fret && m.string === mark.string)
          )
        : [...state.freeformMarks, mark],
    };
  }),
```

### FretDot.tsx — exact changes for Task 2

```tsx
// Interface — add one field
export interface FretDotProps {
  fret: number;
  string: number;
  state: DotState;
  note: string;
  cx: number;
  cy: number;
  showNoteName?: boolean;  // ← ADD
}

// Function signature — add prop
export default function FretDot({ fret, string: stringIdx, state, note, cx, cy, showNoteName }: FretDotProps) {

// Freeform ring — ADD pointerEvents="none"
{state === 'freeform' && (
  <circle
    cx={cx}
    cy={cy}
    r={radius + 3}
    fill="none"
    stroke={fill}
    strokeWidth={1.5}
    strokeDasharray="4 3"
    opacity={opacity}
    pointerEvents="none"   // ← ADD
  />
)}

// Text — WRAP in conditional
{showNoteName && (
  <text
    x={cx}
    y={cy}
    textAnchor="middle"
    dominantBaseline="middle"
    fontFamily="var(--font-mono, 'JetBrains Mono Variable', monospace)"
    fontSize={note.length > 1 ? 7 : 8}
    fontWeight="700"
    fill={textColor}
    style={{ pointerEvents: 'none', userSelect: 'none' }}
  >
    {note}
  </text>
)}
```

### Existing test counts

Prior to Story 1.8: 91 tests total (73 from 1.1–1.6 + 6 capo URL tests from 1.7 CR + 12 other capo tests — see sprint-1-progress memory for exact breakdown). Expect Story 1.8 to add ~30 new tests.

### Deferred items resolved by this story

From `deferred-work.md`:
- `toggleFreeformMark` no bounds validation → **resolved Task 1**
- `freeformMarks` unbounded array → **resolved Task 1** (150-mark cap)
- Freeform ring `pointer-events="none"` → **resolved Task 2**
- `freeformMarks at frets below capo persist` → **resolved by render-time filter in calculateFreeformDots (Task 3)**; marks stay in store (correct), they simply don't render
- `getDotCy no bounds check` → **partially resolved**: `calculateFreeformDots` bounds-checks stringIdx before calling `getDotCy`, preventing out-of-range access for freeform marks specifically

After completing this story, remove the above five items from `deferred-work.md`.

### Architecture Guardrails — Do Not Violate

- `frontend/src/data/*.js` — do NOT touch (musicTheory.js, tunings.js, scales.js)
- `src/components/ui/` — do NOT hand-edit shadcn files
- Tailwind v4: CSS-only via `@theme` in index.css — no tailwind.config.js
- `App.jsx` stays `.jsx` — do NOT convert to `.tsx`
- `FretboardCanvas.tsx` stays `.tsx` — do NOT convert to `.jsx`
- ESLint covers `.ts/.tsx` only; `.jsx` excluded by design
- `@/` alias = `frontend/src/`

### Import for calculateFreeformDots in fretboardUtils.ts

`fretboardUtils.ts` already imports from `@/data/tunings.js` (TUNINGS) and `@/utils/musicTheory.js` (getNoteAtFret, etc.). The new `calculateFreeformDots` function needs `FreeformMark` from `@/stores/fretboardStore`. This creates a cross-module import (utils → store). This is acceptable: utils does not import any React hooks or store state, only the TypeScript type.

If the TypeScript compiler has issues with this import, use `import type { FreeformMark } from '@/stores/fretboardStore'` (type-only import, erased at runtime, no circular dependency concern).
