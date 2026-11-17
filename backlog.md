# Guitar App — Working Backlog

> Living task tracker. Highest priority at the top of each section. Check items off as they land.
> The exhaustive per-review deferred list lives in `_bmad-output/implementation-artifacts/deferred-work.md`
> and sprint state in `_bmad-output/implementation-artifacts/sprint-status.yaml` — this file is the
> curated "what next" view on top of those.

_Last updated: 2026-11-16_

---

## 🔨 Now (active)

- [ ] 🔥 **URGENT (owner request 2026-10-07) — Chord detection from picked fretboard notes ("What chord is this?").** User taps notes on the fretboard and the app names the chord being played — triads through jazz extensions/altered chords — and shows how it relates to the currently selected key/root. Should enter the normal CS→VS→DS→CR cycle as its own story (candidate: next slot after 7.1, ahead of the rest of Epic 7, given priority).
  - [ ] **Input**: reuse the existing freeform-mark mechanism (`fretboardStore.freeformMarks`, `{fret, string}`) or a dedicated "chord detect" pick mode — decide in CS. **Decided: behaves like a real guitar** — max one note per string (tapping a second fret on the same string replaces the first; tapping the same note again clears it), unmarked strings = muted/not played.
  - [ ] **Detection engine**: new pure `lib/chordDetection.ts`. Marks → pitch classes (account for tuning + capo; `pitch.ts` has the string/fret math) → match against every `CHORDS` interval formula in `data/chords.js` across all 12 roots (`chordRelationships.pitchClassSet` already does root+type → pitch-class set). Must handle: inversions/slash chords (lowest sounding note ≠ root → e.g. `C/E`), omitted 5ths (very common in jazz voicings), extensions mod-12 (9 ≡ 2, 11 ≡ 5, 13 ≡ 9), and ambiguous pitch-class sets (already known: C6 ≡ Am7) — return ranked candidates, not a single answer. Ranking idea: exact match > root-in-bass > fewer omitted tones > simpler chord. Partial matches (2 notes, or no exact match) should say "power chord / interval" or "closest: …" rather than nothing.
  - [ ] **Relative to key**: show the detected chord's Roman numeral / function in the selected key (`harmony.ts` diatonic data), flag non-diatonic chords (borrowed, secondary dominant, tritone sub — `chordRelationships.ts` has relevant logic), using the key-root vs chord-root distinction from Story 7.1.
  - [ ] **Data gap — decided: extend `chords.js` directly** (owner relaxed the do-not-touch rule for it on 2026-10-07; see CLAUDE.md). Add missing jazz/altered types (13ths, 7♯9, 7♭9, 6/9, etc.) **append-only** at the end, each interval array unique — insertion order is load-bearing for `ChordLibrary`'s free-preview slice and `harmony.ts` first-match classification, and `chords.test.js` enforces uniqueness. New types also become visible in Chord Library/Jazzify, so check `harmony.ts` `DISPLAY_SUFFIX` coverage.
  - [ ] **Tier — decided**: basic triad/7th detection free; jazz extensions + key-function analysis premium, mirroring the Jazzify gating. Enforce via the existing premium-gate/PaywallCard pattern.
  - [ ] Optional tie-ins: "play what I picked" via the explicit-Play-button rule in Audio slice 2; "show this chord in the Library" jump.

- [ ] ⚠️ **Manual audible check for chord-preview playback** — Web Audio can't run in jsdom, so actual sound output from the Karplus–Strong engine is still unverified in-repo. Story 7.2 live-verified the trigger mechanism itself (Play buttons call `playChord` with the right args, no console errors, `AudioContext` created) but confirming it's actually *heard* still needs a human: as a premium user (dev-unlock flag available), click any chord row's Play button in a real browser and listen.
- [ ] **UI/UX visual-style + density review session** — deferred from the 2026-09-28 Epic 6 retrospective (item 6). The Aurora glass-first direction (Epic 5) passed every code-review gate but the project owner isn't satisfied with the layout density or visual style. Needs a live, before/after session with real options — not another unilateral code change. See `epic-6-retro-2026-09-28.md` for full context (Pattern 2: acceptance criteria ≠ satisfaction). Color palette itself is **not** in question — owner is happy with it; this is about spacing, density, and polish. Specific complaints gathered so far, to work from directly instead of starting blank:
  - [ ] **Full-block selection highlight reads as unpolished** — `ControlBar` toggle buttons (Library, Notes, etc.) highlight their *entire* button block when active/selected; feels heavy-handed rather than a considered "selected" state. Needs a more refined active-state treatment (e.g. underline/indicator + subtle tint, not a solid fill block) — check whether `LibraryPanel`'s tab row sliding-indicator pattern is a better model to extend from than what `ControlBar` currently does.
  - [ ] **Reconsider Library side-panel width** — currently fixed at 320px (`.app-shell.side-panel-open` grid column in `index.css`); owner suspects it may need to be bigger, unclear yet by how much. Needs a live comparison at a few widths, not a guess.
  - [ ] **General decluttering + more breathing room** — owner's summary ask: "professionalize" the UI, more spacing throughout, less cramped. Broad — the live session should turn this into concrete, specific changes (spacing scale audit, information density per panel) rather than one big vague pass.
