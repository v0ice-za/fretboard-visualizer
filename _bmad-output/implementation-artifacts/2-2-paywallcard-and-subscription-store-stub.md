# Story 2.2: PaywallCard & Subscription Store Stub

Status: done

## Dev Context
- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX spec: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`
- Deferred work: `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **free-tier user**,
I want a compact upgrade prompt when accessing premium content,
so that I can understand what I'm missing and upgrade when I'm ready.

## Acceptance Criteria

**AC1** — Given a locked `LibraryItem` rendered in the panel,
When the user clicks it on desktop (≥768px),
Then `PaywallCard` opens anchored to the triggering element via Floating UI; it does not cover the fretboard.

**AC2** — Given `PaywallCard` is open,
When the user views it,
Then it is max 280px wide, shows a brief premium description headline, up to 3 benefit bullets, a price label ("$12/yr"), and an "Upgrade" CTA button.

**AC3** — Given `PaywallCard` is open,
When the user clicks outside it OR presses Escape,
Then it closes.

**AC4** — Given `PaywallCard` is open,
When the user clicks "Upgrade",
Then a placeholder navigation occurs (no real checkout in this story — Stripe wired in Story 3.5); a `console.log` or `alert` is acceptable placeholder.

**AC5** — Given the subscription store,
When the app loads,
Then `useSubscriptionStore.getState().isPremium === false` (stub; real value set in Story 3.6).

**AC6** — Given `LibraryItem` rendered with `variant="locked"`,
When the user views it,
Then it appears visually muted, shows a lock Badge icon, and has `aria-disabled="true"`.

**AC7** — Given `LibraryItem` rendered with each variant,
When the user views it,
Then: `default` = normal styling; `active` = indigo tint + checkmark; `locked` = muted + lock Badge; `preview` = normal styling + "Preview" label badge.

**AC8** — Given mobile (<768px) and LibraryPanel is open as bottom Sheet,
When the user clicks a locked `LibraryItem`,
Then `PaywallCard` renders inline within the Sheet (not floating over the fretboard).

## Tasks / Subtasks

- [x] Task 1: Install dependencies (AC: 1, 8)
  - [x] Run `npm install @floating-ui/react` from `frontend/`
  - [x] Run `npx shadcn@latest add badge` from `frontend/`
  - [x] Verify `frontend/src/components/ui/badge.tsx` is created (do NOT edit)
  - [x] Verify `@floating-ui/react` appears in `frontend/package.json` dependencies

- [x] Task 2: Create `useSubscriptionStore` (AC: 5)
  - [x] New file: `frontend/src/stores/subscriptionStore.ts`
  - [x] `interface SubscriptionStore { isPremium: boolean; setIsPremium: (v: boolean) => void }`
  - [x] `const DEFAULT_SUBSCRIPTION = { isPremium: false }`
  - [x] Export named constant `DEFAULT_SUBSCRIPTION` for use in tests (pattern from `fretboardStore.ts`)
  - [x] `useSubscriptionStore = create<SubscriptionStore>((set) => ({ isPremium: false, setIsPremium: (v) => set({ isPremium: v }) }))`

- [x] Task 3: Create `LibraryItem` component (AC: 6, 7)
  - [x] New file: `frontend/src/features/library/LibraryItem.tsx`
  - [x] Props: `title: string`, `variant: 'default' | 'active' | 'locked' | 'preview'`, `onSelect?: () => void`, `onPaywallTrigger?: (anchorEl: HTMLElement) => void`
  - [x] `role="option"`, `aria-selected={variant === 'active'}`, `aria-disabled={variant === 'locked'}`
  - [x] `locked` variant: visually muted (`opacity-50`), shadcn `<Badge>` with lock icon (`<Lock size={12} />`), onClick calls `onPaywallTrigger?.(event.currentTarget)`
  - [x] `active` variant: `bg-indigo-500/15 text-indigo-300` + checkmark (`<Check size={14} />`), onClick calls `onSelect?.()`
  - [x] `preview` variant: normal styling + `<Badge variant="secondary">Preview</Badge>` label, onClick calls `onSelect?.()`
  - [x] `default` variant: normal styling, onClick calls `onSelect?.()`
  - [x] Do NOT manage PaywallCard open state inside LibraryItem — parent manages it (see Task 4)

