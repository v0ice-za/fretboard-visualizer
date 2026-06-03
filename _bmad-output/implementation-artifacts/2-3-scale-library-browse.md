# Story 2.3: Scale Library Browse

Status: done

## Dev Context
- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **user**,
I want to browse scales in the library panel to discover and select them,
so that I can explore the fretboard with different scales without leaving the panel.

## Acceptance Criteria

**AC1** — Given the Scale Library tab is open,
When the user views the scale list,
Then the first 5 scales (`SCALE_NAMES.slice(0, 5)`) render as `preview` LibraryItems (selectable, "Preview" badge visible), and all remaining scales render as `locked` LibraryItems (muted + lock Badge, `aria-disabled="true"`).

**AC2** — Given a `preview` LibraryItem in the scale list,
When the user clicks it,
Then it activates (indigo tint + checkmark), `useFretboardStore.scaleName` updates to that scale name, and the fretboard re-renders with the new scale (instant, no spinner).

**AC3** — Given the active scale in `useFretboardStore` matches a scale in the list (set via ControlBar or panel),
When the user views the scale list,
Then that scale renders as `active` (indigo tint + checkmark) — even if it falls outside the free-tier preview set.

**AC4** — Given a `locked` LibraryItem in the scale list,
When the user clicks it,
Then `PaywallCard` opens anchored to that item (desktop) or inline (mobile) — identical behaviour to Story 2.2.

**AC5** — Given the `active` variant takes priority,
When a scale is both "in the free tier" and "currently active",
Then it renders as `active` (not `preview`).

## Tasks / Subtasks

- [x] Task 1: Create `ScaleLibrary` component (AC: 1, 2, 3, 4, 5)
  - [x] New file: `frontend/src/features/library/ScaleLibrary.tsx`
  - [x] Import `SCALE_NAMES` from `@/data/scales.js` (NOT TypeScript — keep as `.js`, cast with `as string[]`)
  - [x] Import `useFretboardStore` for `scaleName` + `setScaleName`
  - [x] Define module-level constant: `const FREE_SCALE_NAMES = new Set((SCALE_NAMES as string[]).slice(0, 5))`
  - [x] Props: `interface ScaleLibraryProps { onPaywallTrigger: (el: HTMLElement) => void }`
  - [x] Render all scales: `(SCALE_NAMES as string[]).map((name) => ...)`
  - [x] Variant logic (priority order): `name === scaleName → 'active'`; `FREE_SCALE_NAMES.has(name) → 'preview'`; else `'locked'`
  - [x] `onSelect`: always `() => setScaleName(name)` — LibraryItem only calls it for non-locked variants
  - [x] `onPaywallTrigger`: pass through to LibraryItem
  - [x] Wrap in `<div className="flex flex-col gap-1">` — matches existing tabContent inner wrapper

- [x] Task 2: Update `LibraryPanel` to use `ScaleLibrary` (AC: 1–5)
  - [x] Remove `SCALE_DEMOS` constant and its `LibraryItemVariant` import dependency
  - [x] Import `ScaleLibrary` from `./ScaleLibrary`
  - [x] In `tabContent`, replace the SCALE_DEMOS map with `<ScaleLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />`
  - [x] Keep `CHORD_DEMOS` as-is — replaced in Story 2.4
  - [x] The outer `<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">` wrapping both tabs remains; ScaleLibrary's inner `flex-col gap-1` is its own wrapper — REMOVE the inner gap-1 div from LibraryPanel for scale tab since ScaleLibrary provides its own wrapper; simplify to: `{activeTab === 'scale' ? <ScaleLibrary ... /> : CHORD_DEMOS.map(...)}`
  - [x] Ensure `LibraryItemVariant` import is still needed for `CHORD_DEMOS`; keep it if so, remove if CHORD_DEMOS uses inline type

- [x] Task 3: Tests for `ScaleLibrary` (AC: 1–5)
  - [x] New file: `frontend/src/features/library/ScaleLibrary.test.tsx`
  - [x] Reset stores in `beforeEach`: `useFretboardStore.setState({ scaleName: DEFAULT_FRETBOARD_STATE.scaleName })`
  - [x] Test: all 31 scale names rendered — check `SCALE_NAMES.length` items with `role="option"` exist
  - [x] Test: first 5 scales are `preview` — each has text "Preview" visible
  - [x] Test: 6th scale (SCALE_NAMES[5]) is `locked` — has `aria-disabled="true"`
  - [x] Test: active scale overrides locked — set `useFretboardStore.setState({ scaleName: SCALE_NAMES[10] })`, render, confirm that item has `aria-selected="true"`
  - [x] Test: active scale overrides preview — set `useFretboardStore.setState({ scaleName: SCALE_NAMES[0] })`, render, confirm first item has `aria-selected="true"` (not "Preview" badge)
  - [x] Test: clicking a preview item calls `setScaleName` — spy via store state check after click
  - [x] Test: clicking a locked item calls `onPaywallTrigger` — pass mock fn, click locked item, expect called

