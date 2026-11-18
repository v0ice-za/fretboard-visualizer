# Story 7.4: Left-Handed Mode

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a left-handed guitarist,
I want the fretboard mirrored so it matches how I hold my guitar,
so that shapes and positions on screen map directly onto my instrument without mental flipping.

## Acceptance Criteria

1. **Toggle (free)** — a "Left-handed" `IconButton` sits in the ControlBar's right-aligned action cluster **immediately after the theme toggle** (`components/ControlBar.tsx:286-299`). It is available to every viewer (anonymous, free, premium — no gate, no lock badge). It carries `aria-pressed={leftHanded}`, `active={leftHanded}`, `aria-label="Left-handed mode"`, a tooltip, and a `hidden md:inline` text label (same pattern as Notes/Draw).
   - Do NOT put it in the Account sheet next to `ThemePicker` — that sheet is reachable only when authenticated (`ControlBar.tsx:396`), which would make a free feature login-gated.
2. **Persistence** — the preference persists in `localStorage` (key `guitar-app-left-handed`) and survives reload. It is **never** written to the URL (`useUrlState`) and **never** part of saved-session state (`useSessionSync`). Storage access is fully guarded: a throwing or corrupt `localStorage` degrades to `false`, never crashes module load or the toggle.
3. **Mirroring** — when on, the fretboard mirrors horizontally: nut on the RIGHT, frets ascend leftward (fret 1 nearest the nut on the right, fret 24 at the far left). String order (vertical) is unchanged: high e on top, low E on the bottom.
4. **Coordinate mapping, not a transform** — implemented as `x → VIEWBOX_WIDTH − x` inside `FretboardCanvas`, NOT a CSS `transform: scaleX(-1)` / SVG `transform="scale(-1,1)"`. No element in the SVG may carry a mirroring transform. Text (nut labels, fret numbers, dot note names), inlays, the capo indicator, the capo dim overlay, and the mode glow filter all render upright and in the correct mirrored position.
5. **Hit-targets mirror with the dots** — in both modes, clicking/activating the hit-target over fret N on string S calls `onFretClick({ fret: N, string: S })`, and that hit-target is horizontally centred on the (mirrored) dot position for (N, S). Tested in both modes.
6. **Keyboard / Tab order follows visual direction** — the freeform hit-targets' DOM (= Tab) order within each string row runs visually left→right in both modes: frets 0→24 right-handed, frets 24→0 left-handed. Row order is unchanged. Do NOT add arrow-key fret navigation (see Dev Notes — "Keyboard: why Tab order, not arrows").
7. **Mobile initial scroll shows the nut** — the scroll wrapper (`data-testid="fretboard-scroll-wrapper"`, overflows below ~450px) is scrolled so the nut is in view on mount and whenever `leftHanded` changes: `scrollLeft = scrollWidth − clientWidth` when left-handed, `0` when right-handed. It must NOT re-scroll on other re-renders (don't fight the user's manual scroll).
8. **Proportional fret widths preserved** — the logarithmic geometry (`getFretLineX`) and dot scaling (`getDotScale`) are unchanged; mirroring only reflects x.
9. **Everything else still correct when mirrored** — 7.1 key-root rings + legend, chord highlights, scale/mode dots + glow, freeform marks, capo dim (covers the frets *behind* the capo, i.e. on the nut side — the RIGHT when left-handed) and capo indicator. The legend (HTML, below the board) is NOT mirrored. `<100ms` re-render NFR holds (mirroring is O(1) per element).
10. **Scope of the preference** — the main board (`App.jsx`) and the Custom Tuning Creator live preview (`features/settings/CustomTuningCreator.tsx:90`) both honour the preference, so a lefty never sees a right-handed board anywhere.
11. **Live browser check** at desktop width and at 375px, in both modes (toggle on/off, reload persists, nut visible on 375px load, freeform click lands on the clicked fret, capo + chord + key-root ring look right mirrored).

## Tasks / Subtasks

