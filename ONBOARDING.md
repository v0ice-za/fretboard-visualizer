# Guitar App — Project Onboarding

## What This Is

A guitar fretboard visualization web app built primarily for Voice (the developer), but designed for any guitarist who plays in alternate tunings. Core problem: when you retune, familiar chord shapes and scale patterns shift — this app shows you exactly how they look on the fretboard in real time.

---

## Current State (as of 2026-05-22)

### What's already built (working frontend)

- Full fretboard render — 24 frets, 6 strings, note dots, nut, fret markers
- 14 predefined tunings (Standard, Drop D/C/B, Open G/D/E/A, DADGAD, etc.)
- 31 scales with correct interval highlighting, grouped by category
- Root note picker — all 12 chromatic notes, updates scale in real time
- Notes / Intervals display toggle (R, b2, 2, b3 …)
- Scale info bar (name, category, interval count)
- Dark theme — `#080810` bg, `#6366f1` indigo for scale notes, `#fbbf24` amber for root notes

### What's NOT built yet

- Chord shapes / chord library
- Freeform note marking on fretboard
- Capo support
- Custom tuning input
- User accounts / auth
- Subscription / paywall
- Backend (Java + Maven)
- Fretboard state persistence

---

## Stack

| Item | Value |
|------|-------|
| Directory | `C:\voice\personal_projects\guitar-app` |
| Frontend | React 18 + Vite 5 |
| Styling | Plain CSS (no Tailwind, no CSS-in-JS) |
| Fonts | Inter + Space Grotesk (Google Fonts) |
| Backend (planned) | Java + Maven |
| Auth (planned) | Google OAuth + email/password |
| Payment (planned) | PayFast (SA-native, ZAR) — confirm vs. Stripe SA during architecture |
| Dev server | `npm run dev` → http://localhost:5173 |
| Build | `npm run build` |

---

## File Structure

```
guitar-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Root component, holds all state
    ├── App.css               # Global styles, dark background, header/layout
    ├── data/
    │   ├── notes.js          # CHROMATIC_NOTES, normalizeNote(), noteIndex(), noteAtSemitone()
    │   ├── tunings.js        # TUNINGS object (14 tunings, low→high string order), TUNING_NAMES
    │   └── scales.js         # SCALES object (31 scales, intervals[] + category), SCALE_NAMES, SCALE_CATEGORIES
    ├── utils/
    │   └── musicTheory.js    # getNoteAtFret(), getScaleNotes(), isRoot(), getIntervalName(), getNoteInterval(), FRET_MARKERS, DOUBLE_MARKERS
    └── components/
        ├── Fretboard.jsx     # Main visual — 24 frets, 6 strings, note dots, nut, fret markers
        ├── Fretboard.css     # Fretboard styles: wood texture bg, metallic frets, glow dots
        ├── Controls.jsx      # Tuning select, root note buttons, scale select (grouped), Notes/Intervals toggle, scale info bar
        └── Controls.css      # Controls styles: dark selects, note button grid, toggle row
```

---

## Key Design Decisions (existing code)

- **Strings displayed high→low top-to-bottom** — matches how a guitarist reads a fretboard diagram
- **Fret columns are perspective-tapered** — widths decrease from fret 1 (68px) to fret 14+ (40px) for a real-guitar feel
- **Enharmonic normalization** — flats mapped to sharp equivalents internally; tunings with flats work correctly
- **Scale data is interval-based** — semitone offsets from root, so any root + any tuning works with the same logic
- **No external UI library** — everything hand-crafted CSS

---

## Product Decisions (from PRD session 2026-05-22)

### Free Tier (no account required)
- Fretboard viewer
- 5–7 Free Tunings (Standard, Drop D, Open G, Open E, Open D, DADGAD, Drop C — final list TBC)
- Capo support (fret 1–12)
- Select-to-highlight (chord shapes + scale patterns)
- Freeform note marking
- Note name toggle (off by default)
- 5 preview chords from Chord Library
- 5 preview scales from Scale Library

### Premium Tier — $12/yr
- All remaining predefined tunings (comprehensive dataset from public sources — every named tuning)
- Custom tuning creation (arbitrary per-string pitches)
- Full Chord Library
- Full Scale Library
- Chord Progression builder
- Fretboard state saved between sessions (tuning, capo, freeform marks)

### Non-Goals for v1
- Audio playback
- Instructional content / lessons
- Tab or sheet music editor
- Native mobile app
- Social / sharing features
- MIDI input
- Monthly subscription
- 7-string / 12-string support

---

## PRD Artifacts

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-personal_projects-2026-05-22/prd.md`
- **Decision log:** `_bmad-output/planning-artifacts/prds/prd-personal_projects-2026-05-22/.decision-log.md`

---

## Open Questions (carry into architecture)

1. Final list of 5–7 Free Tunings (assumed list above — confirm)
2. PayFast vs. Stripe SA — confirm during architecture
3. Comprehensive tuning dataset — compile during build from public references; free/premium split applied on top

---

## Where We Are in the BMad Workflow

| Phase | Status |
|-------|--------|
| 1 — Analysis | Skipped (builder had clear vision) |
| 2 — PRD | ✅ Draft complete |
| 3 — Architecture | ⬅️ Next step |
| 3 — Epics & Stories | Not started |
| 3 — Readiness Check | Not started |
| 4 — Implementation | Not started |

**Next command:** `/bmad-create-architecture` (run in a fresh context window)

---

## How to Run

```bash
cd C:\voice\personal_projects\guitar-app
npm run dev
```

Open http://localhost:5173. Hot module replacement active — edits to `.jsx` / `.css` reload instantly.
