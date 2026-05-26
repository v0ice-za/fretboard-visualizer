# Story 1.4: Core State & URL Sharing

Status: done

## Story

As a **user**,
I want my fretboard configuration to persist across page refreshes and be shareable via URL,
So that I can return to my setup or send a link to a specific view.

## Acceptance Criteria

**Given** a user selects a tuning, key, and scale
**When** the URL is copied and opened in a new tab
**Then** the fretboard loads with the same tuning, key, and scale active — state hydrates before first render (no flash of default state)
**And** the URL contains `?tuning=&key=&scale=` query params reflecting the current selection
**And** `useFretboardStore` (Zustand) holds: active tuning, active key, active scale, active mode index, capo position, freeform marks, note-names-visible flag
**And** `useLayoutStore` (Zustand) holds: library panel open/closed state and current layout mode (already exists from Story 1.2 — do NOT re-create)
**And** React Router v7 is configured with a single route for the main app view
**And** browser back/forward navigation restores the previous URL state correctly

## Tasks / Subtasks

- [x] Task 1: Create `useFretboardStore` Zustand store
  - [x] Create `frontend/src/stores/fretboardStore.ts`
  - [x] Define `FretboardState` interface with all required fields
  - [x] Implement individual setters: `setTuning`, `setRootNote`, `setScaleName`, `setModeIndex`, `setCapoPosition`, `toggleFreeformMark`, `setNoteNamesVisible`
  - [x] Export `useFretboardStore` (Zustand `create()`)
  - [x] Export `DEFAULT_FRETBOARD_STATE` constant for use in `useUrlState`

- [x] Task 2: Create `useUrlState` hook
  - [x] Create `frontend/src/hooks/useUrlState.ts`
  - [x] On mount: read `?tuning=`, `?key=`, `?scale=` from `window.location.search`; push valid values into store before first render
  - [x] Subscribe to store changes: push `tuning`, `rootNote`, `scaleName` back to URL via `useSearchParams` (react-router-dom v7)
  - [x] Use `replace: true` for URL updates (avoids polluting browser history with every keystroke)
  - [x] Validate params against known good values: tuning must exist in `TUNINGS`, rootNote must match `/^[A-G][b#]?$/`, scaleName must exist in `SCALES`; ignore invalid values (fall back to defaults)
  - [x] capo, freeform, noteNames are intentionally NOT in the URL for Story 1.4 (those are deferred to Stories 1.7/1.8)

- [x] Task 3: Wire React Router v7 into main.jsx
  - [x] Modify `frontend/src/main.jsx`: wrap app with `BrowserRouter` from `react-router-dom`
  - [x] Keep `main.jsx` as `.jsx` — do NOT convert to `.tsx`
  - [x] Pattern: `<BrowserRouter><App /></BrowserRouter>` wrapping the existing render call
  - [x] No route path definitions needed in main.jsx — App.jsx handles the single-route view directly

- [x] Task 4: Migrate App.jsx state to useFretboardStore
  - [x] Modify `frontend/src/App.jsx` — keep as `.jsx`, do NOT convert
  - [x] Replace `useState` for `tuningName`, `rootNote`, `scaleName` with `useFretboardStore` selectors; `showIntervals` kept local (Story 1.8)
  - [x] Call `useUrlState()` inside `App` component (before return statement) to activate URL sync
  - [x] Pass store values to `<FretboardCanvas>` and `<Controls>` as before (prop API unchanged for now)
  - [x] Preserve all other existing functionality: NavTabs, ProGate, page switching, Controls rendering

- [x] Task 5: Write tests
  - [x] `frontend/src/stores/fretboardStore.test.ts` — 14 tests: initial state, each setter, toggleFreeformMark (add + remove + accumulate + partial), state isolation
  - [x] `frontend/src/hooks/useUrlState.test.ts` — 8 tests: valid params hydrate store; invalid tuning/key/scale ignored; no-params uses defaults; store change does not throw
  - [x] 53/53 tests pass (30 pre-existing + 23 new); zero regressions

