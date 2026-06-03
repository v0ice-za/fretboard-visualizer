# Story 2.1: LibraryPanel Shell

Status: done

## Dev Context
- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **user**,
I want a library panel (drawer on desktop / bottom sheet on mobile),
so that I can access the Scale and Chord libraries while keeping the fretboard visible.

## Acceptance Criteria

**AC1** — Given desktop (≥768px) and LibraryPanel closed,
When user clicks the Library icon button in ControlBar,
Then LibraryPanel opens as a right-side panel; the CSS grid switches to two-column (fretboard | library-panel); fretboard column remains fully visible.

**AC2** — Given LibraryPanel is open (any viewport),
When user views the panel,
Then a tab switcher shows "Scale Library" and "Chord Library" tabs; tabs are interactive (clicking switches active tab); tab content areas are empty stubs (filled in Stories 2.3 and 2.4).

**AC3** — Given desktop and LibraryPanel is open,
When user clicks the close (×) button inside the panel OR clicks the Library icon button again,
Then LibraryPanel closes and grid returns to single-column layout.

**AC4** — Given mobile (<768px),
When user clicks Library icon,
Then LibraryPanel opens as a bottom sheet (shadcn Sheet, `side="bottom"`); dismissible by tapping outside or swiping down.

**AC5** — Given any viewport,
When LibraryPanel opens, then `useLayoutStore.activeLayout.sidePanel === true`;
When LibraryPanel closes, then `useLayoutStore.activeLayout.sidePanel === false`.

**AC6** — Given `useLayoutStore.activeLayout.libraryMode === 'sidebar'`,
When LibraryPanel is open on desktop,
Then it renders in sidebar mode (full-height right column); for Story 2.1 sidebar renders identically to drawer — detailed sidebar behavior deferred.

## Tasks / Subtasks

- [x] Task 1: Add shadcn Sheet component (AC: 4)
  - [x] Run `npx shadcn@latest add sheet` from `frontend/`
  - [x] Verify `frontend/src/components/ui/sheet.tsx` is created
  - [x] Do NOT edit the generated file

- [x] Task 2: Update `frontend/src/index.css` — side-panel grid layout (AC: 1, 3)
  - [x] Add `@media (min-width: 768px)` rule for `.app-shell.side-panel-open`
  - [x] Two-column grid: `1fr 320px`; grid-template-areas spans top-bar/mode-row/bottom-bar across both columns; fretboard and library-panel side-by-side

- [x] Task 3: Create `LibraryPanel` component (AC: 1, 2, 3, 4, 6)
  - [x] New file: `frontend/src/features/library/LibraryPanel.tsx`
  - [x] Desktop: `<aside style={{ gridArea: 'library-panel' }}>` rendered only when `sidePanel === true`; hidden on mobile via `hidden md:flex`
  - [x] Mobile: shadcn `<Sheet open={sidePanel} onOpenChange>` with `side="bottom" className="h-[60vh]"`; hidden on desktop via `md:hidden`
  - [x] Tab switcher state: `activeTab: 'scale' | 'chord'`, default `'scale'`
  - [x] Scale Library tab content: `<div data-testid="scale-library-content" />` stub
  - [x] Chord Library tab content: `<div data-testid="chord-library-content" />` stub
  - [x] Close button (×) calls `setLayout({ sidePanel: false })`

- [x] Task 4: Update `AppShell` to render LibraryPanel and manage grid class (AC: 1, 5)
  - [x] Import `useLayoutStore` and `LibraryPanel` in `AppShell.tsx`
  - [x] Read `activeLayout.sidePanel`
  - [x] Add `side-panel-open` class to `.app-shell` div when `sidePanel === true`
  - [x] Render `<LibraryPanel />` inside the shell (component handles its own visibility)
  - [x] Preserve: skip link, children render, existing tests still pass

