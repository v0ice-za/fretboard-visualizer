# Sprint Change Proposal — 2026-09-29

**Project:** Guitar App · **Author:** Voice (with Correct Course workflow) · **Mode:** Incremental · **Status:** Approved 2026-09-29 — edits applied

---

## 1. Issue Summary

Epics 1–6 are complete (Epic 3 blocked only on the manual Railway/Stripe deploy gate) and no further epic is planned. Meanwhile, real use and the Epic 6 retrospective (2026-09-28) surfaced usability gaps that the original plan never covered, and several features shipped outside the story cycle (audio slice 1, metronome, tuner, progression presets), leaving the PRD out of sync with the code.

**Problem statement:** The app meets its acceptance criteria but loses clarity in everyday use — key context disappears once a chord is shown, dot colours are unexplained, sound fires on every selection, shared links drop mode/chord state (and can bypass the premium tuning gate), and left-handed players are unsupported.

**Evidence:**
- Retro Pattern 2 — "acceptance criteria ≠ satisfaction" (`epic-6-retro-2026-09-28.md`).
- Owner's explicit "no more auto-play" decision (`backlog.md` › Audio slice 2).
- Code: `FretDot.tsx` has 5 states and no key-root; `FretboardCanvas` replaces scale dots with chord-only dots; `useProgressionPlayback` overwrites the key (`setRootNote`) on every step; `useUrlState` omits `modeIndex`/chord and accepts any predefined tuning regardless of tier; no handedness support anywhere.
- PRD §5 lists "No audio playback in v1" and "no shareable fretboard states" — both contradicted by shipped code.

## 2. Impact Analysis

| Area | Impact |
|---|---|
| Epics 1–6 | None — no scope change. Status housekeeping only (1,2,4,5,6 → done). |
| Epic 3 | Unchanged — remains in-progress on deploy gate. |
| New work | **Epic 7: Usability & Clarity**, 4 stories. |
| PRD | §5 Non-Goals + §6.2 amended to record shipped audio and URL sharing. |
| Architecture | No change. Frontend-only; no new API routes, no schema/migration changes. Handedness in localStorage. |
| UX spec | New "Epic 7 Additions" section (key-root ring, legend, explicit Play pattern, left-handed rules). |
| Other | `epics.distillate.md` stale statuses (1.5–1.9) corrected; `sprint-status.yaml` updated. |

## 3. Recommended Approach

**Option 1 — Direct Adjustment** (add Epic 7 within the existing plan).
- Rollback: not viable — nothing needs reverting.
- MVP review: not needed — MVP is delivered; this is post-MVP polish.
- **Effort:** Medium (4 frontend stories). **Risk:** Low — isolated to rendering, audio call sites, and URL hydration. **Timeline:** no impact on other work; Epic 3 deploy gate remains independent.