- [x] Task 4: Update `LibraryPanel.test.tsx` (regression guard)
  - [x] Add `useFretboardStore` import + reset in `beforeEach`: `useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })`
  - [x] Import `DEFAULT_FRETBOARD_STATE` from `@/stores/fretboardStore`
  - [x] Existing paywall tests still pass with real scale data (locked item is now the 6th real scale — `aria-disabled="true"` query still finds it)
  - [x] No test removals required — all 8 existing tests remain valid

- [x] Task 5: Final validation
  - [x] `npm run type-check` → zero errors
  - [x] `npm run lint` → zero errors
  - [x] `npm test` → all pass, no regressions (160 tests passing)

### Review Findings (AI — 2026-05-31)

No findings specific to Story 2.3 code. ScaleLibrary is clean; `role="option"` ARIA issue originates in LibraryItem (Story 2.2) — tracked there. See 2-2 story file for full review findings and follow-ups.

---

## Dev Notes

### What already exists — DO NOT re-create

```
frontend/src/
  data/scales.js                   — SCALE_NAMES (string[]), SCALES (object), SCALE_CATEGORIES; do NOT modify or convert to TS
  data/tunings.js                  — do NOT touch
  data/musicTheory.js              — do NOT touch
  stores/fretboardStore.ts         — useFretboardStore: scaleName (string), setScaleName(name: string)
  stores/subscriptionStore.ts      — useSubscriptionStore: isPremium (bool)
  features/library/LibraryItem.tsx — all 4 variants implemented; use as-is
  features/library/LibraryPanel.tsx — tabContent currently shows SCALE_DEMOS placeholder; Task 2 replaces it
  features/library/LibraryPanel.test.tsx — 8 tests; Task 4 adds store reset only, no structural changes
  components/shared/PaywallCard.tsx — PaywallCard already wired in LibraryPanel; no changes needed
  components/ui/badge.tsx          — shadcn generated; do NOT edit
```

### Current `LibraryPanel.tsx` tabContent — what changes in Task 2

**Before (Story 2.2 state):**
```tsx
const SCALE_DEMOS: Array<{ title: string; variant: LibraryItemVariant }> = [
  { title: 'A Natural Minor', variant: 'active' },
  { title: 'D Dorian', variant: 'preview' },
  { title: 'G Harmonic Minor', variant: 'locked' },
]
// ...
const tabContent = (
  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
    {(activeTab === 'scale' ? SCALE_DEMOS : CHORD_DEMOS).map((item) => (
      <LibraryItem key={item.title} title={item.title} variant={item.variant}
        onSelect={() => {}} onPaywallTrigger={(el) => setPaywallAnchor(el)} />
    ))}
  </div>
)
```

**After (Story 2.3 target):**
```tsx
// SCALE_DEMOS constant removed; CHORD_DEMOS kept for Story 2.4
const tabContent = (
  <div className="flex-1 overflow-y-auto p-4">
    {activeTab === 'scale'
      ? <ScaleLibrary onPaywallTrigger={(el) => setPaywallAnchor(el)} />
      : <div className="flex flex-col gap-1">
          {CHORD_DEMOS.map((item) => (
            <LibraryItem key={item.title} title={item.title} variant={item.variant}
              onSelect={() => {}} onPaywallTrigger={(el) => setPaywallAnchor(el)} />
          ))}
        </div>
    }
  </div>
)
```

Note: `ScaleLibrary` provides its own `flex flex-col gap-1` wrapper div, so the outer div no longer needs `flex flex-col gap-1` — it just needs `flex-1 overflow-y-auto p-4` for scroll.

### `ScaleLibrary` component — exact structure

```tsx
// frontend/src/features/library/ScaleLibrary.tsx
import { SCALE_NAMES } from '@/data/scales.js'
import { useFretboardStore } from '@/stores/fretboardStore'
import LibraryItem from './LibraryItem'

const FREE_SCALE_NAMES = new Set((SCALE_NAMES as string[]).slice(0, 5))

interface ScaleLibraryProps {
  onPaywallTrigger: (el: HTMLElement) => void
}

export default function ScaleLibrary({ onPaywallTrigger }: ScaleLibraryProps) {
  const { scaleName, setScaleName } = useFretboardStore()

  return (
    <div className="flex flex-col gap-1">
      {(SCALE_NAMES as string[]).map((name) => {
        const variant = name === scaleName
          ? 'active'
          : FREE_SCALE_NAMES.has(name)
          ? 'preview'
          : 'locked'

        return (
          <LibraryItem
            key={name}
            title={name}
            variant={variant}
            onSelect={() => setScaleName(name)}
            onPaywallTrigger={onPaywallTrigger}
          />
        )
      })}
    </div>
  )
}
```

### Free-tier scales (first 5 from SCALE_NAMES)

`SCALE_NAMES` order from `scales.js` (insertion order of SCALES object):
1. `'Major (Ionian)'`
2. `'Dorian'`
3. `'Phrygian'`
4. `'Lydian'`
5. `'Mixolydian'`
— first 5 → `preview`
6. `'Natural Minor (Aeolian)'` — first locked scale
7. `'Locrian'`
8. `'Pentatonic Major'`
9. `'Pentatonic Minor'` ← default fretboard scale (shows as `active`, not `locked`, when selected)
... (22 more locked)