- [x] Task 5: Wire ControlBar Library button (AC: 1, 3, 5)
  - [x] Import `useLayoutStore` in `ControlBar.tsx`
  - [x] Destructure `activeLayout.sidePanel` and `setLayout`
  - [x] Replace `onClick={() => {}}` on Library button (line ~128–135) with `onClick={() => setLayout({ sidePanel: !sidePanel })}`
  - [x] Add `aria-pressed={sidePanel}` attribute
  - [x] Add active state styling (matching existing toggle pattern: `sidePanel ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'`)

- [x] Task 6: Tests (AC: all)
  - [x] New file: `frontend/src/features/library/LibraryPanel.test.tsx`
  - [x] Test: renders desktop `<aside>` when `sidePanel=true`, does not render when `sidePanel=false`
  - [x] Test: close button calls `setLayout({ sidePanel: false })`
  - [x] Test: "Scale Library" tab active by default
  - [x] Test: clicking "Chord Library" tab switches active tab
  - [x] Test: Sheet `open` prop reflects `sidePanel` store value
  - [x] Update `AppShell.test.tsx`: `.app-shell` has `side-panel-open` class when `sidePanel=true`, does not have it when `false`
  - [x] Update `ControlBar.test.tsx`: Library button click calls `setLayout({ sidePanel: true })`; second click calls `setLayout({ sidePanel: false })`

- [x] Task 7: Final validation
  - [x] `npm run type-check` → zero errors
  - [x] `npm run lint` → zero errors
  - [x] `npm test` → all pass, no regressions (baseline: 126 tests)

---

## Dev Notes

### What already exists — DO NOT re-create

```
frontend/src/
  components/shared/AppShell.tsx    — simple wrapper; NO store reads yet (Story 2.1 adds them)
  components/ControlBar.tsx         — Library button stub at line ~128: onClick={() => {}}, annotated "wired in Story 2.1"
  stores/layoutStore.ts             — useLayoutStore: { sidePanel: bool, libraryMode: LibraryMode, setLayout() }
  index.css                         — .app-shell CSS grid already defines "library-panel" zone (row 4)
  components/ui/button.tsx          — use for close button if needed
  components/ui/sheet.tsx           — does NOT exist yet; add in Task 1
```

shadcn/ui installed components (do NOT re-install): `button`, `select`, `slider`, `tooltip`.

### Architecture guardrails

- **New components go in `frontend/src/features/library/`** — NOT in `components/`
- `App.jsx` stays `.jsx` — do NOT modify or convert
- `frontend/src/data/*.js` — do NOT touch
- Tailwind v4: no `tailwind.config.js`; Tailwind classes work normally in `.tsx` via CSS-only `@theme` config
- `src/components/ui/` — shadcn generated; do NOT hand-edit (sheet.tsx will be generated here)
- Import alias: `@/` → `frontend/src/`

### Current AppShell internals (read before modifying)

```tsx
// frontend/src/components/shared/AppShell.tsx — current state
interface AppShellProps { children: React.ReactNode }

function AppShell({ children }: AppShellProps) {
  return (
    <>
      <a href="#fretboard" className="sr-only focus:not-sr-only ...">
        Skip to fretboard
      </a>
      <div className="app-shell">
        {children}
      </div>
    </>
  )
}
```

Story 2.1 target state:
```tsx
import { useLayoutStore } from '@/stores/layoutStore'
import LibraryPanel from '@/features/library/LibraryPanel'

function AppShell({ children }: AppShellProps) {
  const { activeLayout } = useLayoutStore()
  const panelClass = activeLayout.sidePanel ? 'app-shell side-panel-open' : 'app-shell'
  return (
    <>
      <a href="#fretboard" className="sr-only focus:not-sr-only ...">Skip to fretboard</a>
      <div className={panelClass}>
        {children}
        <LibraryPanel />
      </div>
    </>
  )
}
```

**Preserve existing AppShell.test.tsx behaviour** — both tests must still pass after modification.

### Current CSS grid (index.css lines 180–196)