- [ ] **Distinguish the KEY's root note from a CHORD's root note on the fretboard, plus a color legend.** Today `FretDot.tsx` only has 5 dot states (`root`, `scale`, `mode`, `mode-root`, `freeform`) — there is no separate state for "the overall key's root" vs. "the currently-displayed chord's root." Concretely: viewing the `ii` chord in the Diatonic tab for C major (D minor) highlights D as `root` and shows nothing marking where C — the actual key center — sits on the board; the key context disappears the moment a chord is shown. Same gap applies to Progression Builder (each chord in a progression has its own root, distinct from the overall selected key) and Jazzify. Needs:
  - [ ] A new dot state (e.g. `key-root`) with its own color, rendered *simultaneously* with the chord's own `root` dot whenever a key/scale context is active alongside a displayed chord.
  - [ ] A visible color legend/key somewhere in the UI explaining what each dot color means — there isn't one today at all, for any of the 5 existing states either. Worth doing once, for all dot states, not just the two new ones.
  - [ ] New color must go through the same WCAG contrast + colorblind-simulation audit rigor as the existing dot palette (established practice since Stories 4.5/5.5) before picking a hex value.

### Recently shipped (2026-09-28)
- [x] Dev-only `VITE_DEV_UNLOCK_PREMIUM` flag — test all premium features locally without Stripe. Gated on `MODE === 'development'`, verified absent from the production bundle.
- [x] Fixed the Library-panel full-height layout regression (missing `grid-area` wiring on `ControlBar`/`ModeChipsRow`/`main`/`footer` — root cause of the clipped mode-row, floating footer text, and non-full-height panel; invisible to Vitest since jsdom doesn't lay out CSS Grid).
- [x] Fixed `PaywallCard`'s glitch-like appearance — added a dimming scrim matching the existing `SheetOverlay` convention.
- [x] Removed ~60 lines of dead pre-Aurora flexbox CSS from `App.css`.
- [x] Progression Builder: added **Popular** (I–V–vi–IV, I–IV–V, 50s progression, ii–V–I, 12-bar blues) and **Jazzy** (ii7–V7–Imaj7, rhythm-changes turnaround, extended jazz cycle, tritone-sub ii–V–I) preset progressions, transposing to the active key.
- [x] **Decision resolved**: Progression tab now opens for free users. Popular presets are fully free/usable; Jazzy presets and the custom chord-by-chord builder stay premium-locked within the tab (lock badges, click raises the shared PaywallCard, consistent with `LibraryItem`'s existing locked pattern). `LibraryPanel`'s `PREMIUM_TABS` no longer includes `'progression'` — only `'jazzify'` gates at the tab level now. 532/532 tests, `tsc`/`eslint`/`build` clean, live-verified as both a free and premium user.

### Audio — slice 2 (follow-ups)

- [ ] **Volume control** — `audioStore.volume` + `audioEngine.setVolume` are already wired; expose an actual slider UI (e.g. in the Account sheet next to the theme picker, or a popover on the Sound button in `ControlBar`).
- [x] **Replace auto-play-on-select with an explicit Play button everywhere sound can trigger — decision made, no more auto-play.** Done via Story 7.2 (`_bmad-output/implementation-artifacts/7-2-explicit-play-controls.md`). Sound never fires from selecting/browsing; only a dedicated Play button does, and the ControlBar's Sound toggle itself is retired (an explicit Play click is now the user's consent, so there's no separate on/off switch to check).
  - [x] `ChordLibrary.tsx` — selecting only highlights; a sibling `PlayButton` per row plays.
  - [x] `ChordsInKey.tsx` (Diatonic tab) — same pattern, same fix.
  - [x] `ChordRelationships.tsx` (Jazzify tab) — same pattern, same fix.
  - [x] `ProgressionBuilder.tsx` / `useProgressionPlayback` — stepping (Next/Prev/←/→) is silent; a "Play current chord" button beside Prev/Next is the explicit trigger.
  - [ ] **Scales** (`ScaleLibrary.tsx`) — scales still don't play any audio today; if a "hear this scale" feature is wanted later, it must launch from its own explicit button too, never from just selecting/browsing a scale. Note for whoever picks this up: don't default new audio surfaces to auto-play just because chords used to.
  - [ ] Any future audio surface (fret-dot click → single note, still unbuilt — see below) must follow the same rule: explicit button, never a side effect of navigation/selection.
- [ ] **Fret-dot click → play the single note** — `stringFretFrequency` already exists in `pitch.ts`; needs wiring at the FretboardCanvas hit-targets. Per the decision above, this should ship as an explicit play affordance, not an always-on click-to-play (which would make every fretboard click noisy).
- [ ] Decide reduced-motion stance for audio (currently NOT gated on `prefers-reduced-motion` — audio ≠ motion). Note: the Sound toggle mentioned when this item was first written no longer exists (retired in Story 7.2); whatever decides this now is each individual Play button's click, not a standing switch.

---

## 🎸 Guitarist-tool gaps (2026-09-28 functionality audit)

Full writeup with impact/effort reasoning: see the shared audit artifact ("Functionality Audit — Guitar Fretboard Explorer"). Summary: this app is unusually deep on music theory but currently has none of the tools guitarists reach for constantly. Ranked below by how soon each is worth picking up.

### Now — cheapest, highest-value fixes
- [x] **Metronome** — shipped 2026-09-28. Free feature (deliberately independent of the premium chord-audio gate). Lookahead Web-Audio scheduler in `lib/metronome.ts` (shares the app's single `AudioContext` via a new `getSharedAudioContext` export in `audioEngine.ts`, own gain node so volume is decoupled from chord-preview volume); `stores/metronomeStore.ts` (bpm 30–300, beats-per-measure 1–12, isPlaying, currentBeat); `hooks/useMetronome.ts` mounted in `App.jsx` so playback survives closing the sheet; `features/settings/MetronomeControl.tsx` (bottom sheet: tempo slider + steppers, beats-per-measure steppers, live beat-pulse dots, Start/Stop) wired via a new `Timer`-icon button in `ControlBar`. 26 new tests, 556/556 total, `tsc`/`eslint`/`build` clean, live-verified (beat pulse genuinely advances in sync with the Web Audio clock).
- [x] **Chromatic tuner** — shipped 2026-09-28. Free feature. Hand-implemented autocorrelation pitch detector in `lib/pitchDetection.ts` (pure math, no deps — trims silent buffer edges, correlates the signal against shifted copies of itself, refines the peak with parabolic interpolation for sub-sample accuracy; verified against synthetic sine waves at real guitar-string frequencies, e.g. 82.41Hz low-E within 1%) + `frequencyToNote` (MIDI-number mapping to `CHROMATIC_NOTES` + cents deviation). `lib/tunerEngine.ts` requests the mic (`getUserMedia`), runs the detector on a `requestAnimationFrame` loop against the shared `AudioContext`, and always releases the mic track on stop; normalizes permission-denied/no-device/unsupported into typed error codes. `stores/tunerStore.ts` + `hooks/useTuner.ts` (mounted in `App.jsx`) wire it up, guarding against a stale mic stream leaking if the user backs out before the permission prompt resolves. `features/settings/TunerControl.tsx` (bottom sheet: large note+octave readout, cents-off text, a colour-coded ±50-cent needle gauge, Start/Stop) wired via a new `Gauge`-icon button in `ControlBar`. Caught and fixed a real bug during testing: the store's `setListening(false)` was unconditionally clearing `error`, which would have wiped the permission-denied message the instant the hook set it. 40 new tests, 596/596 total, `tsc`/`eslint`/`build` clean, live-verified end-to-end in Chrome (mic access granted, detection loop ran cleanly, "Play a note…" no-signal state rendered correctly, clean stop with no console errors). Real-string pitch accuracy is inherently unverifiable without a physical guitar + microphone in this environment — the algorithm itself is validated against exact synthetic frequencies.

### Next
- [ ] **Practical chord fingering diagrams** — the chord library lights up every occurrence of a chord's notes across the whole neck, not a compact open-position/barre diagram with finger numbers. Already flagged pre-audit as a known gap. Needs a curated fingering dataset per chord + tuning and a new compact diagram component.
- [ ] **Richer audio playback** — today's playback is a single pluck on selection; no play-along at tempo, no strum pattern. Builds directly on the existing Karplus-Strong engine and progression store (see Audio slice 2 above — these overlap and should likely land together).
- [ ] **Left-handed mode** — mirror the fretboard. A real accessibility gap, not a niche one. Low-medium effort — a rendering-side mirror transform, not new data.

### Later
- [ ] **Multiple voicings per chord** — only one shape/pattern per chord+tuning today; real players want open vs. barre vs. up-the-neck alternatives. No voicing data model exists yet — a genuine new dimension of the chord data, worth its own epic.
- [ ] **Export / print** — no way to get a chord chart or progression out of the app as an image/PDF for a rehearsal. Client-side canvas/print rendering of existing state, no backend needed.
- [ ] **Real song content (tabs/chord charts)** — the single biggest opportunity in the audit. Everything today is generic theory with no bridge to "how do I play this song," which is most guitarists' actual daily search. High effort — needs a content source (licensing or user-submitted), storage, and a new content surface. Worth a dedicated strategy conversation before any code, given licensing/sourcing questions that sit outside engineering.
- [ ] **Ear training (interval/chord ID drills)** — real engagement driver in competitor apps, but a genuinely different product surface (quizzes, scoring) than anything built here. Sequence behind the above.
- [ ] **Recording / looper** — much weaker without real song content to loop over first; sequence after that feature, not before.

---

## ⏭️ Other up-next items

- [ ] **URL-state hardening** — round-trip `modeIndex` (lost on reload today) + validate root/scale/capo at the hydration boundary. Small, high-utility, unblocks shareable links fully.
- [ ] Run **sprint-planning / create-story** for whichever direction is chosen next so it enters the normal CS→VS→DS→CR cycle.

## 🔍 Epic 6 close-out — DONE (2026-09-28)

- [x] Code review of 6.2 (Expanded Chord Library) + 6.3 (Chord Relationships/Jazzify), combined pass. 3-layer review found 4 findings against 6.3, all resolved as noise after source verification (3 false positives, 1 negligible). Applied 3 previously-skipped patch items from 6.2's original review (parametrized test coverage, `FREE_TIER_CHORD_COUNT` constant, exhaustive exotic-scale regression). 523/523 tests, `tsc`/`eslint`/`build` clean.
- [x] Epic 6 retrospective — see `epic-6-retro-2026-09-28.md`. Surfaced a real, previously-invisible layout regression (fixed same day) and a genuine UI/UX satisfaction gap from Epic 5 (item 6 above, still open).

## 🚀 Deployment & release blockers

- [ ] **Epic 3 deploy gate** — stories 3.5 (Stripe checkout/webhook), 3.6 (subscription enforcement), 3.7 (backend CI/CD + Railway) are code-complete but blocked on a **manual Railway + Stripe deploy** step. Nothing ships premium end-to-end until this is done.
- [ ] **Validate Google OAuth end-to-end** — implemented (3.3) but never verified against real Google in a deployed environment.
- [ ] Set `VITE_API_URL` in Vercel to the deployed Railway backend (currently empty in `.env.example`).

## 🧹 Tech debt / hardening (curated — full list in `deferred-work.md`)

- [ ] **Session upsert race** (4.4) — `SessionService.upsert` read-then-write can violate `UNIQUE(user_id)` under concurrent autosaves; needs `ON CONFLICT DO UPDATE` or `@Version` + retry.
- [ ] **Dead `--color-dot-*` tokens vs. `FretDot.tsx` hardcoded hex** (5.5) — duplicate source of truth for dot colors; wiring them would enable fully theme-aware dots. (Partially addressed in 4.5 — verify current state.)
- [ ] **Auth cross-site cookie** — confirm refresh cookie is `SameSite=None; Secure` in the deployed Vercel→Railway setup (Strict would silently break refresh cross-origin).
- [ ] **Motion durations vs. UX spec drift** (5.5) — hover-lift/dropdown/sheet timings don't match the spec's documented numbers; retune or update spec.
- [ ] E2E/Playwright coverage — several viewport/keyboard-nav ACs across Epic 1–5 are deferred pending real E2E (responsive wrap, tab order, tooltip visibility).
- [ ] Flaky perf-timing test: `FretboardCanvas.test.tsx` "re-renders in under 100ms on tuning/scale change" — failed once under load (150ms), passed in isolation. Consider raising the threshold or asserting on render count instead of wall-clock time.

## 💡 Icebox (ideas, not committed)

- [ ] Comparison view (multiple fretboards) — would require de-duping `GLOW_FILTER_ID` and tuning-fallback lookups.
- [ ] 7-string / variable-string-count support — `fretboardUtils` currently assumes 6 strings in a few places.
- [ ] Audit logging on tuning PATCH/DELETE (compliance).
- [ ] Data cleanup: `Celtic` ≡ `DADGAD` duplicate in `tunings.js`; redundant DB indexes.

---

### Legend
`[ ]` todo · `[~]` in progress / partial · `[x]` done · strike through dropped items with a note.