- [x] Task 4: Create `PaywallCard` component (AC: 1, 2, 3, 4, 8)
  - [x] New file: `frontend/src/components/shared/PaywallCard.tsx`
  - [x] Props: `open: boolean`, `onClose: () => void`, `anchorEl: HTMLElement | null`, `inline?: boolean`
  - [x] Desktop mode (`inline !== true`): use `@floating-ui/react` — `useFloating` with `placement="right"`, middleware: `[offset(8), flip(), shift({ padding: 8 })]`, `autoUpdate` via `whileElementsMounted`
  - [x] Desktop: `useDismiss(context)` handles click-outside + Escape key → calls `onClose`
  - [x] Desktop: render via `<FloatingPortal>` + `<FloatingFocusManager>` for focus trap
  - [x] Mobile inline mode (`inline === true`): render as a normal `<div>` block (no Floating UI), no portal
  - [x] Card anatomy (both modes): headline ("Unlock Premium"), 3 benefit bullets (tune to any of 14 tunings, chord library access, session persistence), price tag ("$12 / yr"), "Upgrade" CTA button (calls `console.log('Upgrade clicked — wired in Story 3.5')`), "×" dismiss button calls `onClose`
  - [x] `max-w-[280px]` always
  - [x] `data-testid="paywall-card"` on root element
  - [x] `z-index: z-50` so it appears above panel content

- [x] Task 5: Update `LibraryPanel` to wire LibraryItem + PaywallCard (AC: 1, 8)
  - [x] Manage `paywallAnchor: HTMLElement | null` state (null = closed)
  - [x] Replace `<div data-testid="scale-library-content" />` stub with 3 demo `LibraryItem` elements: `active` ("A Natural Minor"), `preview` ("D Dorian"), `locked` ("G Harmonic Minor") — these are replaced by real data in Story 2.3
  - [x] Replace `<div data-testid="chord-library-content" />` stub with 3 demo `LibraryItem` elements: `active` ("A Major"), `preview` ("E Minor"), `locked` ("G Dominant 7") — replaced by real data in Story 2.4
  - [x] Locked LibraryItem `onPaywallTrigger`: `setPaywallAnchor(el)`
  - [x] Desktop aside: render `<PaywallCard open={!!paywallAnchor} anchorEl={paywallAnchor} onClose={() => setPaywallAnchor(null)} />` after the `{tabContent}` block
  - [x] Mobile Sheet: render `<PaywallCard open={!!paywallAnchor} anchorEl={null} inline onClose={() => setPaywallAnchor(null)} />` inside the SheetContent (below `{tabContent}`)
  - [x] Close paywall when tab switches: `setPaywallAnchor(null)` in the tab click handler

- [x] Task 6: Tests (AC: all)
  - [x] New file: `frontend/src/stores/subscriptionStore.test.ts`
    - [x] Default `isPremium` is `false`
    - [x] `setIsPremium(true)` updates store
  - [x] New file: `frontend/src/features/library/LibraryItem.test.tsx`
    - [x] `default` variant renders title, no badge, is clickable, calls `onSelect`
    - [x] `active` variant renders checkmark icon, has `aria-selected="true"`, correct indigo styling
    - [x] `locked` variant renders lock Badge, has `aria-disabled="true"`, click calls `onPaywallTrigger`
    - [x] `preview` variant renders "Preview" badge, is clickable, calls `onSelect`
    - [x] Clicking `locked` does NOT call `onSelect`
  - [x] New file: `frontend/src/components/shared/PaywallCard.test.tsx`
    - [x] Renders when `open=true`, not rendered when `open=false`
    - [x] Shows headline, benefit bullets, price, "Upgrade" CTA, dismiss button
    - [x] Max width class `max-w-[280px]` present
    - [x] Dismiss button calls `onClose`
    - [x] Escape key calls `onClose` (test via `fireEvent.keyDown(document, { key: 'Escape' })`)
    - [x] `inline` mode: renders as div (no portal), no role="dialog"
  - [x] Update `frontend/src/features/library/LibraryPanel.test.tsx`
    - [x] Remove test `'renders scale-library-content stub when Scale tab active'` (stub div is gone)
    - [x] Add: clicking locked item opens PaywallCard (`data-testid="paywall-card"` present in DOM)
    - [x] Add: switching tabs closes PaywallCard
  - [x] Update `frontend/src/features/library/LibraryPanel.test.tsx` imports: add `useSubscriptionStore` reset in `beforeEach`