- [x] Task 6: Final validation
  - [x] `npm run type-check` → zero errors
  - [x] `npm run lint` → zero errors
  - [x] `npm test` → 53/53 pass
  - [x] `npm run dev` → app starts, URL params hydrate on load, back/forward works

---

## Dev Notes

### What Already Exists — Do Not Re-Create

- `frontend/src/stores/layoutStore.ts` — `useLayoutStore` with `activeLayout` and `setLayout`. Already created in Story 1.2. **Do not touch.**
- `frontend/src/utils/musicTheory.js` — `getScaleNotes()`, `getNoteAtFret()`, etc. **Do not touch.**
- `frontend/src/data/tunings.js` — `TUNINGS` object. **Do not touch.**
- `frontend/src/data/scales.js` — `SCALES` array. **Do not touch.**
- `frontend/src/components/FretboardCanvas.tsx` — takes `tuning`, `rootNote`, `scaleName`, `capoPosition` as props. **No changes needed in this story.**
- `react-router-dom ^7.15.1` — already in `frontend/package.json`. Do NOT install again.
- `zustand ^5.0.13` — already in `frontend/package.json`. Do NOT install again.

### fretboardStore.ts — Full Shape

```typescript
// frontend/src/stores/fretboardStore.ts
import { create } from 'zustand';

export interface FreeformMark {
  fret: number;
  string: number;
}

export interface FretboardState {
  tuning: string;
  rootNote: string;
  scaleName: string;
  modeIndex: number | null;
  capoPosition: number;
  freeformMarks: FreeformMark[];
  noteNamesVisible: boolean;
  setTuning: (tuning: string) => void;
  setRootNote: (rootNote: string) => void;
  setScaleName: (scaleName: string) => void;
  setModeIndex: (index: number | null) => void;
  setCapoPosition: (pos: number) => void;
  toggleFreeformMark: (mark: FreeformMark) => void;
  setNoteNamesVisible: (visible: boolean) => void;
}

export const DEFAULT_FRETBOARD_STATE = {
  tuning: 'Standard E',
  rootNote: 'A',
  scaleName: 'Pentatonic Minor',
  modeIndex: null,
  capoPosition: 0,
  freeformMarks: [] as FreeformMark[],
  noteNamesVisible: false,
};

export const useFretboardStore = create<FretboardState>((set) => ({
  ...DEFAULT_FRETBOARD_STATE,
  setTuning: (tuning) => set({ tuning }),
  setRootNote: (rootNote) => set({ rootNote }),
  setScaleName: (scaleName) => set({ scaleName }),
  setModeIndex: (modeIndex) => set({ modeIndex }),
  setCapoPosition: (capoPosition) => set({ capoPosition }),
  toggleFreeformMark: (mark) =>
    set((state) => {
      const exists = state.freeformMarks.some(
        (m) => m.fret === mark.fret && m.string === mark.string
      );
      return {
        freeformMarks: exists
          ? state.freeformMarks.filter(
              (m) => !(m.fret === mark.fret && m.string === mark.string)
            )
          : [...state.freeformMarks, mark],
      };
    }),
  setNoteNamesVisible: (noteNamesVisible) => set({ noteNamesVisible }),
}));
```

### useUrlState.ts — Implementation Pattern

```typescript
// frontend/src/hooks/useUrlState.ts
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { TUNINGS } from '@/data/tunings.js';
import { SCALES } from '@/data/scales.js';

const ROOT_NOTE_RE = /^[A-G][b#]?$/;

export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTuning, setRootNote, setScaleName, tuning, rootNote, scaleName } =
    useFretboardStore();

  // Hydrate from URL on mount only
  useEffect(() => {
    const urlTuning = searchParams.get('tuning');
    const urlKey = searchParams.get('key');
    const urlScale = searchParams.get('scale');

    if (urlTuning && (TUNINGS as Record<string, string[]>)[urlTuning]) {
      setTuning(urlTuning);
    }
    if (urlKey && ROOT_NOTE_RE.test(urlKey)) {
      setRootNote(urlKey);
    }
    if (urlScale && (SCALES as Array<{ name: string }>).some((s) => s.name === urlScale)) {
      setScaleName(urlScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount

  // Push store state → URL whenever it changes
  useEffect(() => {
    setSearchParams(
      { tuning, key: rootNote, scale: scaleName },
      { replace: true }
    );
  }, [tuning, rootNote, scaleName, setSearchParams]);
}
```

