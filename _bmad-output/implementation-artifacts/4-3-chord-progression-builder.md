# Story 4.3: Chord Progression Builder

Status: done

<!-- Note: Validation is optional. Run validate-create-story (VS) for a quality check before dev-story (DS). -->

## Story

As a **premium guitarist**,
I want to **build an ordered chord progression and step through it on the fretboard**,
so that **I can visualize how a sequence of chords plays across the neck while writing.**

## Acceptance Criteria

From `epics.distillate.md#Story 4.3` (verbatim source ACs), refined against the existing codebase:

1. **AC1 — Premium-gated access.** With the Library panel open, a premium user (`subscriptionStore.isPremium === true`) can access a **Chord Progression Builder**. A non-premium user sees the entry point in a **locked** state that triggers `PaywallCard` on click (mirrors `ChordLibrary`'s locked-item pattern) — it never renders the working builder.
2. **AC2 — Add chords to an ordered sequence.** The builder lets the user add a chord (a **root note** + a **chord quality** from the existing chord library) to an ordered list. Added chords append to the end. The chromatic root set is `CHROMATIC_NOTES` (`data/notes.js`); the qualities are `CHORD_NAMES` (`data/chords.js`, 12 qualities). A chord's display label is `` `${rootNote} ${chordName}` `` (e.g. "C Major", "A Minor 7").
3. **AC3 — Reorder.** Each chord can be moved **up/down** within the sequence via controls (no drag-and-drop dependency required — up/down buttons satisfy the epic's "drag or up/down"). Order updates immediately.
4. **AC4 — Remove.** Each chord has a remove control; removing it updates the list immediately and adjusts the active index so it stays valid (or clears playback if the list becomes empty).
5. **AC5 — Step through.** With at least one chord in the sequence, **Next/Prev** buttons **and** the **←/→ arrow keys** move the active position through the progression. On each step the fretboard shows that chord's shape by setting `fretboardStore.rootNote` **and** `fretboardStore.chordName` to the active entry's values (the fretboard already renders a chord shape from these — `FretboardCanvas` `calculateChordDots`). Stepping wraps or clamps at the ends (clamp; see Dev Notes decision D4).
6. **AC6 — Active-chord highlight.** The chord at the active position is visually highlighted in the builder list (reuse the `active` visual treatment used elsewhere: indigo tint — see `LibraryItem` `variant="active"`).
7. **AC7 — In-session store only.** Progression state lives in a new `useProgressionStore` Zustand store — **in-session memory, no server persistence, no migration, no API route** (explicitly per the epic: "no server persistence required"). Refreshing the page clears it.
8. **AC8 — Clean exit / no fretboard corruption.** Leaving the builder (clearing the progression, or deactivating step mode) resets `fretboardStore.chordName` to `null` so the Scale Library view is restored intact. Stepping must not permanently strand the fretboard on a chord with no way back to scale view.

## Tasks / Subtasks

- [x] **Task 1: `useProgressionStore` Zustand store (AC: 2, 3, 4, 5, 7)**
  - [x] Create `frontend/src/stores/progressionStore.ts` following the existing store idiom (`create<T>((set) => ({ ...DEFAULT_X, ...actions }))` with an exported `DEFAULT_PROGRESSION_STATE` — mirror `fretboardStore.ts` / `subscriptionStore.ts`).
  - [x] Define `export interface ProgressionChord { id: string; rootNote: string; chordName: string }`. Generate `id` with `crypto.randomUUID()` (available in the Vite/browser + jsdom test env) so React list keys are stable across reorder.
  - [x] State: `chords: ProgressionChord[]`, `activeIndex: number | null`.
  - [x] Actions (pure — data only, **no cross-store calls in the store**; the fretboard sync lives in Task 3's hook so the store stays unit-testable in isolation): `addChord` (append, cap at `MAX_PROGRESSION_CHORDS = 32`), `removeChord` (filter + activeIndex fix-ups), `moveChord` (swap + boundary no-op + activeIndex tracking), `setActiveIndex` (range-guarded), `next`/`prev` (clamp, null→0 start), `clear`.
  - [x] Write `frontend/src/stores/progressionStore.test.ts` (Vitest): 22 tests — add/append order + cap, remove activeIndex fix-ups (before/at/after/empty→null), moveChord swaps + boundaries + active tracking, setActiveIndex range guard, next/prev clamp + null-start + empty no-op, clear.

- [x] **Task 2: `ProgressionBuilder` component — add / list / reorder / remove (AC: 2, 3, 4, 6)**
  - [x] Create `frontend/src/features/library/ProgressionBuilder.tsx`.
  - [x] **Add row:** compact **native `<select>`** for root (`CHROMATIC_NOTES`) + quality (`CHORD_NAMES`) + an "Add" button. (Deviation from the spec's shadcn `Select`: that component is Base-UI/portal-based with **no existing test coverage** in the repo, so driving it in jsdom is unproven/flaky. Native selects are accessible, `userEvent.selectOptions`-testable, and the UX spec calls for native OS pickers on mobile — see Completion Notes.)
  - [x] **List:** renders `chords` in order; each row shows the `` `${rootNote} ${chordName}` `` label with a 1-based index, up/down buttons (disabled at boundaries), and a remove button. Active row gets the `bg-indigo-500/15 text-indigo-300` treatment matching `LibraryItem` `variant="active"`.
  - [x] **Empty state:** "Add chords to build a progression" hint, no spinner.
  - [x] Accessibility: `role="list"`/`role="listitem"`; row-select button `aria-label="Select {label}"` + `aria-current`; `aria-label`s on "Move {label} up/down" and "Remove {label}"; labelled selects.
  - [x] Write `ProgressionBuilder.test.tsx`: 8 tests — empty state + disabled controls, add appends labelled row, up/down reorder, remove, click-row activates + drives fretboard, Next/Prev stepping, ←/→ stepping, Clear restores scale view.

- [x] **Task 3: Step-through playback synced to the fretboard (AC: 5, 6, 8)**
  - [x] Prev/Next buttons (disabled when empty) call `prev()`/`next()`; a Clear button calls `clear()`.
  - [x] Create `frontend/src/hooks/useProgressionPlayback.ts`: effect syncs the active chord onto `fretboardStore` (`setRootNote` + `setChordName` via `getState()`); `window` `keydown` listener for `ArrowLeft`/`ArrowRight` → `prev`/`next`, guarded against `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable` focus and empty progression, `preventDefault` only when handled; listener cleaned up on unmount.
  - [x] Mount `useProgressionPlayback()` from `ProgressionBuilder`.
  - [x] **Exit/cleanup (AC8):** snapshots pre-playback `rootNote`/`chordName` on first activation; restores it when playback stops (`clear`/deactivate) **and** on unmount; leaves the fretboard untouched if the user never stepped (so it never clobbers a chord picked in the Chord Library).
  - [x] Write `useProgressionPlayback.test.tsx`: 3 tests — arrow keys ignored while an input is focused; unmount restores pre-playback fretboard state; unmount leaves fretboard untouched when playback never started. (Active-chord→fretboard and ←/→ stepping additionally covered in `ProgressionBuilder.test.tsx`.)

- [x] **Task 4: Premium gating + `LibraryPanel` integration (AC: 1)**
  - [x] Added a third tab (`type Tab = 'scale' | 'chord' | 'progression'`, `TAB_LABELS` map, label "Progression").
  - [x] Gated via `useSubscriptionStore((s) => s.isPremium)`: non-premium click on the Progression tab calls `setPaywallAnchor(e.currentTarget)` and returns (never sets `activeTab`, never renders the builder); premium renders `<ProgressionBuilder />`. Reuses the existing `PaywallCard`/`paywallAnchor` wiring; `tabs`/`tabContent` shared across desktop `aside` + mobile `Sheet`.
  - [x] Extended `LibraryPanel.test.tsx`: non-premium Progression click → paywall shown, tab not selected, no builder; premium → tab selected, builder rendered.

- [x] **Task 5: Regression + full-suite validation (AC: 8)**
  - [x] No regression to Scale/Chord tabs, mode-chip or freeform keyboard flows (arrow listener is inert unless the builder is mounted **and** the progression is non-empty).
  - [x] Full frontend suite **241 tests / 23 files green**; `pnpm type-check` clean; `pnpm lint` clean.

### Review Findings

**Patches applied (2026-08-31):**
- [x] [Review][Patch] Cap feedback — Add button now disabled at `MAX_PROGRESSION_CHORDS` with an inline "Maximum 32 chords reached" `role="status"` message. `ProgressionBuilder.tsx` + new test.
- [x] [Review][Patch] Keyboard handler type guard — replaced `e.target as HTMLElement | null` + unchecked property access with `target instanceof HTMLElement` before reading `.tagName`/`.isContentEditable`. `useProgressionPlayback.ts`
- [x] [Review][Patch] First effect bounds check — `activeIndex !== null && activeIndex < chords.length` before array access. `useProgressionPlayback.ts`
- [x] [Review][Patch] Keyboard listener registered once — handler reads `next`/`prev` via `getState()`; effect deps now `[]`, no churn on re-render. `useProgressionPlayback.ts`
- [x] [Review][Patch] `aria-current` — now `active ? 'true' : undefined` (omitted when inactive). `ProgressionBuilder.tsx`
- [x] [Review][Patch] aria-labels clarified — "Previous/Next chord in progression". `ProgressionBuilder.tsx`

**Verified correct — no change (false positive):**
- [x] [Review][Dismiss] "Type mismatch in savedRef" — `savedRef.chordName: string | null` is **intentionally** wider than `ProgressionChord.chordName`: it snapshots `fretboardStore.chordName`, which is genuinely `string | null` (null = scale view). Narrowing it to `string` would drop the null case and break AC8 restore. Left as-is with a clarifying comment.

**Deferred:**
- [x] [Review][Defer] prev() treats null like next() — Unintuitive (typically "previous" from no selection → last item), but aligns with spec intent (clamp, not wrap). Design decision, not a bug. `progressionStore.ts:64–75` — deferred, design decision aligned with spec

## Dev Notes

### The one thing to get right: a chord needs a root AND a quality
`data/chords.js` defines chords as **interval sets keyed by quality** (`'Major': { intervals: [0,4,7] }`, 12 total) — there are **no fixed fret shapes and no root baked in**. `FretboardCanvas` renders a chord via:
```
if (chordName) { const chord = CHORDS[chordName]; return calculateChordDots(chord.intervals, rootNote, tuning, capoPosition) }
```
(`components/FretboardCanvas.tsx:60-66`). So the displayed shape = `chordName` (quality) **+** `fretboardStore.rootNote`. A musically meaningful progression ("C → Am → F → G") therefore requires each entry to carry **its own root**, which the shared `ChordLibrary` UI does not capture (it only sets `chordName`, inheriting the single shared `rootNote`). **This is why the builder has its own root selector** and each `ProgressionChord` stores `{ rootNote, chordName }`. Stepping applies both. This is the core design decision — see D1.

### Design decisions (defaults chosen; flagged as questions at end)
- **D1 — Add via root+quality selectors** (not "capture current chord"): self-contained, unambiguous, no dependency on the fretboard's current state. See Open Questions Q1 if you'd prefer an "add current chord" affordance instead/additionally.
- **D2 — Reorder via up/down buttons, not drag:** the epic says "drag **or** up/down". Drag needs a new dep (e.g. `dnd-kit`) — out of scope and would need approval per the hard constraints. Up/down fully satisfies the AC with zero deps.
- **D3 — Fretboard sync lives in a hook, not in the store:** keeps `progressionStore` a pure data store (trivially unit-testable without mocking `fretboardStore`) while still following the codebase's "Zustand outside React via `getState()`" pattern (same technique `apiClient.ts` uses with `authStore`). The hook is the single writer into `fretboardStore` for playback.
- **D4 — Step clamps at the ends** (does not wrap): predictable for a writing tool; `next()` at the last chord stays put. Change to wrap only if Voice prefers (Q2).
- **D5 — In-session only:** no `progression` API route exists in the architecture's fixed API surface, and the epic explicitly says no server persistence. Do **not** invent a route or a migration.

### What already exists — extend, do not recreate
- `stores/fretboardStore.ts` — `chordName: string | null` + `setChordName`; `rootNote` + `setRootNote`; exported `DEFAULT_FRETBOARD_STATE`. Setting a chord already overrides scale rendering. **No change needed to this store.**
- `features/library/ChordLibrary.tsx` — the premium-gating reference: `isPremium` from `subscriptionStore`, `variant` `'active'|'default'|'preview'|'locked'`, `onPaywallTrigger`. Mirror this for the progression tab gate.
- `features/library/LibraryPanel.tsx` — tab host (`'scale' | 'chord'`), shared `tabs`/`tabContent` used by both desktop `aside` and mobile `Sheet`, and the `PaywallCard` wiring (`paywallAnchor` state). Add the third tab here.
- `features/library/LibraryItem.tsx` — reusable item with `variant="active"` (indigo tint + checkmark) and locked→paywall behavior; reuse for row visuals if it fits.
- `components/shared/PaywallCard.tsx` — do not build a new paywall; use the existing `open`/`anchorEl`/`inline` props already wired in `LibraryPanel`.
- `data/notes.js` — `CHROMATIC_NOTES` (root options), `normalizeNote`, `noteAtSemitone`. `data/chords.js` — `CHORDS`, `CHORD_NAMES`. **Both are preserved `.js` data files — import, do NOT modify or convert to TS.**
- `hooks/useSubscription.ts` — already mirrors server truth into `subscriptionStore.isPremium`; the builder just reads `isPremium`, it does not fetch.
- `App.jsx:14,49` — already threads `chordName` from `fretboardStore` into `FretboardCanvas`; because playback writes into the same store, the fretboard updates with **no App.jsx change**.

### Premium gating reality (server-side truth)
`isPremium` is only ever `true` when the server says the subscription is `ACTIVE` (`useSubscription` → `GET /subscriptions/me`). Locally, with no ACTIVE subscription, the builder will show as **locked** — that is correct behavior, not a bug. To exercise the premium path in dev/tests, set it directly: `useSubscriptionStore.setState({ isPremium: true })`. Per the hard constraints this client flag is **UX only** — but note 4.3 has **no backend surface at all**, so there is nothing to gate server-side here; the gate is purely UX and that is acceptable for this in-session-only feature.

### Testing standards
- Vitest + React Testing Library; tests co-located as `*.test.ts(x)` (see `stores/fretboardStore.test.ts`, `features/library/ChordLibrary.test.tsx`). Run via the frontend package test script.
- Reset Zustand stores between tests with `useXStore.setState(DEFAULT_X)` (stores export their defaults for this).
- Fretboard renders synchronously — assert on store state and rendered dots/labels, never on loading states.
- No new runtime dependencies. If any task seems to need one (e.g. a drag lib), stop — it's out of scope (D2).

### Project Structure Notes
- **New:** `stores/progressionStore.ts` (+ `.test.ts`), `features/library/ProgressionBuilder.tsx` (+ `.test.tsx`), `hooks/useProgressionPlayback.ts` (+ test).
- **Modified:** `features/library/LibraryPanel.tsx` (+ its test) — third tab + gate.
- **Untouched:** `data/*.js` (import only), `components/ui/*` (shadcn generated), `fretboardStore.ts` (read/write via existing actions only), `App.jsx` (no change — sync flows through the store).
- Placement matches `architecture.distillate.md#Frontend Directory Structure` (`features/library/`, `stores/`, `hooks/`) and the UX spec's Phase-3 "chord progression components".

### References
- [Source: epics.distillate.md#Story 4.3: Chord Progression Builder] — AC source (add/reorder/remove/step/active-highlight/`useProgressionStore`/no-persistence)
- [Source: ux-design-specification.distillate.md#Component Roadmap] — "Phase 3 (premium): … chord progression components"
- [Source: architecture.distillate.md#State Management] — Zustand store idiom; "Fretboard renders from synchronous Zustand state only — never shows a loading state"
- [Source: architecture.distillate.md#Component Boundaries] — "Zustand outside React via `getState()`" (the `apiClient`/`authStore` pattern reused by the playback hook)
- [Source: architecture.distillate.md#API Design] — fixed API surface contains **no** progression route → in-session store only, no invented routes
- [Source: components/FretboardCanvas.tsx#dots useMemo] — chord shape = `calculateChordDots(intervals, rootNote, tuning, capo)`; the reason each entry needs a root
- [Source: features/library/ChordLibrary.tsx] — premium-gate + `LibraryItem` variant pattern to mirror
- [Source: features/library/LibraryPanel.tsx] — tab host + `PaywallCard` wiring to extend

## Open Questions (resolve at dev kickoff — defaults chosen, safe to proceed)

- **Q1 (add UX):** Add chords via the builder's own **root + quality selectors** (default, D1), or additionally offer an "＋ Add current fretboard chord" button that captures the live `rootNote`/`chordName`? Default: selectors only. The capture button is a small add-on if Voice wants it.
- **Q2 (step behavior):** Clamp at the ends (default, D4) or **wrap** around? Default: clamp.
- **Q3 (reorder):** Up/down buttons (default, D2, zero-dep) — confirm drag-and-drop is not required for v1 (it would need a new dependency + approval).
- **Q4 (restore on exit):** On leaving the builder, restore the exact pre-playback `rootNote` + clear `chordName` (default), or just clear `chordName` and leave `rootNote` wherever stepping left it? Default: restore both (least surprising for the scale explorer).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story)

### Debug Log References

- Initial `ProgressionBuilder.test.tsx` "click a row" test failed with a multiple-elements error: `getByRole('button', { name: /A Minor/ })` matched the row-select button **and** the "Move/Remove A Minor" buttons (all carry the label). Fixed by giving the row-select button an explicit `aria-label="Select {label}"` and querying `{ name: 'Select A Minor' }`. No production behavior change.

### Completion Notes List

Open-Question decisions (per Voice's "run with the defaults"): **Q1** — add via root+quality selectors (no "add current chord" button). **Q2** — step clamps at the ends (no wrap). **Q3** — up/down reorder, no drag dependency. **Q4** — restore the exact pre-playback `rootNote` + `chordName` on exit.

Implementation notes:
- **Root+quality model:** each `ProgressionChord` carries its own `rootNote` + `chordName`; stepping applies both to `fretboardStore`, which renders the shape via the existing `calculateChordDots(intervals, rootNote, …)` path. No change to `fretboardStore`, `FretboardCanvas`, `chords.js`, or `App.jsx` — playback flows entirely through existing store actions.
- **Native `<select>` for the add-row (deviation from the story's shadcn `Select`):** the repo's `Select` is Base-UI/portal-based and has **zero existing test coverage** (only `ControlBar.tsx` uses it, untested), so driving its popup in jsdom is unproven and flaky. Native selects are fully accessible, robust under `userEvent.selectOptions`, and the UX spec itself specifies native OS pickers on mobile. Styled with the app's border/bg tokens for visual consistency. Flagging for CR in case visual parity with the control bar is preferred later.
- **Clean-exit safety (AC8):** the playback hook only ever restores/clears the fretboard if it actually took it over (snapshot set on first activation). If the user opens the builder but never steps, unmount leaves the fretboard exactly as-is — so it never wipes a chord selected via the Chord Library.
- **Keyboard safety:** the ←/→ listener is only mounted while `ProgressionBuilder` is (premium + panel open + progression tab), ignores form-control focus, and no-ops on an empty progression — inert for the mode-chip and freeform keyboard flows.
- **In-session only (AC7):** new `useProgressionStore`, no API route, no migration, no persistence — matches the fixed API surface (no progression endpoint) and the epic's explicit "no server persistence".

Validation: `pnpm vitest run` → **241 tests / 23 files green** (44 relate to this story: 22 store + 8 builder + 3 hook + 2 panel + prior panel tests); `pnpm type-check` clean; `pnpm lint` clean. No frontend data-file or `components/ui/` edits.

### File List

**New**
- `frontend/src/stores/progressionStore.ts`
- `frontend/src/stores/progressionStore.test.ts`
- `frontend/src/features/library/ProgressionBuilder.tsx`
- `frontend/src/features/library/ProgressionBuilder.test.tsx`
- `frontend/src/hooks/useProgressionPlayback.ts`
- `frontend/src/hooks/useProgressionPlayback.test.tsx`

**Modified**
- `frontend/src/features/library/LibraryPanel.tsx` (third "Progression" tab + premium gate)
- `frontend/src/features/library/LibraryPanel.test.tsx` (premium/non-premium tab tests)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (4-3 → review; epic-4 → in-progress)

### Change Log

- 2026-08-31 — Story 4.3 implemented: `useProgressionStore` (in-session chord sequence), `ProgressionBuilder` (add via root+quality selectors, up/down reorder, remove, Prev/Next + ←/→ stepping, active highlight, clear), `useProgressionPlayback` (active-chord→fretboard sync + keyboard stepping + clean restore on exit), and a premium-gated "Progression" tab in `LibraryPanel`. Pure frontend, no new deps, no backend/migration. 44 new/updated tests; full suite 241 green; type-check + lint clean. Status → review.