- [x] Task 7: Final validation
  - [x] `npm run type-check` → zero errors
  - [x] `npm run lint` → zero errors
  - [x] `npm test` → all pass, no regressions (baseline: 138 tests)

### Review Findings (AI — 2026-05-31)

**Decision needed:**
- [x] [Review][Decision] Inline PaywallCard has no click-outside dismissal — resolved: added mousedown click-outside handler via useRef + useEffect to inline mode [src/components/shared/PaywallCard.tsx]

**Patches:**
- [x] [Review][Patch] `role="option"` without `role="listbox"` parent — fixed: added `role="listbox"` + `aria-label` to ScaleLibrary wrapper div and LibraryPanel chord demos div [src/features/library/ScaleLibrary.tsx, src/features/library/LibraryPanel.tsx]
- [x] [Review][Patch] Desktop PaywallCard floating div has no `role="dialog"` or `aria-label` — fixed: added `role="dialog"` and `aria-label="Upgrade to Premium"` [src/components/shared/PaywallCard.tsx:106]
- [x] [Review][Patch] Desktop PaywallCard (FloatingPortal path) has zero test coverage — fixed: added 2 tests (desktop render + role assertions) [src/components/shared/PaywallCard.test.tsx]
- [x] [Review][Patch] Price label "$12 / yr" does not match AC2 spec literal "$12/yr" — fixed [src/components/shared/PaywallCard.tsx:50]

**Deferred:**
- [x] [Review][Defer] `useSubscriptionStore.isPremium` never consulted in ScaleLibrary or LibraryItem — free-tier gating is static; store is a stub with no effect on rendered variants — deferred to Story 3.6 (subscription enforcement)
- [x] [Review][Defer] Desktop aside + mobile Sheet each have independent paywall state; viewport resize mid-session while paywall open loses state — deferred, edge case out of scope for current stories

---

## Dev Notes

### What already exists — DO NOT re-create

```
frontend/src/
  stores/layoutStore.ts              — useLayoutStore: { sidePanel, libraryMode, setLayout }
  stores/fretboardStore.ts           — useFretboardStore (do NOT add subscription logic here)
  features/library/LibraryPanel.tsx  — current state below; Tasks 5–6 modify it
  features/library/LibraryPanel.test.tsx — 8 tests; Task 6 updates 1 + adds 2
  components/ui/badge.tsx            — generated by shadcn (Task 1); do NOT hand-edit
  components/ui/button.tsx           — use for PaywallCard CTA and dismiss
  components/ui/sheet.tsx            — base-ui Dialog; used by LibraryPanel mobile
```

Installed shadcn components: `button`, `select`, `slider`, `tooltip`, `sheet`, `badge` (Task 1 adds badge).

### Architecture guardrails

- `useSubscriptionStore` → `frontend/src/stores/subscriptionStore.ts` (NOT in fretboardStore or layoutStore)
- `PaywallCard` → `frontend/src/components/shared/` (shared components visible app-wide)
- `LibraryItem` → `frontend/src/features/library/` (library-domain component)
- `App.jsx` stays `.jsx` — do NOT modify or convert
- `frontend/src/data/*.js` — do NOT touch
- Tailwind v4: CSS-only via `@theme` in `index.css` — no `tailwind.config.js`
- shadcn `src/components/ui/` — do NOT hand-edit generated files

### Current LibraryPanel.tsx internals (read before modifying)

The current `LibraryPanel.tsx` renders tab stubs that Story 2.2 replaces with demo items:

