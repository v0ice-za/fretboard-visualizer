# Story 7.3: URL-State Hardening

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a guitarist sharing a link,
I want the recipient to see exactly what I see — and nothing they aren't entitled to,
so that shared fretboard links are lossless, safe, and never leak private data.

## Acceptance Criteria

1. **`?mode=<index>`** written to the URL when a mode overlay is active, omitted otherwise; hydrated only if it parses as an integer AND `0 <= index < MODES.length` (7 — see `utils/fretboardUtils.ts`'s `MODES` array). Investigate at implementation time whether "valid for the hydrated scale" means anything beyond that range check today (see Dev Notes — Open Question 1); if it doesn't, the range check is both necessary and sufficient and should be documented as such in the story's Completion Notes.
2. **`?chord=<type>&croot=<note>`** written to the URL while a chord is shown (`chordName` set); hydrated only if `type` is a key of `CHORDS` (`data/chords.js`) AND `croot` matches `ROOT_NOTE_RE` (`/^[A-G]#?$/`, already defined in `useUrlState.ts`). Call order on hydration must be `setChordName(type)` then `setChordRoot(root)` — `setChordName` resets `chordRoot` to `null` in the same `set()` (see `stores/fretboardStore.ts:74`), so the reverse order silently drops the root. `croot` alone (no `chord`) is meaningless — only hydrate `croot` when `chord` also hydrates successfully.
3. **Entitlement guard**: a premium-only predefined tuning (any `TUNINGS` key not in `FREE_TUNINGS`, `data/freeTunings.ts`) or a locked chord type (`CHORD_NAMES` index `>= FREE_TIER_CHORD_COUNT`, `features/library/ChordLibrary.tsx`) named in the URL is applied only once subscription status resolves as premium; otherwise falls back to Standard E tuning / no chord. Two failure modes to avoid, both explicitly called out because they're easy to get wrong:
   - **No premium flash**: never apply the gated value optimistically and then revert — it must not render at all until premium is confirmed, or never render if it's confirmed non-premium.
   - **No discarding a valid link for a premium user on slow load**: subscription status resolves asynchronously (`useSubscription`'s TanStack Query, `GET /api/v1/subscriptions/me`) — a premium user's own shared link must not be silently abandoned just because the query hadn't settled yet at the moment `useUrlState`'s mount effect ran. Reuse `useThemeGuard.ts`'s sequencing pattern: a ref-gated effect that fires once, the first time `isAuthenticated && isPremium` both become true, rather than a one-shot check at mount. See Dev Notes — Open Question 2 for what "confirmed non-premium" needs to mean here (there's a real gap: an anonymous/free user has no pending query at all, so "wait" vs. "fall back now" needs a decision).
4. **Custom (user-saved) tuning names in `?tuning=` always fall back to Standard E** — never resolved against any custom-tuning list, the current viewer's own or otherwise (private data: a bare name match across accounts/sessions is unsafe and meaningless). The existing hydration check (`(TUNINGS as Record<string,string[]>)[urlTuning]`) already only matches the static predefined `TUNINGS` object, so this AC may already hold — add an explicit regression test proving it (see Task 5) rather than assuming, and make sure the new entitlement-guard logic in AC 3 doesn't accidentally broaden the check to also consult `useCustomTunings`.
5. **Strict numeric parsing**: `capo=3abc` is ignored (capo stays at its current/default value) — current code uses `parseInt(urlCapo, 10)`, which returns `3` for `"3abc"` (parses the numeric prefix and silently drops the rest). Replace with a full-string numeric match (e.g. `/^\d+$/.test(urlCapo)` before parsing, or `String(parsed) === urlCapo` after) so any trailing garbage rejects the whole value.
6. **Duplicate freeform marks in `?marks=` are de-duplicated** on hydration — `?marks=3-2,3-2,7-0` yields exactly 2 marks, not 3. (`fretboardStore.toggleFreeformMark` already dedupes on user interaction; `setFreeformMarks`, used by `useUrlState`'s hydration, does not — it just slices to 150.)
7. **Precedence unchanged**: URL still beats a restored saved session (FR-5b / Story 4.4). `useSessionSync.ts` protects this today via a `urlHad` snapshot (`{tuning, capo, marks}`) captured synchronously in a lazy `useState` initializer, read *before* any effect (including `useUrlState`'s own hydration effect) commits — this ordering is load-bearing and must not be disturbed. `mode`/`chord`/`croot` are not part of saved-session state (Story 4.4 only persists `tuning`/`capoPosition`/`freeformMarks`), so no change to `useSessionSync.ts` itself should be needed — confirm this stays true, don't assume.
8. **Tests**: table-driven valid/invalid cases per param (mode, chord+croot, capo strict parsing, marks dedup); free vs. premium hydration for the entitlement guard (including the "query not yet settled" case); a full round-trip test per param (set in store → appears in URL → fresh hydration from that URL reproduces the same store state).
9. **`useUrlState` stays the single URL↔store boundary** — no new routes, no second hook reading/writing `location.search` for fretboard state.

## Tasks / Subtasks

- [x] **Task 1: `?mode=` hydration + push** (AC: 1, 8)
  - [x] 1.1 Push effect: add `params.mode = String(state.modeIndex)` when `state.modeIndex !== null`, omitted otherwise.
  - [x] 1.2 Hydration effect: parse `?mode=`, validate integer in `[0, MODES.length)`, call `setModeIndex(parsed)`.
  - [x] 1.3 Resolve Open Question 1 (Dev Notes) and document the resolution in Completion Notes.
  - [x] 1.4 Tests: valid mode index hydrates; out-of-range (negative, `>= MODES.length`) and non-numeric values are ignored; round-trip (`setModeIndex` → URL → re-hydrate).

- [x] **Task 2: `?chord=&croot=` hydration + push** (AC: 2, 8)
  - [x] 2.1 Push effect: add `params.chord = state.chordName` and `params.croot = state.chordRoot ?? state.rootNote` when `state.chordName` is set (mirror the `chordRoot ?? rootNote` convention already used by `FretboardCanvas`/`ChordRelationships`); omit both when no chord is shown.
  - [x] 2.2 Hydration effect: validate `chord` against `CHORDS` keys and `croot` against `ROOT_NOTE_RE`; call `setChordName` THEN `setChordRoot` (never the reverse — see AC 2). If `chord` is present but invalid, or `croot` is present but invalid, hydrate neither (don't set a chord with no root, and don't set a root with no chord).
  - [x] 2.3 Tests: valid chord+croot hydrates in the correct call order (assert `chordRoot` is NOT null after — this is exactly the bug class Story 7.1 fixed in `useProgressionPlayback`, don't reintroduce it here); unknown chord type ignored; malformed `croot` ignored; `croot` with no `chord` is a no-op; round-trip.

- [x] **Task 3: Entitlement guard for `?tuning=` and `?chord=`** (AC: 3, 4)
  - [x] 3.1 Design the guard using `useThemeGuard.ts`'s ref-gated "fires once on the gain transition" pattern — read it fully first, it's the established precedent for exactly this async-entitlement-sequencing problem.
  - [x] 3.2 Resolve Open Question 2 (Dev Notes: what does an anonymous/never-going-to-be-premium viewer do — wait forever, or fall back immediately?) before writing the gate condition.
  - [x] 3.3 Gate applying a URL-named premium tuning (not in `FREE_TUNINGS`) and a URL-named locked chord (index `>= FREE_TIER_CHORD_COUNT`) behind this resolution. A free-tier tuning/chord named in the URL is unaffected (hydrates immediately, as today).
  - [x] 3.4 Explicit regression test: a custom-tuning name in `?tuning=` never resolves via `useCustomTunings`/`resolveCustomTuningStrings` — always Standard E (AC 4).
  - [x] 3.5 Tests: premium user, slow-resolving subscription query, URL names a premium tuning → tuning ends up correct once the query resolves, no flash of Standard E in between that then "commits" incorrectly; free user with the same URL → stays on Standard E, no flash of the premium tuning. Same two cases for a locked chord.

- [x] **Task 4: Strict capo parsing** (AC: 5)
  - [x] 4.1 Replace `parseInt(urlCapo, 10)` validation with a full-string match before accepting the value.
  - [x] 4.2 Tests: `capo=3abc` ignored (stays at current value); existing valid/boundary/out-of-range capo tests (`useUrlState.test.ts` already has several) must still pass unchanged.

- [x] **Task 5: De-duplicate `?marks=` on hydration** (AC: 6)
  - [x] 5.1 De-dupe the parsed `{fret, string}` array before calling `setFreeformMarks` (e.g. key by `` `${fret}-${string}` `` through a `Set`/`Map`).
  - [x] 5.2 Test: `?marks=3-2,3-2,7-0` → exactly 2 marks.

- [x] **Task 6: Precedence regression check** (AC: 7)
  - [x] 6.1 Re-read `useSessionSync.ts` fully; confirm the `urlHad` lazy-`useState` snapshot still captures the URL correctly given any restructuring Tasks 1–5 make to `useUrlState`'s hydration effect (e.g. if it's split into multiple effects, `urlHad`'s synchronous pre-effect read must still run before ALL of them).
  - [x] 6.2 Add/confirm a test (in `useSessionSync.test.tsx` or `useUrlState.test.ts`, whichever fits better) proving a URL-provided `tuning`/`capo`/`marks` still wins over a restored session value — this already has coverage from Story 4.4; don't let it regress, extend it if needed rather than skip it.

- [x] **Task 7: Verification** (AC: 8, 9)
  - [x] 7.1 `cd frontend && npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all green.
  - [x] 7.2 Live browser check: construct a URL with every new param (`?mode=`, `?chord=`, `?croot=`) plus existing ones, confirm correct hydration; test a premium-tuning/locked-chord URL as both a free and premium user (`VITE_DEV_UNLOCK_PREMIUM=true`); test `capo=3abc` and a duplicated `marks=` value.

## Dev Notes

### Current state of `hooks/useUrlState.ts` (full file read — 77 lines)
Two effects: (1) mount-only hydration reading `tuning`/`key`/`scale`/`capo`/`notes`/`marks` from `searchParams`, each independently validated and applied via the matching `fretboardStore` setter; (2) a push effect (deps: every hydrated field) that reads `useFretboardStore.getState()` and calls `setSearchParams(params, {replace: true})` with every non-default field. `ROOT_NOTE_RE = /^[A-G]#?$/` is already defined here — reuse it for `croot`, don't redefine. No `mode`/`chord`/`croot` params exist today. No subscription-store awareness at all today.

### Why this story only touches `useUrlState.ts` (+ its test) in the frontend
No other file needs to change for the money-cases (AC 1, 2, 4, 5, 6). The entitlement guard (AC 3) is the one piece needing new imports into `useUrlState.ts`: `useSubscriptionStore` (already read by many hooks, e.g. `useCustomTunings.ts`), and reading the shape of `useThemeGuard.ts`'s pattern (not importing that hook itself — `useUrlState` has a different trigger condition: react to a URL param that named a gated value, not "restore a stored premium theme").

### Open Question 1 — what makes `?mode=` "valid for the hydrated scale"?
`MODES` (`utils/fretboardUtils.ts`) is a fixed 7-entry array (Ionian–Locrian); `modeIndex` is validated today purely as `0 <= i < MODES.length` everywhere it's consumed (`FretboardCanvas`'s `generateAriaLabel`/dot-calculation logic), with NO coupling to the currently-active `scaleName` — a mode overlay computes its own notes from `MODES[modeIndex].scaleName`, independent of what scale is selected. `ModeChipsRow` is also rendered unconditionally in `App.jsx` (not gated on scale type). So as far as the current codebase is concerned, there may be no additional "valid for the scale" rule beyond the range check — but confirm this by searching for any scale-dependent mode gating before concluding the range check is sufficient; don't guess.

### Open Question 2 — anonymous/free viewer and the entitlement guard
`useThemeGuard`'s restore effect fires once "the first time both `isAuthenticated` and `isPremium` are true" — it has no opposite "give up and fall back" path tied to *failing* to reach premium, because its only fallback path is for a LOSS transition (previously premium, now not). Story 7.3's AC 3 needs both directions for a URL param: apply once premium is confirmed, AND fall back once it's confirmed the viewer will NOT be premium (so a non-premium viewer doesn't see a permanently-pending state). An anonymous viewer (never authenticated) has no subscription query running at all (`useSubscription`'s query is `enabled: isAuthenticated && !DEV_UNLOCK_PREMIUM`) — for them, "confirmed non-premium" is immediate (there's nothing to wait for). An authenticated-but-still-loading viewer needs to actually wait for the query to settle. Decide and document the exact condition for "confirmed non-premium, stop waiting and fall back now" — likely something like `!isAuthenticated || (query settled AND isPremium === false)`, which means `useUrlState` may need more than the bare `isPremium` boolean from `useSubscriptionStore` (consider whether `useAuthStore`'s `selectIsAuthenticated` plus a settled-query signal needs to be threaded in, vs. accepting a brief "always wait while authenticated" window that's bounded by the query's own retry/error behavior — `useSubscription.ts` sets `retry: false`, so it settles quickly either way).

### Architecture compliance
- Frontend-only. No new API routes, no backend, no schema changes.
- `useUrlState` remains the sole URL↔store boundary (architecture's "Data Flow" section: `URL query params → useUrlState → useFretboardStore → Fretboard`).
- Query params stay camelCase-free single lowercase words matching existing convention (`tuning`, `key`, `scale`, `capo`, `notes`, `marks` → new: `mode`, `chord`, `croot`).
- Do NOT modify frozen data files (`data/chords.js`, `data/scales.js`, `data/tunings.js`) or `utils/musicTheory.js`.
- `useSessionSync.ts` (Story 4.4) must not need changes for the mode/chord/croot additions — it only ever restores `tuning`/`capoPosition`/`freeformMarks`. If Task 6 finds it DOES need a change, that's a signal something in Tasks 1–5 broke an assumption — investigate before editing it.

### Previous-work intelligence
- **Story 7.1** fixed the exact "`setChordName` resets `chordRoot`, so call order matters" bug in `useProgressionPlayback`. Task 2 of this story hits the identical hazard on the hydration path — same fix, same call order (`setChordName` then `setChordRoot`), same "transiently null" caveat already documented in `fretboardStore.ts:70-74`'s comment.
- **Story 7.2** removed `audioStore.enabled`; irrelevant to this story but confirms the project's current state (both 7.1 and 7.2 are `done`, no code review was run on either per owner's choice — don't assume either one went through `bmad-code-review`).
- **Story 4.4** (`useSessionSync.ts`) established the `urlHad`-lazy-`useState`-before-any-effect pattern this story's Task 6 must preserve. Also established the "ref-gated, fires once on entitlement gain" pattern alongside Story 4.5's `useThemeGuard.ts` — Task 3 is the third hook to need this exact pattern; by now it's a house style, not a one-off.
- **Known test-environment fact** (from `useSubscription.ts`'s own comment): `VITE_DEV_UNLOCK_PREMIUM` is gated on `import.meta.env.MODE === 'development'` specifically because Vitest's `DEV` flag is also `true` and would otherwise leak the dev-unlock into test runs. Entitlement-guard tests (Task 3.5) should set `useSubscriptionStore`/`useAuthStore` state directly, not rely on env vars.

### Testing standards
- Vitest + Testing Library, co-located `*.test.ts`, `@/` alias.
- `useUrlState.test.ts` already has an established pattern: a `wrapper(initialEntries)` helper wrapping `MemoryRouter`, `renderHook(() => useUrlState(), {wrapper: wrapper([...])})` for hydration tests, and `act(() => useFretboardStore.getState().setX(...))` + reading `useSearchParams()` from the same `renderHook` for push tests. Extend this pattern; don't invent a new one.
- For entitlement-guard tests, also set `useSubscriptionStore.setState({isPremium: ...})` and `useAuthStore.setState(...)` as needed per the existing precedent in `useThemeGuard.test.tsx`/`useSessionSync.test.tsx` (read one of those for the exact setup shape before writing Task 3's tests).
- 671 tests pass at story start (0 known-flaky at last run; the previously-flaky `FretboardCanvas` "<100ms" perf test passed in the full run during Story 7.1/7.2 verification).

### Project structure notes
- All changes are within `frontend/src/hooks/useUrlState.ts` + `useUrlState.test.ts`, with Task 6 possibly touching `useSessionSync.test.tsx` (test-only, to add/confirm precedence coverage — do not modify `useSessionSync.ts` unless Task 6.1 proves it's actually necessary).
- No new files expected for this story.

### References
- [Source: _bmad-output/planning-artifacts/epics.distillate.md#Story 7.3]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-09-29.md#4.3] (if present — same content as the epics distillate entry)
- [Source: _bmad-output/planning-artifacts/architecture.distillate.md] (Data Flow, Naming Conventions, Enforcement Rules sections)
- [Source: frontend/src/hooks/useUrlState.ts] (file to modify, read in full)
- [Source: frontend/src/hooks/useUrlState.test.ts] (existing test pattern to extend)
- [Source: frontend/src/hooks/useThemeGuard.ts] (entitlement-sequencing pattern to reuse)
- [Source: frontend/src/hooks/useSessionSync.ts] (precedence mechanism this story must not break)
- [Source: frontend/src/stores/fretboardStore.ts] (`setChordName` resets `chordRoot` — call-order hazard)
- [Source: frontend/src/hooks/useCustomTunings.ts] (why custom tunings must never resolve by URL name)
- [Source: _bmad-output/implementation-artifacts/7-1-key-root-marker-and-fretboard-legend.md] (same `setChordName`→`setChordRoot` hazard, already fixed once this epic)
- [Source: _bmad-output/implementation-artifacts/7-2-explicit-play-controls.md] (immediately preceding story; confirms no backend/API changes this epic)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- RED: 17 new tests failed against the original hook (mode/chord push+hydrate, guard, strict capo, marks dedup) — confirmed before implementing.
- GREEN: `useUrlState.test.ts` 62/62; full suite 711/711 (was 671); `tsc --noEmit`, `npm run lint`, `npm run build` clean (chunk-size warning pre-existing).

### Completion Notes List

- **OQ1 resolved — range check is necessary and sufficient.** No scale-dependent mode gating exists: `ModeChipsRow` renders unconditionally in `App.jsx`, and `fretboardUtils` (`generateAriaLabel`, `calculateFretboardDots`) only checks `0 <= modeIndex < MODES.length`; overlay notes come from `MODES[i].scaleName`, independent of the active `scaleName`. `?mode=` is hydrated iff it is a pure unsigned integer (`/^\d+$/`) below `MODES.length`.
- **OQ2 resolved — no "confirmed non-premium" signal is needed.** On a hard load *every* viewer starts with `isAuthenticated=false` (`bootstrapAuth` restores the session from the refresh cookie asynchronously), so "anonymous → fall back now and give up" would discard a premium user's own link. Instead: the fallback (Standard E / no chord) is simply the visible default from mount, and the URL-named gated value is parked in a ref and applied once, the first time `isAuthenticated && isPremium` both hold (same ref-gated "fires once on gain" pattern as `useThemeGuard`/`useSessionSync`). There is no pending/blank state and no premium flash. Race protection mirrors `useSessionSync`: the gated tuning/chord only applies if that field still holds its default (user didn't change it meanwhile). The ref is cleared after applying, so a later entitlement flip never re-applies. Trade-off (accepted, documented): a free viewer who upgrades/logs in as premium later in the same tab gets the link's gated value applied then — only if they never touched that field.
- Guard requires `isAuthenticated && isPremium` (house style). Consequence: with `VITE_DEV_UNLOCK_PREMIUM` and no login, gated URL values stay on the fallback — dev-only, never reachable in production (prod `isPremium` is forced false when unauthenticated).
- **AC2:** `chord` and `croot` hydrate only as a valid pair; `setChordName` → `setChordRoot` order enforced on both the immediate and the guarded path. Push writes `croot = chordRoot ?? rootNote` (per Task 2.1), so a chord with null `chordRoot` round-trips to an explicit root equal to `rootNote` — render-equivalent.
- **AC4:** tuning hydration still matches only the static `TUNINGS` object; guard never consults `useCustomTunings`. Regression test with a premium viewer + custom name → Standard E.
- **AC5:** capo validated with `/^\d+$/` before `Number()` — rejects `3abc`, `3.5`, ` 3`, `+3`, `0x3`, `03a`. Existing capo tests unchanged and green.
- **AC6:** marks de-duplicated by `${fret}-${string}` key, first occurrence order preserved.
- **AC7:** `useSessionSync.ts` unchanged (it only restores tuning/capo/marks; its `urlHad` lazy-`useState` snapshot still runs during render, before all of `useUrlState`'s effects). New integration test (`useSessionSync.test.tsx`, both hooks under `BrowserRouter`) proves a URL-named *premium* tuning + capo + marks still beat a restored session across the anonymous → premium hard-load sequence.
- **AC9:** `useUrlState` remains the sole URL↔store boundary; no new routes or hooks.
- **Live browser check (Task 7.2), Vite dev server:**
  - Anonymous viewer: `?tuning=Open+A&...&capo=3abc&mode=4&chord=Augmented&croot=D&marks=3-2,3-2,7-0` → Standard E, no chord, capo dropped, Mixolydian active, URL rewritten to `marks=3-2,7-0`.
  - Premium path: imported the live Zustand stores into the page and simulated auth then premium resolving → tuning switched to Open A and D Augmented rendered. `Open A` was the only tuning written after that point (no flash/revert), and the URL was updated with `chord`/`croot`. Screenshot confirmed Open A strings + chord tones.
  - The backend was not running, so real login and a real subscription were not exercised end-to-end.

### File List

- frontend/src/hooks/useUrlState.ts (modified)
- frontend/src/hooks/useUrlState.test.ts (modified)
- frontend/src/hooks/useSessionSync.test.tsx (modified — AC7 integration test)
- _bmad-output/implementation-artifacts/7-3-url-state-hardening.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

### Change Log

- 2026-11-17: Implemented Story 7.3. `?mode=`, `?chord=&croot=` push and hydration; entitlement guard for premium tunings and locked chords (ref-gated, applies once premium is confirmed, no flash); strict capo parsing; marks de-duplication; 41 new tests (671 → 711, plus one URL-precedence integration test). Status → review.
