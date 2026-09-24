# Guitar App — Working Backlog

> Living task tracker. Highest priority at the top of each section. Check items off as they land.
> The exhaustive per-review deferred list lives in `_bmad-output/implementation-artifacts/deferred-work.md`
> and sprint state in `_bmad-output/implementation-artifacts/sprint-status.yaml` — this file is the
> curated "what next" view on top of those.

_Last updated: 2026-09-22_

---

## 🔨 Now (active)

- [x] **Audio playback (premium) — slice 1** shipped. Native Web Audio + Karplus–Strong synth (zero new deps, no samples). New: `lib/pitch.ts` (absolute-pitch reconstruction from pitch-class tunings via the ascending-strings rule), `lib/audioEngine.ts` (KS pluck + strum), `stores/audioStore.ts` (enabled/volume, persisted, hardened), `lib/playChord.ts` (premium+sound-on gate). Wired to: Chord Library select, Diatonic (Chords-in-Key) select, Jazzify suggestion select, and Progression stepping. Premium "Sound" toggle added to ControlBar (free → paywall). 505/505 tests, type-check/lint/build green.
  - [ ] ⚠️ **Manual audible check pending** — Web Audio can't run in jsdom, so actual sound output is unverified in-repo. Needs a premium user to toggle Sound + click a chord in a real browser. (Engine logic is standard KS; scheduling is guarded.)

### Audio — slice 2 (follow-ups)
- [ ] **Fret-dot click → play the single note** — `stringFretFrequency` already exists in `pitch.ts`; needs wiring at the FretboardCanvas hit-targets (currently only fire in freeform mode — decide interaction: always-play vs a "play" affordance).
- [ ] **Volume slider UI** — `audioStore.volume` + `audioEngine.setVolume` are wired; expose a slider (e.g. in the Account sheet next to the theme picker, or a popover on the Sound button).
- [ ] Consider whether selecting a chord should auto-play, or only an explicit play button (current: auto-plays on select when sound is on — revisit if noisy).
- [ ] Decide reduced-motion stance for audio (currently NOT gated on `prefers-reduced-motion` — audio ≠ motion; the Sound toggle is the control).

## ⏭️ Up Next (prioritized)

- [ ] **Epic 7 (or next feature set) — pick a direction.** Candidates, roughly ranked:
  - [ ] **Audio playback of notes/chords (premium)** — long-requested (2026-09-01), the most-wanted gap. Web Audio (Tone.js `Sampler` or Karplus–Strong), pitch already derivable from `fretboardUtils`; `useProgressionPlayback` is the integration point. Reuse `PaywallCard`/`isPremium` gating. Details in `deferred-work.md` → *Future feature ideas*.
  - [ ] **Chord fingering diagrams / voicings** — 6.x highlights scale-position dots, not fretting shapes; a real "how do I play this" gap for the chord/jazzify features.
  - [ ] **URL-state hardening** — round-trip `modeIndex` (lost on reload today) + validate root/scale/capo at the hydration boundary. Small, high-utility, unblocks shareable links fully.
- [ ] Run **sprint-planning / create-story** for whichever direction is chosen so it enters the normal CS→VS→DS→CR cycle.

## 🔍 Outstanding reviews & epic close-out

- [ ] **Code review 6.2 (Expanded Chord Library)** — implemented, review skipped by choice; still `review` in sprint-status. 3 patch items already noted in the story (test-coverage gaps). Run with a different model than implemented it.
- [ ] **Code review 6.3 (Chord Relationships / Jazzify)** — implemented today, review skipped by choice; still `review`. All 5 open questions were taken at recommended defaults and flagged — confirm them in review.
- [ ] **Epic 6 retrospective (ER)** — once 6.2 + 6.3 reviews land, close out Epic 6.

## 🚀 Deployment & release blockers

- [ ] **Epic 3 deploy gate** — stories 3.5 (Stripe checkout/webhook), 3.6 (subscription enforcement), 3.7 (backend CI/CD + Railway) are code-complete but blocked on a **manual Railway + Stripe deploy** step. Nothing ships premium end-to-end until this is done.
- [ ] **Validate Google OAuth end-to-end** — implemented (3.3) but never verified against real Google in a deployed environment.
- [ ] Set `VITE_API_URL` in Vercel to the deployed Railway backend (currently empty in `.env.example`).

## 🧹 Tech debt / hardening (curated — full list in `deferred-work.md`)

- [ ] **Session upsert race** (4.4) — `SessionService.upsert` read-then-write can violate `UNIQUE(user_id)` under concurrent autosaves; needs `ON CONFLICT DO UPDATE` or `@Version` + retry.
- [ ] **Dead `--color-dot-*` tokens vs. `FretDot.tsx` hardcoded hex** (5.5) — duplicate source of truth for dot colors; wiring them would enable fully theme-aware dots. (Partially addressed in 4.5 — verify current state.)
- [ ] **Auth cross-site cookie** — confirm refresh cookie is `SameSite=None; Secure` in the deployed Vercel→Railway setup (Strict would silently break refresh cross-origin).
- [ ] **URL modeIndex not persisted** (1.8) — active mode chip lost on reload.
- [ ] **Motion durations vs. UX spec drift** (5.5) — hover-lift/dropdown/sheet timings don't match the spec's documented numbers; retune or update spec.
- [ ] E2E/Playwright coverage — several viewport/keyboard-nav ACs across Epic 1–5 are deferred pending real E2E (responsive wrap, tab order, tooltip visibility).

## 💡 Icebox (ideas, not committed)

- [ ] Comparison view (multiple fretboards) — would require de-duping `GLOW_FILTER_ID` and tuning-fallback lookups.
- [ ] 7-string / variable-string-count support — `fretboardUtils` currently assumes 6 strings in a few places.
- [ ] Audit logging on tuning PATCH/DELETE (compliance).
- [ ] Data cleanup: `Celtic` ≡ `DADGAD` duplicate in `tunings.js`; redundant DB indexes.

---

### Legend
`[ ]` todo · `[~]` in progress / partial · `[x]` done · strike through dropped items with a note.