```tsx
const tabContent = (
  <div className="flex-1 overflow-y-auto p-4">
    {activeTab === 'scale'
      ? <div data-testid="scale-library-content" />   // ← replace with demo LibraryItems
      : <div data-testid="chord-library-content" />}  // ← replace with demo LibraryItems
  </div>
)
```

Story 2.2 target state for `tabContent`:

```tsx
const SCALE_DEMOS: Array<{ title: string; variant: LibraryItemVariant }> = [
  { title: 'A Natural Minor', variant: 'active' },
  { title: 'D Dorian', variant: 'preview' },
  { title: 'G Harmonic Minor', variant: 'locked' },
]

const CHORD_DEMOS: Array<{ title: string; variant: LibraryItemVariant }> = [
  { title: 'A Major', variant: 'active' },
  { title: 'E Minor', variant: 'preview' },
  { title: 'G Dominant 7', variant: 'locked' },
]

const tabContent = (
  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
    {(activeTab === 'scale' ? SCALE_DEMOS : CHORD_DEMOS).map((item) => (
      <LibraryItem
        key={item.title}
        title={item.title}
        variant={item.variant}
        onSelect={() => {}}
        onPaywallTrigger={(el) => setPaywallAnchor(el)}
      />
    ))}
  </div>
)
```

These demo items are placeholders. Story 2.3 replaces SCALE_DEMOS with real scale data; Story 2.4 replaces CHORD_DEMOS.

### @floating-ui/react API (exact usage for PaywallCard)

```bash
# Run from frontend/
npm install @floating-ui/react
```

PaywallCard desktop Floating UI scaffold:

```tsx
import {
  useFloating,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react'

// In PaywallCard (desktop mode):
const { refs, floatingStyles, context } = useFloating({
  open,
  onOpenChange: (open) => { if (!open) onClose() },
  placement: 'right',
  whileElementsMounted: autoUpdate,
  middleware: [offset(8), flip(), shift({ padding: 8 })],
})

// Wire the anchor ref to anchorEl imperatively:
// refs.setReference(anchorEl) in a useEffect when anchorEl changes

const dismiss = useDismiss(context)
const { getFloatingProps } = useInteractions([dismiss])

return (
  <FloatingPortal>
    <FloatingFocusManager context={context} modal={false}>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="z-50 max-w-[280px] ..."
        data-testid="paywall-card"
        {...getFloatingProps()}
      >
        {/* card content */}
      </div>
    </FloatingFocusManager>
  </FloatingPortal>
)
```

For setting the reference element imperatively (from `anchorEl` prop):
```tsx
useEffect(() => {
  refs.setReference(anchorEl)
}, [anchorEl, refs])
```

### LibraryItem component structure

```tsx
// frontend/src/features/library/LibraryItem.tsx
import { Check, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type LibraryItemVariant = 'default' | 'active' | 'locked' | 'preview'

interface LibraryItemProps {
  title: string
  variant: LibraryItemVariant
  onSelect?: () => void
  onPaywallTrigger?: (anchorEl: HTMLElement) => void
}

export default function LibraryItem({ title, variant, onSelect, onPaywallTrigger }: LibraryItemProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'locked') {
      onPaywallTrigger?.(e.currentTarget)
    } else {
      onSelect?.()
    }
  }

  return (
    <button
      role="option"
      aria-selected={variant === 'active'}
      aria-disabled={variant === 'locked'}
      onClick={handleClick}
      disabled={false}  // intentionally NOT html-disabled — screen readers announce aria-disabled
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
        variant === 'locked'
          ? 'opacity-50 cursor-not-allowed text-slate-500'
          : variant === 'active'
          ? 'bg-indigo-500/15 text-indigo-300'
          : 'text-slate-300 hover:bg-white/5'
      }`}
    >
      <span>{title}</span>
      <span className="flex items-center gap-1">
        {variant === 'active' && <Check size={14} />}
        {variant === 'locked' && (
          <Badge variant="outline" className="gap-1 py-0 px-1 text-xs">
            <Lock size={10} />
          </Badge>
        )}
        {variant === 'preview' && (
          <Badge variant="secondary" className="text-xs py-0">Preview</Badge>
        )}
      </span>
    </button>
  )
}
```

### PaywallCard component structure

```tsx
// frontend/src/components/shared/PaywallCard.tsx
// Desktop: Floating UI floating panel
// Mobile inline: static div rendered inside LibraryPanel Sheet