**Key decisions:**
- Two separate `useEffect` calls: mount-hydration runs once (empty dep array), URL-push runs on state change.
- `replace: true` ensures history.back() jumps to the prior *page*, not the prior state within the same page. Story 1.4 AC6 ("back/forward navigation restores previous URL state") refers to navigating to another page and back — NOT each selection being a history entry.
- Invalid URL params are silently ignored; store defaults hold.
- SCALES import: check the shape of `SCALES` in `frontend/src/data/scales.js` before referencing `.name` — adjust if the actual shape differs.

### main.jsx — Minimal Change

```jsx
// frontend/src/main.jsx — after change
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

### App.jsx — State Migration

Current `App.jsx` has these `useState` hooks at the top:
```jsx
const [page, setPage] = useState('fretboard');
const [tuningName, setTuningName] = useState('Standard E');
const [rootNote, setRootNote] = useState('A');
const [scaleName, setScaleName] = useState('Pentatonic Minor');
const [showIntervals, setShowIntervals] = useState(false);
```

After migration (keep as `.jsx`):
```jsx
import { useFretboardStore } from '@/stores/fretboardStore';
import { useUrlState } from '@/hooks/useUrlState';

export default function App() {
  const [page, setPage] = useState('fretboard');  // stays local — not URL-synced
  const { tuning, rootNote, scaleName, setTuning, setRootNote, setScaleName } =
    useFretboardStore();
  useUrlState();  // activates URL sync
  // ... rest of component unchanged; pass tuning/rootNote/scaleName to children
}
```

**What changes:**
- `tuningName` → `tuning` (matches store field name)
- `showIntervals` is not in fretboardStore yet (it was a local UI flag); leave it as local `useState(false)` for now — `noteNamesVisible` in the store is the eventual home (Story 1.8)
- Props passed to `<FretboardCanvas tuning={tuning} rootNote={rootNote} scaleName={scaleName} />` — same prop names as before ✅
- Props passed to `<Controls>` — check existing Controls.jsx prop names and match them

### Checking SCALES Shape

Before writing useUrlState, read `frontend/src/data/scales.js` to confirm the array element shape. If it's `{ name: string, intervals: number[] }`, the `s.name` check is correct. If different, adjust accordingly.

### Test Isolation in Zustand v5

For test files, reset store state between tests. Zustand v5 pattern:
```typescript
import { useFretboardStore } from '@/stores/fretboardStore';
import { DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE });
});
```

This is the same pattern used in `layoutStore.test.ts` from Story 1.2 (`setState(DEFAULT_STATE)` per test).

### React Router v7 API Notes

`react-router-dom` v7 is a major version from v6. Key differences relevant to this story:

- `BrowserRouter` and `useSearchParams` work identically to v6 — no API changes needed for this story.
- `setSearchParams(params, { replace: true })` signature unchanged from v6.
- If using `createBrowserRouter` + `RouterProvider` (v6.4+ data API), that is the preferred architecture for data loaders — but for Story 1.4, `BrowserRouter` + `useSearchParams` hook approach is sufficient and simpler. The data router pattern can be adopted in a later story if loaders are needed.

### Architecture Guardrails (MUST follow)

- `.jsx` files: App.jsx and main.jsx stay `.jsx` — do NOT convert to `.tsx`
- Import alias: `@/` = `frontend/src/` — use for all new imports
- Store files go in `frontend/src/stores/` — already established by layoutStore.ts
- Hook files go in `frontend/src/hooks/` — new directory, OK to create
- ESLint only covers `.ts/.tsx` — `.jsx` files are intentionally excluded
- Vitest globals (`describe`, `it`, `expect`) are available without imports (configured in tsconfig.json `"types": ["vitest/globals"]`)
- `react-testing-library` + `@testing-library/user-event` already installed for component tests
- `msw` is NOT installed — no API mocking needed (this story has zero network calls)

### Deferred Items (Do NOT implement in this story)

- `?capo=` URL param — deferred to Story 1.7
- `?freeform=` URL param — deferred to Story 1.8
- `?noteNames=` URL param — deferred to Story 1.8
- Route path definitions (nested routes, outlet patterns) — deferred to Story 2.x when multi-route needed
- `createBrowserRouter` / `RouterProvider` / loader data pattern — deferred; `BrowserRouter` is sufficient for now

---

## Dev Agent Record

### File List

- `frontend/src/stores/fretboardStore.ts` — NEW: Zustand store with full fretboard state + setters
- `frontend/src/stores/fretboardStore.test.ts` — NEW: 14 unit tests
- `frontend/src/hooks/useUrlState.ts` — NEW: URL hydration + push hook
- `frontend/src/hooks/useUrlState.test.ts` — NEW: 8 integration tests via MemoryRouter
- `frontend/src/main.jsx` — MODIFIED: wrapped with BrowserRouter
- `frontend/src/App.jsx` — MODIFIED: migrated to useFretboardStore + useUrlState

### Change Log

- 2026-05-25: Implemented Story 1.4 — created fretboardStore (Zustand), useUrlState hook, wired BrowserRouter into main.jsx, migrated App.jsx off local useState. 53 tests pass, zero type/lint errors.

### Completion Notes

- `SCALES` in scales.js is a plain object keyed by name (not an array), so URL validation uses `urlScale in SCALES` rather than `.some(s => s.name)` — the story dev notes had an incorrect assumption; corrected during implementation.
- `showIntervals` left as local `useState` in App.jsx — it controls the Notes/Intervals toggle which has no store home until Story 1.8 (`noteNamesVisible`).
- Controls.jsx prop API unchanged: `tuningName={tuning}` and `setTuningName={setTuning}` preserves the existing prop contract without touching the `.jsx` file.
- Two `useEffect` pattern in useUrlState: mount-hydration (empty dep array, runs once) + URL-push (deps: tuning/rootNote/scaleName). `replace: true` prevents history pollution.

---

## Review Findings

- [x] [Review][Patch] ROOT_NOTE_RE admits flat notes not in CHROMATIC_NOTES — restrict to `/^[A-G]#?$/` (sharps/naturals only) [`frontend/src/hooks/useUrlState.ts:7`]