**IMPORTANT:** The default `scaleName` in `fretboardStore` is `'Pentatonic Minor'` (index 8). It is NOT in the free tier preview set. When the panel opens, it shows as `active` because the variant priority check (`name === scaleName`) runs first. This is intentional — the fretboard always shows the correct active scale; the library only restricts *browsing selection* to the free tier.

### Type-casting pattern (existing codebase convention)

From ControlBar.tsx (already established pattern):
```tsx
import { SCALES, SCALE_NAMES, SCALE_CATEGORIES } from '@/data/scales.js'
// Cast when needed:
(SCALE_NAMES as string[]).filter(...)
(SCALES as Record<string, { category: string }>)[n].category
```

Use the same casts in ScaleLibrary. No TypeScript errors should result.

### Test patterns from Story 2.2

**Store reset (must do in beforeEach for ScaleLibrary tests):**
```tsx
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { SCALE_NAMES } from '@/data/scales.js'

beforeEach(() => {
  useFretboardStore.setState({ scaleName: DEFAULT_FRETBOARD_STATE.scaleName })
})
```

**Testing "active overrides locked" (scale at index 10, outside free tier):**
```tsx
it('active scale overrides locked status', () => {
  const lockedScale = (SCALE_NAMES as string[])[10] // 'Pentatonic Minor' or similar
  useFretboardStore.setState({ scaleName: lockedScale })
  render(<ScaleLibrary onPaywallTrigger={() => {}} />)
  const activeBtn = screen.getByRole('option', { name: lockedScale })
  expect(activeBtn).toHaveAttribute('aria-selected', 'true')
})
```

**Testing "clicking preview sets scale":**
```tsx
it('clicking preview scale updates fretboardStore.scaleName', async () => {
  const user = userEvent.setup()
  const previewScale = (SCALE_NAMES as string[])[0] // 'Major (Ionian)'
  render(<ScaleLibrary onPaywallTrigger={() => {}} />)
  await user.click(screen.getByRole('option', { name: previewScale }))
  expect(useFretboardStore.getState().scaleName).toBe(previewScale)
})
```

### Regression risk: existing LibraryPanel tests

After Story 2.3, the existing test `'clicking locked LibraryItem shows PaywallCard'` in LibraryPanel.test.tsx will still pass:
- `aside.querySelector('button[aria-disabled="true"]')` now finds the 6th scale (`'Natural Minor (Aeolian)'`)
- Clicking it triggers `onPaywallTrigger` → PaywallCard opens
- No test change required; just add `useFretboardStore` reset to `beforeEach`

The `'switching tabs closes PaywallCard'` test also still passes for the same reason.

### Architecture guardrails

- `ScaleLibrary.tsx` → `frontend/src/features/library/` (library domain component)
- Do NOT add subscription logic to `ScaleLibrary` — `useSubscriptionStore.isPremium` is not read here; the free-tier split is static (first 5 scales), not dynamic in this story
- Do NOT call any API endpoint — all scales are local data from `scales.js`; no server fetch
- Do NOT modify `scales.js`, `tunings.js`, or `musicTheory.js`
- Do NOT modify `LibraryItem.tsx` — it already supports all 4 variants
- Do NOT modify `PaywallCard.tsx` — already integrated in LibraryPanel

### File list for this story

**New files:**
- `frontend/src/features/library/ScaleLibrary.tsx`
- `frontend/src/features/library/ScaleLibrary.test.tsx`

**Modified files:**
- `frontend/src/features/library/LibraryPanel.tsx` — replace SCALE_DEMOS with `<ScaleLibrary>`
- `frontend/src/features/library/LibraryPanel.test.tsx` — add fretboardStore reset to beforeEach

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Test matcher fix: `byTitle` initially used `n.startsWith(name)` — failed because "Phrygian Dominant" starts with "Phrygian". Fixed to `n === name || n === name + 'Preview'` (exact match on the two possible accessible name forms: bare name for active/locked, name+"Preview" for preview badge).

### Completion Notes List

- `ScaleLibrary.tsx` created per spec; variant priority (active → preview → locked) implemented exactly.
- `LibraryPanel.tsx` updated: SCALE_DEMOS removed, ScaleLibrary wired, CHORD_DEMOS moved into its own inner `flex flex-col gap-1` wrapper div.
- 7 new tests in `ScaleLibrary.test.tsx` cover all 5 ACs.
- `LibraryPanel.test.tsx` extended with fretboardStore reset in beforeEach; all 8 existing tests pass.
- Final count: 160 tests passing (was 153 before this story — +7 new).

### File List

- `frontend/src/features/library/ScaleLibrary.tsx` (NEW)
- `frontend/src/features/library/ScaleLibrary.test.tsx` (NEW)
- `frontend/src/features/library/LibraryPanel.tsx` (MODIFIED)
- `frontend/src/features/library/LibraryPanel.test.tsx` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)

### Change Log

- 2026-05-31: Story 2.3 implemented — ScaleLibrary component created, LibraryPanel wired to real scale data, 7 tests added. 160/160 passing.