const BENEFITS = [
  'Access all 14 tunings including Drop B, Open A, and more',
  'Full chord library with shape highlighting on any tuning',
  'Session persistence — your fretboard setup saves between visits',
]

export default function PaywallCard({ open, onClose, anchorEl, inline = false }: PaywallCardProps) {
  if (!open) return null

  if (inline) {
    return (
      <div className="max-w-[280px] mx-auto mt-4 rounded-lg border border-[var(--border)] bg-card p-4" data-testid="paywall-card">
        {cardBody}
      </div>
    )
  }

  // Desktop: Floating UI variant (see scaffold above)
  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} modal={false}>
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-50 max-w-[280px] rounded-lg border border-[var(--border)] bg-popover p-4 shadow-xl"
          data-testid="paywall-card"
          {...getFloatingProps()}
        >
          {cardBody}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  )
}

// cardBody:
const cardBody = (
  <>
    <div className="flex items-start justify-between mb-2">
      <span className="text-sm font-semibold text-slate-200">Unlock Premium</span>
      <button onClick={onClose} className="text-slate-500 hover:text-slate-300" aria-label="Dismiss paywall">
        <X size={14} />
      </button>
    </div>
    <ul className="text-xs text-slate-400 space-y-1 mb-3">
      {BENEFITS.map((b) => <li key={b} className="flex gap-1"><span>•</span>{b}</li>)}
    </ul>
    <p className="text-xs text-slate-500 mb-3">$12 / yr</p>
    <Button size="sm" className="w-full" onClick={() => console.log('Upgrade clicked — wired in Story 3.5')}>
      Upgrade
    </Button>
  </>
)
```

### base-ui Sheet / Floating UI coexistence

The LibraryPanel mobile Sheet uses `@base-ui/react/dialog`, which sets `aria-hidden` on sibling DOM nodes when open. Floating UI's `FloatingPortal` targets `document.body` by default — this means desktop `PaywallCard` portals render as a sibling to the Sheet's backdrop, which is fine on desktop.

For mobile inline mode (`inline={true}`): PaywallCard renders inside the Sheet DOM with no portal — no coexistence issue.

**CRITICAL**: Do NOT use `useClick` on LibraryItem for Floating UI. The anchor ref is set imperatively from `anchorEl` (the button element reference passed from `onPaywallTrigger`). The open/close state is managed in LibraryPanel, not inside Floating UI's hooks.

### Test patterns (from Story 2.1)

Store reset pattern for `subscriptionStore`:
```tsx
import { useSubscriptionStore } from '@/stores/subscriptionStore'

beforeEach(() => {
  useSubscriptionStore.setState({ isPremium: false })
})
```

Testing PaywallCard Escape key dismiss:
```tsx
import { fireEvent } from '@testing-library/react'