**Explicitly out of scope:** layout density / visual-style changes. These await the live UX session with the owner (retro item #6) and will enter via a later Correct Course.

## 4. Detailed Change Proposals

### 4.1 Epics — new Epic 7

```
## Epic 7: Usability & Clarity
Goal: Close the real-use gaps surfaced after Epic 6 — keep key context visible when chords are
shown, explain the fretboard's colours, make sound strictly opt-in per action, make shared links
lossless, and support left-handed players. Frontend-only; NO backend, NO new API routes.
Reqs: FR-1, FR-5b (URL precedence), FR-7, FR-12; NFR Accessibility (WCAG 2.1 AA); PRD §5 amendment.
Out of scope: layout density / visual-style changes — pending the live UX session (retro
2026-09-28 item 6); its outcome will be added via a later correct-course.
```

#### Story 7.1: Key-Root Marker & Fretboard Colour Legend
As a guitarist viewing a chord inside a key, I want to still see where the key centre sits and know what every dot colour means, so I never lose harmonic context.

**Acceptance Criteria:**
- New DotState `key-root`, rendered only while a chord is displayed (chordName set) AND chordRoot ≠ key rootNote.
- key-root is a HOLLOW RING marker (stroke, no fill) at every key-root position within the visible frets — shape, not just colour, distinguishes it from chord tones.
  - If the key-root pitch is also a chord tone (e.g. C in Am), the chord-tone dot renders as normal PLUS the key-root ring around it.
  - If chordRoot === rootNote, no ring (root dot already marks it).
- Applies everywhere a chord can be shown: Chord Library, Diatonic (Chords in Key), Jazzify, Progression Builder stepping.
- **Progression stepping sets `chordRoot` (not `rootNote`) so the key stays fixed; call order `setChordName` → `setChordRoot` (setChordName resets chordRoot — 6.3 GOTCHA). Snapshot/restore logic in `useProgressionPlayback` updated accordingly.**
- Ring colour via new `--color-dot-key-root` token defined in ALL 6 theme blocks; WCAG 2.1 AA (≥3:1 non-text contrast) verified against the composited board background in every theme — computed, not eyeballed.
- Fretboard legend below the board lists ONLY the dot states present in the current render (swatch + label: Key root / Chord root / Chord tone / Scale / Mode / Mode root / Freeform mark); swatches read the same CSS tokens as FretDot. Hidden when the board has no dots.
- Legend is text-labelled (not colour-only), responsive at 375px, exposed as a list; FretboardCanvas aria-label mentions the key when a chord is shown ("…showing D minor chord in key of C").
- Scale-mode rendering (no chord) unchanged; <100ms re-render NFR holds.
- Frontend-only.

#### Story 7.2: Explicit Play Controls (remove auto-play)
As a guitarist, I want sound only when I deliberately ask for it, so browsing chords is silent and never surprising.

**Acceptance Criteria:**
- Selecting/browsing a chord NEVER plays audio. Remove the playChord call on select in ChordLibrary, ChordsInKey, ChordRelationships, and on step in useProgressionPlayback (←/→ and Prev/Next stay silent).
- Each chord row in Chord Library / Diatonic / Jazzify gets a small Play IconButton (aria-label "Play <chord>"); clicking plays that chord WITHOUT changing selection (stopPropagation).
- Progression Builder gets a "Play current chord" button beside Prev/Next.
- Premium gate unchanged and enforced inside playChord; free users see Play buttons with a lock badge → click raises the shared PaywallCard.
- ControlBar "Sound" toggle REMOVED; `audioStore.enabled` retired (persisted state migrated safely — old key ignored). Volume stays at stored value.
- Play buttons Tab-reachable, Enter/Space activate, don't hijack ←/→ stepping.
- Tests: selection/stepping produce ZERO playChord calls; Play button exactly one; free-user click opens PaywallCard.
- Metronome and tuner unaffected.
- Real-browser audible check performed (closes the open backlog item).

#### Story 7.3: URL-State Hardening
As a guitarist sharing a link, I want the recipient to see exactly what I see — and nothing they aren't entitled to.

**Acceptance Criteria:**
- `?mode=<index>` written when a mode is active, omitted otherwise; hydrated only if valid for the hydrated scale.
- `?chord=<type>&croot=<note>` written while a chord is shown; hydrated only if type ∈ CHORDS and croot matches ROOT_NOTE_RE; call order setChordName → setChordRoot.
- Entitlement guard: a premium-only tuning or locked chord (beyond FREE_TIER_CHORD_COUNT) in the URL is applied only once subscription status resolves as premium; otherwise falls back to Standard E / no chord. No premium flash; no discarding a valid link for a premium user on slow load (reuse useThemeGuard sequencing).
- Custom (user-saved) tuning names in `?tuning=` fall back to Standard E (private data).
- Strict numeric parsing: `capo=3abc` ignored; duplicate freeform marks de-duplicated.
- Precedence unchanged: URL beats saved session (FR-5b / 4.4).
- Tests: table-driven valid/invalid per param; free vs premium hydration; full round-trip for every param.
- useUrlState stays the single URL↔store boundary; no new routes.

#### Story 7.4: Left-Handed Mode
As a left-handed guitarist, I want the fretboard mirrored so it matches how I hold my guitar.

**Acceptance Criteria:**
- "Left-handed" toggle (free) in the settings area alongside the theme control; persisted in localStorage (not a URL param).
- On: fretboard mirrors horizontally — nut on the RIGHT, frets ascend leftward; string order unchanged.
- Implemented as a coordinate mapping in FretboardCanvas (x → width − x), NOT a CSS/SVG scale(-1) — text, fret numbers, inlays, capo indicator, glow filters render upright and correct.
- Hit-targets mirror with the dots (click on fret N marks fret N — tested in both modes).
- Keyboard fret navigation follows VISUAL direction in both modes; Tab order logical.
- Mobile (<768px): initial scroll puts the nut in view.
- Proportional fret widths preserved.
- 7.1 rings/legend, chord highlights, capo dimming correct when mirrored; <100ms NFR holds.
- Toggle has aria-pressed.
- Live browser check at desktop + 375px in both modes.

### 4.2 PRD (`prds/prd-personal_projects-2026-05-22/prd.md`)

| Section | OLD | NEW |
|---|---|---|
| §5 | **No audio playback in v1** — visual reference only; no chord or scale audio preview. | ~~No audio playback in v1~~ — *Amended 2026-09-29:* audio shipped post-MVP as opt-in chord preview (premium, explicit Play controls only — Story 7.2) plus free practice tools (metronome, chromatic tuner). Scale audio still out of scope. |
| §5 | **No social or sharing features** — no public profiles, shareable fretboard states, or community content in v1. | **No social features** — no public profiles or community content. *(Amended 2026-09-29: shareable fretboard state via URL shipped in Epic 1, hardened in 7.3.)* |
| §6.2 | Audio playback — v2 | Audio playback — delivered post-MVP (see §5 amendment) |

"No MIDI input" unchanged — the tuner uses the microphone, not MIDI.

### 4.3 UX Spec (`ux-design-specification.md` + distillate)
New section **"Epic 7 Additions — 2026-09-29"**: key-root hollow-ring dot state; legend pattern (present-states-only, text-labelled, token-driven swatches); explicit Play control pattern (never on select, lock badge → PaywallCard) and Sound-toggle removal; left-handed mirroring rules.

### 4.4 Epics (`epics.md` + `epics.distillate.md`)
Append Epic 7 (above). Correct stale distillate statuses for Stories 1.5–1.9 → DONE.

### 4.5 Sprint Status (`sprint-status.yaml`)
- epic-1, epic-2, epic-4, epic-5, epic-6: in-progress → done
- epic-3: unchanged (in-progress)
- Add: epic-7 (backlog), 7-1-key-root-marker-and-fretboard-legend, 7-2-explicit-play-controls, 7-3-url-state-hardening, 7-4-left-handed-mode (all backlog), epic-7-retrospective (optional)

## 5. Implementation Handoff

**Scope classification: Moderate** — new epic + backlog reorganization; no architectural replan.

| Role | Responsibility |
|---|---|
| PO / Dev (this workflow) | Apply §4.2–4.5 document edits on approval. |
| SM — `bmad-create-story` | Create 7.1 → 7.4 in order (CS → VS). |
| Dev — `bmad-dev-story` | Implement each story (DS). |
| Reviewer — `bmad-code-review` | CR each story — **with a different model than the implementer**, findings verified against source before patching. |
| UX — `bmad-agent-ux-designer` | Separate live density/visual-style session (retro #6); outcome → future correct-course. |

**Success criteria:** all four stories done with green tests/tsc/lint/build; key-root ring and legend verified live in all 6 themes; zero audio on selection/stepping; premium tuning unreachable via URL for free users; mirrored board verified live at desktop + 375px.

**Suggested order:** 7.1 → 7.2 → 7.3 → 7.4 (7.1 first: it fixes the progression key-overwrite that 7.2's progression Play button builds on).