- [x] **Task 1: Preference store** (AC: 2)
  - [x] 1.1 Create `frontend/src/stores/preferencesStore.ts` — Zustand store `usePreferencesStore` with `leftHanded: boolean`, `setLeftHanded(v: boolean)`, `toggleLeftHanded()`. Mirror `stores/audioStore.ts` exactly: `STORAGE_KEY = 'guitar-app-left-handed'`, guarded `readPrefs()` (try/catch around `getItem` + `JSON.parse`, accept only a strict `boolean`, else `false`), guarded `persist()`. Store `{ leftHanded }` as JSON so future prefs can join the same key.
  - [x] 1.2 `frontend/src/stores/preferencesStore.test.ts` — default `false`; set → persisted JSON; pre-seeded `{leftHanded:true}` hydrates true (use `vi.resetModules()` + dynamic import, as `audioStore.test.ts` does); corrupt JSON → false; non-boolean (`"yes"`, `1`) → false; throwing `localStorage` (getItem + setItem) → no crash, in-memory toggle still works.

- [x] **Task 2: Mirroring helper** (AC: 3, 4, 8)
  - [x] 2.1 In `frontend/src/utils/fretboardUtils.ts` add a pure `export function mirrorX(x: number, leftHanded: boolean): number` → `leftHanded ? VIEWBOX_WIDTH - x : x`. Do NOT change `getFretLineX`, `getDotCx`, or any `calculate*` function — they stay right-handed canonical; mirroring happens only at render time in `FretboardCanvas` so every other consumer (aria-label, legend, chord utils, tests) is untouched.
  - [x] 2.2 Unit tests: identity when false; `mirrorX(NUT_X, true) === VIEWBOX_WIDTH - NUT_X` (860); involution `mirrorX(mirrorX(x,true),true) === x`; `NUT_LABEL_X` (16) ↔ `FRET_AREA_RIGHT` (884) — confirms the mirrored board fits the viewBox exactly.