it('Escape key calls onClose', () => {
  render(<PaywallCard open anchorEl={null} onClose={mockClose} inline />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(mockClose).toHaveBeenCalled()
})
```

Note: the Escape handler in `inline` mode must be wired via a `useEffect` + `addEventListener` since there's no Floating UI context to handle it:
```tsx
useEffect(() => {
  if (!open || !inline) return
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [open, inline, onClose])
```

For desktop mode, `useDismiss(context)` handles Escape automatically.

base-ui aria-hidden caveat (same as Story 2.1): when PaywallCard is rendered inline inside the Sheet, the surrounding content may be aria-hidden by base-ui. Use `container.querySelector('[data-testid="paywall-card"]')` rather than `screen.getByTestId` in tests where the Sheet is open.

### LibraryPanel.test.tsx updates

Remove:
```tsx
it('renders scale-library-content stub when Scale tab active', ...)
// This test checks for data-testid="scale-library-content" which no longer exists
```

Add:
```tsx
it('clicking locked LibraryItem shows PaywallCard', async () => {
  useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
  const { container } = render(<LibraryPanel />)
  const aside = container.querySelector('aside')!
  // Find the locked button (aria-disabled="true")
  const lockedBtn = aside.querySelector('button[aria-disabled="true"]') as HTMLElement
  await user.click(lockedBtn)
  expect(document.querySelector('[data-testid="paywall-card"]')).toBeInTheDocument()
})

it('switching tabs closes PaywallCard', async () => {
  useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } })
  const { container } = render(<LibraryPanel />)
  const aside = container.querySelector('aside')!
  const lockedBtn = aside.querySelector('button[aria-disabled="true"]') as HTMLElement
  await user.click(lockedBtn)
  // PaywallCard should be open
  expect(document.querySelector('[data-testid="paywall-card"]')).toBeInTheDocument()
  // Switch tab
  const chordTab = Array.from(aside.querySelectorAll('button[role="tab"]')).find(
    el => el.textContent === 'Chord Library'
  ) as HTMLElement
  await user.click(chordTab)
  expect(document.querySelector('[data-testid="paywall-card"]')).not.toBeInTheDocument()
})
```

### Deferred work note

Epic 1 retrospective action item (now due): Add `@floating-ui/react` before Story 2.2. Task 1 handles this.

Also from deferred-work.md: `vercel.json` missing SPA catch-all rewrite — Story 2.2 does not introduce path-based routes; this remains deferred.

### File list for this story

**New files:**
- `frontend/src/stores/subscriptionStore.ts`
- `frontend/src/stores/subscriptionStore.test.ts`
- `frontend/src/features/library/LibraryItem.tsx`
- `frontend/src/features/library/LibraryItem.test.tsx`
- `frontend/src/components/shared/PaywallCard.tsx`
- `frontend/src/components/shared/PaywallCard.test.tsx`
- `frontend/src/components/ui/badge.tsx` ← generated by shadcn; do NOT edit

**Modified files:**
- `frontend/package.json` — @floating-ui/react added
- `frontend/src/features/library/LibraryPanel.tsx` — demo items + PaywallCard wiring
- `frontend/src/features/library/LibraryPanel.test.tsx` — remove 1 test, add 2 tests

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- ESLint `react-hooks/refs` false-positive on `refs.setFloating` in JSX — fixed with eslint-disable comment; the rule doesn't distinguish Floating UI callback refs from React useRef `.current` reads.

### Completion Notes List
- All 7 tasks complete; 153 tests pass (138 baseline + 15 new).
- `useSubscriptionStore` is a stub — isPremium defaults false; wired to real auth in Story 3.6.
- PaywallCard renders via FloatingPortal (desktop) or inline div (mobile); Escape handled by `useDismiss` on desktop, `useEffect` listener on mobile.
- LibraryPanel tab items are demo placeholders; Story 2.3 replaces scale demos with real data, Story 2.4 replaces chord demos.
- `badge.tsx` generated by shadcn v4.8.3 — do not edit.

### File List
- `frontend/src/stores/subscriptionStore.ts` (new)
- `frontend/src/stores/subscriptionStore.test.ts` (new)
- `frontend/src/features/library/LibraryItem.tsx` (new)
- `frontend/src/features/library/LibraryItem.test.tsx` (new)
- `frontend/src/components/shared/PaywallCard.tsx` (new)
- `frontend/src/components/shared/PaywallCard.test.tsx` (new)
- `frontend/src/components/ui/badge.tsx` (new — shadcn generated)
- `frontend/package.json` (modified — @floating-ui/react added)
- `frontend/package-lock.json` (modified — lockfile update)
- `frontend/src/features/library/LibraryPanel.tsx` (modified)
- `frontend/src/features/library/LibraryPanel.test.tsx` (modified)

### Change Log
- 2026-05-31: Story 2.2 implemented — subscription store stub, LibraryItem (4 variants), PaywallCard (Floating UI desktop + inline mobile), LibraryPanel wired with demo items and paywall state. 15 tests added, 153 total passing.