```css
.app-shell {
  display: grid;
  grid-template-areas:
    "top-bar"
    "mode-row"
    "fretboard"
    "library-panel"   /* already defined */
    "bottom-bar";
  grid-template-rows: var(--top-bar-height) auto 1fr auto auto;
  min-height: 100dvh;
}
```

Add after the existing rule:

```css
@media (min-width: 768px) {
  .app-shell.side-panel-open {
    grid-template-areas:
      "top-bar     top-bar"
      "mode-row    mode-row"
      "fretboard   library-panel"
      "bottom-bar  bottom-bar";
    grid-template-columns: 1fr 320px;
    grid-template-rows: var(--top-bar-height) auto 1fr auto;
  }
}
```

### ControlBar Library button — current stub (ControlBar.tsx ~line 127)

```tsx
{/* Library — wired in Story 2.1 */}
<button
  className="p-2 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
  title="Library"
  aria-label="Library"
  onClick={() => {}}
>
  <Library size={16} />
</button>
```

Story 2.1 target state — follow the existing note-names / freeform toggle pattern exactly:

```tsx
<button
  onClick={() => setLayout({ sidePanel: !sidePanel })}
  className={`p-2 rounded-lg transition-colors ${
    sidePanel
      ? 'bg-indigo-500/20 text-indigo-400'
      : 'text-slate-500 hover:text-slate-300'
  }`}
  title="Library"
  aria-label="Library"
  aria-pressed={sidePanel}
>
  <Library size={16} />
</button>
```

### shadcn Sheet install and API

```bash
# Run from frontend/ directory
npx shadcn@latest add sheet
```

Sheet usage for mobile bottom panel:

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

<Sheet open={sidePanel} onOpenChange={(open) => { if (!open) setLayout({ sidePanel: false }) }}>
  <SheetContent side="bottom" className="h-[60vh]">
    <SheetHeader>
      <SheetTitle>Library</SheetTitle>
    </SheetHeader>
    {/* tab content */}
  </SheetContent>
</Sheet>
```

Sheet is accessible (focus trap, Escape key, aria-modal) out of the box via Radix.

### LibraryPanel component structure

```tsx
// frontend/src/features/library/LibraryPanel.tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { useLayoutStore } from '@/stores/layoutStore'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type Tab = 'scale' | 'chord'