- [x] **Task 3: `FretboardCanvas` mirrored rendering** (AC: 3, 4, 5, 6, 8, 9)
  - [x] 3.1 Add prop `leftHanded?: boolean` (default `false`). Keep the component prop-driven — it must NOT read the store itself (the creator preview and tests rely on props).
  - [x] 3.2 Local helpers: `const mx = (x: number) => mirrorX(x, leftHanded)` and for rects `const mRectX = (x: number, w: number) => leftHanded ? VIEWBOX_WIDTH - x - w : x`.
  - [x] 3.3 Apply to EVERY x in the SVG — checklist (line refs are current file):
    - surface rect `x` (`:143`) → `mRectX(NUT_X, FRET_AREA_RIGHT - NUT_X)`
    - capo dim rect (`:153-162`) — width `getFretLineX(capoPosition - 1) || NUT_X` from x=0 → `x = mRectX(0, width)`
    - string lines `x1/x2` (`:168-194`) — three lines per string
    - nut line `x1/x2` (`:199-207`)
    - fret lines — shadow (`+1`), main, specular (`-1`) (`:210-241`); map the final value: `mx(getFretLineX(fret) + 1)` etc. (shading flips sides with the mirror — that's correct for a mirror image)
    - capo indicator `x1/x2` (`:244-255`)
    - inlays `cx` (`:258-281`)
    - nut labels `x={mx(NUT_LABEL_X)}` (`:284-300`)
    - fret numbers `x={mx(getDotCx(fret))}` (`:303-321`)
    - dots / key-root rings / freeform dots: pass `cx={mx(dot.cx)}` to `FretDot` (`:324-366`) — `FretDot` itself is unchanged
    - hit-target rects: `x={mx(cx) - w / 2}` (`:369-402`)
  - [x] 3.4 Tab order (AC 6): when `leftHanded`, iterate frets 24→0 inside each string row when building hit-targets (e.g. build the fret index array then `.reverse()`); keep `key`/`aria-label`/`onFretClick` payload keyed on the REAL fret number.
  - [x] 3.5 Grep the finished file for `transform` and `scale(` — there must be none introduced (AC 4).
  - [x] 3.6 Tests in `FretboardCanvas.test.tsx` (new `describe('left-handed mode')`), each asserting both modes where meaningful:
    - nut `x1` is `NUT_X` (righty) / `VIEWBOX_WIDTH - NUT_X` (lefty)
    - `fret-number-1` x > `fret-number-12` x when lefty (ascending leftward); reverse when righty; fret-number x === `mirrorX(getDotCx(n), lefty)`
    - `nut-label-0` x === `VIEWBOX_WIDTH - NUT_LABEL_X` when lefty; text content unchanged (string order unchanged)
    - inlay-12 circles mirrored; `capo-indicator` x1 mirrored; `capo-dim` rect spans `[VIEWBOX_WIDTH - w, VIEWBOX_WIDTH]` when lefty
    - a root dot (`[data-state="root"]` circle) `cx` is mirrored
    - hit-target: find rect by `aria-label="String 1, fret 5"`, click → `onFretClick({fret:5,string:0})`; its centre `x + width/2` equals the mirrored dot cx for fret 5 — table-driven over `[false, true]` × a few frets incl. 0 and 24
    - Tab order: with `freeformModeActive`, the first `rect[role="button"]` is fret 0 (righty) / fret 24 (lefty) on string 1
    - no element in the SVG has a `transform` attribute containing `scale` (`container.querySelectorAll('[transform]')`) in lefty mode
    - capo + lefty: hit-targets for frets 1..capo-1 still not buttons (behaviour unchanged)

- [x] **Task 4: Mobile initial scroll** (AC: 7)
  - [x] 4.1 Add a `ref` on the scroll wrapper div and a `useLayoutEffect` keyed on `[leftHanded]` only: `el.scrollLeft = leftHanded ? el.scrollWidth - el.clientWidth : 0`. Layout effect (not `useEffect`) so there's no visible frame scrolled to the wrong end.
  - [x] 4.2 Test: stub `scrollWidth`/`clientWidth` via `Object.defineProperty(HTMLElement.prototype, …)` (restore after), render lefty → `scrollLeft` set to the difference; rerender with an unrelated prop change (e.g. `rootNote`) after manually setting `scrollLeft` → value NOT reset; toggle to righty → 0. (jsdom permits assigning `scrollLeft`.)

- [x] **Task 5: Wire the preference** (AC: 1, 2, 10)
  - [x] 5.1 `App.jsx`: `const leftHanded = usePreferencesStore((s) => s.leftHanded);` → `<FretboardCanvas … leftHanded={leftHanded} />`.
  - [x] 5.2 `CustomTuningCreator.tsx`: same selector → pass `leftHanded` to the preview canvas.
  - [x] 5.3 `ControlBar.tsx`: new `IconButton` directly after the theme toggle `Tooltip` (AC 1). Icon: `FlipHorizontal2` from `lucide-react` (present in installed v1.23.0 — no new dependency). Label text `Left-handed` behind `hidden md:inline`; tooltip text "Left-handed mode".
  - [x] 5.4 `ControlBar.test.tsx`: button renders for an anonymous user (no auth), `aria-pressed="false"` → click → `"true"` and `usePreferencesStore.getState().leftHanded === true`; reset the store in `beforeEach`.
  - [x] 5.5 Regression guard: assert in `useUrlState.test.ts` that toggling `leftHanded` does not add any URL param (one small test), so a future refactor can't leak it into the URL.

- [x] **Task 6: Verify** (AC: 9, 11)
  - [x] 6.1 `npx vitest run` (full suite — currently 711 passing), `npx tsc --noEmit`, `npm run lint`, `npm run build` — all clean.
  - [x] 6.2 Live browser check (Vite dev server, Chrome) at desktop and 375px, both modes: nut on the right, fret numbers upright and ascending leftward, string labels upright on the right; capo 3 → dim + amber bar on the nut side; select a chord in a key (e.g. key C, Dm) → key-root ring + legend correct; Draw mode → click fret 5 string 1 marks fret 5; reload → preference persists; 375px reload in lefty → nut visible without manual scroll. Record observations in Completion Notes.

## Dev Notes

### Current state of `components/FretboardCanvas.tsx` (408 lines, full read)
- Prop-driven SVG, `viewBox="0 0 900 220"`, rendered at `width:100%; minWidth:450px` inside a wrapper with `overflowX:auto; touchAction:pan-x`. Below ~450px container width the board scrolls horizontally — today it naturally starts at `scrollLeft=0` (nut visible right-handed). In lefty the nut is at the far right, hence AC 7.
- All x-geometry comes from `utils/fretboardUtils.ts`: `NUT_X=40`, `FRET_AREA_RIGHT=884`, `NUT_LABEL_X=16`, `VIEWBOX_WIDTH=900`, `getFretLineX(n)` (logarithmic), `getDotCx(n)` (mid-column; fret 0 sits ON the nut line). Note `NUT_LABEL_X=16` and `VIEWBOX_WIDTH − FRET_AREA_RIGHT = 16` → the layout is already symmetric, so a pure `900 − x` mirror fits the viewBox with no clipping or new margins.
- Dot data (`calculateFretboardDots` / `calculateChordDots` / `calculateFreeformDots` / `calculateKeyRootMarkers`) carries precomputed `cx`. Mirror at render (`mx(dot.cx)`), not in the util — those functions have their own tests and other consumers.
- `FretDot` (`components/FretDot.tsx`) draws everything at the `cx/cy` it's given: fill circle, mode glow (`filter=url(#fret-dot-mode-glow)`, symmetric blur — unaffected by mirroring), freeform dashed ring, key-root stroke ring, upright `<text>`. **No change to FretDot needed.**
- Hit-targets: 6 × 25 `<rect>`s built string-major then fret-ascending; `tabIndex=0`/`role=button`/`aria-label="String {s+1}, fret {f}"` only when `freeformModeActive && !isBelowCapo`; `onClick`/`onKeyDown(Enter|Space)` → `onFretClick({fret, string})`. The payload must stay the REAL fret — only `x` and iteration order change.
- What must be preserved: every existing `FretboardCanvas.test.tsx` test passes unchanged with `leftHanded` defaulted to false (righty output must be byte-identical); the 7.1 legend/aria-label; capo below-fret gating.

### Why a new `preferencesStore` (not fretboardStore / themeStore / layoutStore)
- `fretboardStore` state is URL-synced (`useUrlState` push effect) and session-synced (`useSessionSync`) — handedness must be neither (AC 2). Keeping it out of that store makes the "never in URL / never in session" guarantee structural.
- `themeStore` is theme-specific with premium-guard semantics (`useThemeGuard`); `layoutStore` is non-persisted UI chrome. A small persisted device-preference store (audioStore pattern) is the right home, and future device prefs (e.g. fret count, note-name style) can join the same key.
- Follow `audioStore.ts` verbatim for storage hardening — the "localStorage can THROW (Safari private mode)" lesson came from 4.5.

### Keyboard: why Tab order, not arrows
The epic AC says "keyboard fret navigation follows VISUAL direction". Today the ONLY keyboard fret navigation is Tab across freeform hit-targets — there is no arrow-key fret navigation. Adding arrows would collide with `hooks/useProgressionPlayback.ts:52-69`, a **window-level** ←/→ handler that only skips INPUT/TEXTAREA/SELECT/contentEditable — an SVG `<rect>` focus would still step the progression. So this story satisfies the AC by making Tab order visual (frets reversed in lefty, AC 6) and explicitly does NOT introduce arrow navigation. If arrow nav is ever wanted, it's a separate story that must also teach the progression handler to ignore fretboard focus.

### Toggle placement decision
Epic text says "settings area alongside the theme control". There are two theme controls: the dark/light `IconButton` in the ControlBar cluster (visible to everyone) and `ThemePicker` inside the Account sheet (authenticated only). Since the feature is explicitly free, it goes beside the ControlBar theme toggle (AC 1). ControlBar is getting crowded on mobile — the icon-only rendering below `md` (same as siblings) keeps it to one extra 36px button; density work is out of scope pending the live UX session (Epic 7 out-of-scope note).

### Architecture compliance
- Frontend-only; no backend, no API routes, no new dependencies (`FlipHorizontal2` already in lucide-react 1.23.0).
- New store under `stores/`; no edits to `components/ui/` (shadcn generated) or `data/*.js`.
- Tailwind v4 CSS-first — no new CSS needed. If you do touch CSS, never put a literal `*/` inside a CSS comment (4.5 GOTCHA: it silently broke the whole stylesheet, caught only by live-loading).
- `useUrlState` remains the single URL↔store boundary (7.3 AC 9) — do not add handedness there.

### Previous-story intelligence (7.1 → 7.3)
- 7.1 added `key-root` rings (rendered after chord dots, `pointerEvents="none"`) and `FretboardLegend` (HTML below the SVG). Rings get `cx={mx(marker.cx)}` like every other dot; the legend needs no change.
- 7.3 hardened `useUrlState` with a push effect enumerating fretboard fields explicitly — a new store field elsewhere cannot leak in, but Task 5.5 pins that down with a test.
- Live-verify trick from 7.3: in the Vite dev page you can `await import('/src/stores/preferencesStore.ts')` from the console to flip state without clicking.
- Pattern from earlier reviews: a reviewer fed a prose summary instead of the raw diff produced a false-positive HIGH — give CR the real diff.

### Testing standards
- Vitest + Testing Library; component tests query `data-testid`s already in the canvas (`fret-number-N`, `nut-label-N`, `inlay-N`, `capo-indicator`, `capo-dim`, `fret-line`, `fretboard-scroll-wrapper`, `fretboard-svg`). Read numeric attributes with `Number(el.getAttribute('x'))` and compare with `toBeCloseTo` (floating geometry).
- Prefer `it.each([[false],[true]])` tables so both orientations are covered by the same assertions.
- Store tests: copy the `audioStore.test.ts` structure (`localStorage.clear()`, `vi.resetModules()` + dynamic import for hydration, throwing-storage case).

### Project structure notes
- NEW: `frontend/src/stores/preferencesStore.ts`, `frontend/src/stores/preferencesStore.test.ts`
- UPDATE: `frontend/src/utils/fretboardUtils.ts` (+ its test), `frontend/src/components/FretboardCanvas.tsx` (+ test), `frontend/src/components/ControlBar.tsx` (+ test), `frontend/src/App.jsx`, `frontend/src/features/settings/CustomTuningCreator.tsx`, `frontend/src/hooks/useUrlState.test.ts` (one regression test)
- No conflicts with the unified structure.

### References
- [Source: _bmad-output/planning-artifacts/epics.distillate.md#Story 7.4: Left-Handed Mode]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.distillate.md#Epic 7 Additions — left-handed rules (line 218)]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-09-29.md#Story 7.4]
- [Source: frontend/src/components/FretboardCanvas.tsx — full render tree, hit-targets :369-402]
- [Source: frontend/src/utils/fretboardUtils.ts:45-81 — geometry constants and helpers]
- [Source: frontend/src/stores/audioStore.ts — hardened localStorage pattern]
- [Source: frontend/src/components/ControlBar.tsx:283-299 — action cluster + theme toggle]
- [Source: frontend/src/hooks/useProgressionPlayback.ts:50-70 — global ←/→ handler]
- [Source: _bmad-output/implementation-artifacts/7-3-url-state-hardening.md — previous story]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- RED confirmed per task before implementation: store module missing (Task 1), `mirrorX is not a function` ×4 (Task 2), exactly the 10 left-handed canvas cases failing with all 58 righty cases green (Tasks 3–4), 3 ControlBar toggle cases (Task 5). The URL-leak guard (5.5) passed immediately — expected, it is a regression pin.
- Full suite run 1: 749/750 — `re-renders in under 100ms` (pre-existing wall-clock jsdom test) failed under parallel-worker load; passed 3/3 in isolation and 750/750 on rerun and on the final post-fix run. Flaky timing, not a regression; real-browser render measured instead (below).

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- **Store** — `usePreferencesStore` (`leftHanded`, `setLeftHanded`, `toggleLeftHanded`), `audioStore` hardening pattern verbatim; accepts only a strict boolean; key `guitar-app-left-handed`, JSON `{leftHanded}`. Kept out of `fretboardStore` so it is structurally impossible to reach the URL or saved session.
- **Mirroring** — pure `mirrorX(x, leftHanded)` in `fretboardUtils`; all geometry/`calculate*` utils untouched. `FretboardCanvas` maps every x at render (`mx` for points/lines, `mRectX` for rects) — surface, capo dim, 3 string lines ×6, nut, 3 fret lines ×24, capo indicator, inlays, nut labels, fret numbers, all three dot layers, hit-targets. Audited with a grep of every `x/x1/x2/cx` attribute — all mapped; zero `transform`/`scale(` in the file. Default `leftHanded=false` output is byte-identical (tested via innerHTML equality).
- **Tab order** — hit-targets iterate frets 24→0 when left-handed; payload/aria-label keep the real fret. No arrow-key navigation added (collides with the window-level progression ←/→ handler — see Dev Notes).
- **Mobile scroll** — `useLayoutEffect([leftHanded])` sets `scrollLeft` to the nut end; manual scroll survives unrelated re-renders (tested).
- **Toggle** — `FlipHorizontal2` IconButton directly after the theme toggle, `aria-pressed`, tooltip, `hidden md:inline` "Left-handed" label; free for anonymous users (tested). Wired into `App.jsx` and the Custom Tuning Creator preview (AC10, tested).
- **Live-check finding → 2 small layout fixes (needed for AC7 / to avoid a 375px regression):**
  1. At 375px the scroll wrapper never scrolled: `main.app-main` (a grid item, `min-width:auto`) grew to the SVG's 450px min-width, so the *page* overflowed sideways instead. Righty hid this (nut at left); lefty would have put the nut off-screen. Fix: `min-width: 0` on `.app-main` (`App.css`). Also removes the pre-existing page-level horizontal scroll in righty.
  2. The new 44px button pushed the ControlBar action cluster (`flex-shrink-0`) from 344px to 394px — wider than a 375px viewport. Fix: cluster is `min-w-0 flex-wrap justify-end` below `md`, unchanged (`md:flex-shrink-0 md:flex-nowrap`) on desktop. On mobile the Account button wraps to a second row.
- **Live browser check (Vite dev, Chrome)** — Desktop 1568px, key C / D minor chord / capo 3: lefty shows nut + upright string labels on the right, fret numbers upright ascending leftward, amber capo bar between frets 3|2, dim overlay on the nut side (x 737→900), key-root rings + legend correct; righty is the exact mirror. Draw mode → click String 1 fret 5 marked fret 5 at the hit-target centre (cx 602.78 = hit centre); URL gained `marks=5-0` and no handedness param; zero `[transform]` in the SVG. Reload → toggle still `aria-pressed=true`, storage `{"leftHanded":true}`. Toggle→next frame 58ms (<100ms NFR, incl. paint). 375px (same-origin iframe; window resize was not honoured by the browser): after fixes, page overflow 0, lefty wrapper `scrollLeft 123/123` with nut in viewport on reload, righty `0/123`. Preference reset to off afterwards.
- **Observed, NOT fixed (out of scope — density pending live UX session):** on mobile the ControlBar already wraps to ~3 rows (219px) inside a 60px grid row and overlays the top of the fretboard. Pre-existing (the tuning/key/scale/capo controls wrap regardless of this story). Recommend adding to backlog for the UX session.
- Gates: vitest 750/750, `tsc --noEmit` clean, `eslint` clean, `vite build` OK (pre-existing >500kB chunk warning only).

### File List

- `frontend/src/stores/preferencesStore.ts` (new)
- `frontend/src/stores/preferencesStore.test.ts` (new)
- `frontend/src/utils/fretboardUtils.ts`
- `frontend/src/utils/fretboardUtils.test.ts`
- `frontend/src/components/FretboardCanvas.tsx`
- `frontend/src/components/FretboardCanvas.test.tsx`
- `frontend/src/components/ControlBar.tsx`
- `frontend/src/components/ControlBar.test.tsx`
- `frontend/src/features/settings/CustomTuningCreator.tsx`
- `frontend/src/features/settings/CustomTuningCreator.test.tsx`
- `frontend/src/hooks/useUrlState.test.ts`
- `frontend/src/App.jsx`
- `frontend/src/App.css`
- `_bmad-output/implementation-artifacts/7-4-left-handed-mode.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-11-17: Story created (CS) — ready-for-dev.
- 2026-11-17: Implemented (DS) — left-handed preference store, render-time x-mirroring in FretboardCanvas, visual Tab order, nut-in-view scroll, ControlBar toggle, creator-preview wiring; plus `.app-main` min-width and mobile action-cluster wrap fixes found in the live check. +39 tests (711 → 750). Status → review.