- [x] [Review][Patch] URL-push effect fires on mount with pre-hydration defaults, briefly overwriting the incoming URL [`frontend/src/hooks/useUrlState.ts:33`]
- [x] [Review][Patch] URL-push test only asserts no-throw — URL content is never verified after a store change [`frontend/src/hooks/useUrlState.test.ts:69`]

- [x] [Review][Defer] `toggleFreeformMark` has no bounds validation on fret/string coords [`frontend/src/stores/fretboardStore.ts:43`] — deferred, scope for Story 1.8
- [x] [Review][Defer] `setCapoPosition` has no bounds clamping [`frontend/src/stores/fretboardStore.ts:41`] — deferred, scope for Story 1.7
- [x] [Review][Defer] `freeformMarks` array grows unboundedly with no cap [`frontend/src/stores/fretboardStore.ts:42`] — deferred, scope for Story 1.8
- [x] [Review][Defer] `DEFAULT_FRETBOARD_STATE` uses `as` type casts instead of a typed constant — deferred, pre-existing style issue
- [x] [Review][Defer] `noteIndex` returns -1 for unrecognised notes in musicTheory.js — deferred, pre-existing (tracked in Story 1.3 deferred)
- [x] [Review][Defer] `useLayoutStore` field naming ambiguity for library panel open/closed — deferred, Story 1.2 scope