export default function LibraryPanel() {
  const { activeLayout, setLayout } = useLayoutStore()
  const { sidePanel } = activeLayout
  const [activeTab, setActiveTab] = useState<Tab>('scale')
  const close = () => setLayout({ sidePanel: false })

  const tabContent = (
    <div className="flex-1 overflow-y-auto p-4">
      {activeTab === 'scale'
        ? <div data-testid="scale-library-content" />
        : <div data-testid="chord-library-content" />}
    </div>
  )

  const tabs = (
    <div className="flex border-b border-[var(--color-border,#1e1e30)]">
      {(['scale', 'chord'] as Tab[]).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          aria-selected={activeTab === tab}
          role="tab"
        >
          {tab === 'scale' ? 'Scale Library' : 'Chord Library'}
        </button>
      ))}
    </div>
  )

  return (
    <>
      {/* Desktop aside — only rendered when panel is open */}
      {sidePanel && (
        <aside
          style={{ gridArea: 'library-panel' }}
          className="hidden md:flex flex-col border-l border-[var(--color-border,#1e1e30)] bg-[var(--color-surface,#0f0f1a)]"
          aria-label="Library panel"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border,#1e1e30)]">
            <span className="text-sm font-semibold text-slate-300">Library</span>
            <button
              onClick={close}
              className="p-1 rounded text-slate-500 hover:text-slate-300"
              aria-label="Close library panel"
            >
              <X size={14} />
            </button>
          </div>
          {tabs}
          {tabContent}
        </aside>
      )}

      {/* Mobile bottom Sheet */}
      <div className="md:hidden">
        <Sheet open={sidePanel} onOpenChange={(open) => { if (!open) close() }}>
          <SheetContent side="bottom" className="h-[60vh] flex flex-col">
            <SheetHeader className="border-b border-[var(--color-border,#1e1e30)] pb-2">
              <SheetTitle>Library</SheetTitle>
            </SheetHeader>
            {tabs}
            {tabContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
```

### Design tokens

All defined in `frontend/src/index.css` `@theme` block:
- `--color-surface: #0f0f1a` — panel background
- `--color-border: #1e1e30` — dividers and left border
- `--color-text-primary: #e2e8f0`
- `--color-text-secondary: #64748b`

Panel width: 320px (fixed; matches UX spec).

### Test patterns from prior stories

Store reset in tests (pattern from `layoutStore.test.ts` and `fretboardStore.test.ts`):

```tsx
import { useLayoutStore } from '@/stores/layoutStore'

const DEFAULT_LAYOUT = {
  topBar: true, modeRow: false, sidePanel: false,
  bottomBar: false, libraryMode: 'drawer' as const,
}

beforeEach(() => {
  useLayoutStore.setState({ activeLayout: DEFAULT_LAYOUT })
})
```

Testing Sheet `open` prop directly (rather than mocking viewport):

```tsx
it('Sheet open prop reflects sidePanel store value', () => {
  useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
  render(<LibraryPanel />)
  // Sheet renders with open=true — check for SheetContent or its role="dialog"
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
```

For the desktop aside, vitest/jsdom doesn't honour CSS media queries — test by setting `sidePanel: true` and checking the `<aside>` is in the DOM (the `hidden md:flex` is a visual concern only in jsdom).

### Deferred work resolved by this story

From `deferred-work.md` (1.5 CR):
- "Library/Account stub buttons not `aria-disabled`" — Library button is now fully wired with `aria-pressed`; no longer a stub.

### File list for this story

**New files:**
- `frontend/src/features/library/LibraryPanel.tsx`
- `frontend/src/features/library/LibraryPanel.test.tsx`
- `frontend/src/components/ui/sheet.tsx` ← generated by shadcn CLI; do not edit

**Modified files:**
- `frontend/src/components/shared/AppShell.tsx` — add store read + LibraryPanel render + `side-panel-open` class
- `frontend/src/components/ControlBar.tsx` — wire Library button (line ~128)
- `frontend/src/index.css` — add side-panel grid rule

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- base-ui Sheet dialog sets `aria-hidden` on sibling DOM nodes when open; desktop `<aside>` tests needed `container.querySelector` instead of `screen.getByRole` to avoid false negatives from inert containers.

### Completion Notes List
- Task 1: sheet.tsx generated via `npx shadcn@latest add sheet --yes`; uses `@base-ui/react/dialog` (not Radix)
- Task 2: side-panel grid rule added to index.css after existing .app-shell block
- Task 3: LibraryPanel.tsx created in `features/library/`; desktop aside + mobile Sheet; tab switcher; content stubs
- Task 4: AppShell.tsx updated with useLayoutStore + LibraryPanel render + panelClass conditional
- Task 5: ControlBar.tsx Library button wired with toggle + aria-pressed + active styling
- Task 6: 12 new tests (8 LibraryPanel + 2 AppShell + 2 ControlBar); all 138 pass
- Task 7: type-check ✅, lint ✅, tests 138/138 ✅

### File List
- `frontend/src/components/ui/sheet.tsx` (new — generated)
- `frontend/src/features/library/LibraryPanel.tsx` (new)
- `frontend/src/features/library/LibraryPanel.test.tsx` (new)
- `frontend/src/index.css` (modified — side-panel grid rule)
- `frontend/src/components/shared/AppShell.tsx` (modified — store + LibraryPanel)
- `frontend/src/components/shared/AppShell.test.tsx` (modified — 2 new tests)
- `frontend/src/components/ControlBar.tsx` (modified — Library button wired)
- `frontend/src/components/ControlBar.test.tsx` (modified — 2 new tests)

### Change Log
- 2026-05-28: Story 2.1 implemented — LibraryPanel shell, AppShell grid, ControlBar wired, 12 new tests
