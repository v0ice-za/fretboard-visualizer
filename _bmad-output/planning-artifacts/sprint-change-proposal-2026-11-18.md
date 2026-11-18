# Sprint Change Proposal — 2026-11-18

**Project:** Guitar App · **Author:** Voice (with Correct Course workflow) · **Mode:** Batch · **Status:** Approved 2026-11-18 — decisions: keep current dot colours, obsidian as default dark theme, skip Epic 7 retro

---

## 1. Issue Summary

Epic 7 (Usability & Clarity) is complete. The previous change proposal (2026-09-29) explicitly deferred "layout density / visual-style changes — pending the live UX session" (retro item #6). The user has now provided a Google Stitch export ("Fretwise / Obsidian Audio Lab") at `stitch_fretwise_interactive_guitar_fretboard/` as the visual direction input. The user's decision: "we don't need to have it exactly the same but we can have somewhat the same theme or look and feel."

**Problem statement:** The app's current Aurora glass theme (Epic 5) is functional but visually generic. The Stitch reference shows a deeper, more "pro studio gear" aesthetic with richer typography, tighter geometry, recessed fretboard with metallic frets, glow-based dot elevation, and a more compact chrome layout. This is the density/visual-style work that has been deferred since the Epic 6 retrospective.

**Evidence:**
- Retro item #6 (2026-09-28): "density/visual-style changes still pending live UX session"
- Previous CC (2026-09-29): "Explicitly out of scope: layout density / visual-style changes"
- Epic 7 out-of-scope note: "Density/visual-style work excluded pending live UX session"
- Stitch export: 5 screens + DESIGN.md showing the target aesthetic
- User confirmation (2026-11-18): visual inspiration only, not feature spec

**What we borrow from the Stitch reference:**
- Deeper obsidian dark palette in layered surfaces (#0B0D13 → #12151F → #181C2A → #272A34)
- Typography: Plus Jakarta Sans (headings), Inter (body — already used), JetBrains Mono (numeric/fret labels — already used)
- Tighter corner radii (4px controls, 8px panels) — "studio rack gear" feel
- Recessed fretboard with inner shadow, metallic fret wire styling (specular + shadow lines)
- Phosphor glow-based elevation (no arbitrary drop shadows; glows act as light sources)
- Glassmorphic floating palettes with directional border highlights
- Segmented pill controls for modes and toggles
- Compact top bar (~48px), bottom tool dock on mobile
- Gold halo on root notes, blue scale tones, emerald chord tones (colour semantics TBD — see decision point below)

**What we leave out:**
- All invented features: Voicing Lab, MIDI export, voice-leading AI, string gauge/tension, 7/8-string, DSP readouts, stroboscopic tuner display
- Sidebar workspaces concept (we have no multi-workspace navigation)
- Studio knobs/faders UI metaphor (beyond our scope)
- Tailwind CDN + Material Symbols (incompatible; we use Tailwind v4 CSS-first + lucide)
- Music theory errors in the mockups (incorrect interval formulas, wrong chord constructions)

## 2. Impact Analysis

| Area | Impact |
|---|---|
| Epics 1–7 | None — all complete or in-progress (Epic 3 deploy gate). No scope change. |
| New work | **Epic 8: Obsidian Visual Refresh**, ~5 stories (see below). |
| PRD | No functional changes. Add §5 note acknowledging visual refresh direction. |
| Architecture | No change. Frontend-only; no new API routes, no schema changes. New font (Plus Jakarta Sans) loaded via Google Fonts. |
| UX spec | New "Visual Refresh Direction — 2026-11-18" section replacing the Epic 5 Aurora aesthetic with Obsidian direction for the dark theme. Light theme gets corresponding depth/type/radii updates but keeps its own colour palette. |
| Design tokens | Significant token changes in `index.css` — new surface layers, updated glass tokens, new typography tokens, updated radii, new glow/shadow tokens. |
| Fretboard | SVG rendering updated: recessed board (inner shadow), metallic fret styling, gold root halo, updated dot sizing. FretDot token values change; rendering logic and states unchanged. |
| Testing | Existing contrast audit tests (5.5 pattern) must re-run against new palette. |
| Fonts | Add Plus Jakarta Sans via Google Fonts import. |

## 3. Recommended Approach

**Option 1 — Direct Adjustment** (add Epic 8 within the existing plan).
- Rollback: not viable — nothing needs reverting.
- MVP review: not needed — MVP delivered; this is post-MVP visual polish.
- **Effort:** Medium-High (5 frontend stories, significant token/styling work, contrast re-audit).
- **Risk:** Low-Medium — isolated to CSS tokens, typography, and SVG styling. Main risk is contrast regressions across 6 themes, mitigated by the same audit pattern from 5.5.
- **Timeline:** no impact on other work; Epic 3 deploy gate remains independent.

## 4. Detailed Change Proposals

### 4.1 Epics File Update

**Section:** Add Epic 8 after Epic 7

```markdown
## Epic 8: Obsidian Visual Refresh
Goal: Reskin the app chrome and fretboard to the "Obsidian Audio Lab" aesthetic — deeper dark palette, studio-grade typography (Plus Jakarta Sans headings), tighter geometry, recessed fretboard with metallic frets, glow-based elevation. Visual-only; no new features, no backend changes. Source: stitch_fretwise_interactive_guitar_fretboard/ DESIGN.md + sprint-change-proposal-2026-11-18.md.
Reqs: UX-DR (visual execution refresh round 2). Applies to all 6 themes.

### Story 8.1: Obsidian Token Foundation & Typography
As a developer, I want the new surface palette, typography scale, radii, and glow/shadow tokens installed so every subsequent story builds on one foundation.

**Acceptance Criteria:**
- New surface tier tokens: `--color-surface-floor` (#0B0D13), `--color-surface-1` (#12151F), `--color-surface-2` (#181C2A), `--color-surface-interactive` (rgba(255,255,255,0.05) hover overlay)
- Plus Jakarta Sans loaded via Google Fonts; applied to headings (h1–h3, panel titles, section labels)
- JetBrains Mono extended to all numeric readouts (fret numbers, tuning labels, interval formulas)
- Corner radii tightened: controls 4px (`rounded`), panels 8px (`rounded-lg`), full-round pills for chips/badges
- Updated `--glass-*` tokens for deeper translucency matching obsidian palette
- Shadow tokens revised: glow-first (no arbitrary drop shadows); `--glow-primary` updated to indigo spectrum, `--glow-root` new gold halo token
- All 6 themes updated with corresponding depth; light theme gets tinted-white depth (not obsidian)
- Existing tests pass; no visual regression to fretboard rendering at this stage

### Story 8.2: Chrome Reskin — ControlBar, Selectors & Mode Chips
As a user, I want the control bar and selectors to feel like precision studio equipment.

**Acceptance Criteria:**
- ControlBar uses new surface tokens, compact height (~48-52px), tighter group spacing
- Selectors restyled: recessed slot container (#0B0D13), active segment pops with surface-2 fill + white text + indigo underglow
- Segmented pill controls for mode chips (replacing current chip style)
- Icon buttons get machined/hardware aesthetic: subtle radial gradient on hover, 1px top highlight stroke
- Action buttons: subtle gradient (indigo-to-deeper-indigo), frosted top highlight, 4px radius
- Mobile: controls wrap cleanly; bottom-sheet pattern for tools (from Stitch mobile reference)
- All themes styled; tooltips use glassmorphic pane style

### Story 8.3: Fretboard Visual Upgrade
As a guitarist, I want the fretboard to look and feel like a real instrument.

**Acceptance Criteria:**
- Fretboard surface: recessed with inner shadow (`inset 0 2px 4px rgba(0,0,0,0.7)`), dark ebony gradient (#131118 to #1E1B24)
- Fret wire: polished nickel-silver dual-gradient (highlight #94A3B8 over core #475569), 1px specular top + 1px shadow below
- String rendering: wound bronze gradient on low strings (warm), bright steel on treble (existing shadow/specular lines refined)
- Pearl inlay markers: iridescent oyster (#E2E8F0 with subtle cyan refraction)
- Root note dots: gold halo/glow (`0 0 16px rgba(245,158,11,0.45)`) — larger than other dots (28px vs 24px for scale tones)
- Scale/chord/mode/freeform dot styling updated with new palette; rendering logic + states unchanged
- Fret numbers along the top (current position) with obsidian micro typography (JetBrains Mono 11px)
- All changes are token/style only — no geometry, no rendering logic, no state changes
- <100ms re-render NFR maintained
- WCAG 2.1 AA contrast verified for all dot states against new board surface in dark theme

### Story 8.4: Library, Panels & Overlay Reskin
As a user, I want all panels and overlays to share the same studio-grade glass language.

**Acceptance Criteria:**
- LibraryPanel: deeper glass surface, sliding tab indicator, item hover-elevation with new glow tokens
- PaywallCard: obsidian glass overlay, gold shimmer on premium lock badges
- Auth modals / sheets / Custom Tuning Creator: unified obsidian glass treatment
- Chord Progression Builder: segmented controls, studio styling
- All overlays use directional border highlights (brighter top-left, darker bottom-right simulating overhead lighting)
- Mobile bottom-sheet: full-bleed obsidian surface with 44px peek handle
- prefers-reduced-transparency fallback maintained

### Story 8.5: Contrast & Accessibility Audit + Theme Harmonization
As a user, I want every theme to remain accessible and visually harmonious with the new aesthetic.

**Acceptance Criteria:**
- All 6 themes (dark/neon/mono/vibrant/minimal + light) audited with new dot values against new surfaces
- WCAG 2.1 AA (>=3:1 non-text, >=4.5:1 text) verified for every dot state in every theme — computed, not eyeballed
- Deuteranopia + protanopia separation verified for root/scale/mode trio in every theme
- Plus Jakarta Sans fallback chain verified (system sans-serif)
- prefers-reduced-motion: all new transitions gated
- prefers-reduced-transparency: all glass collapses to nearest solid obsidian surface
- Cross-browser backdrop-filter check (Chrome, Firefox, Safari, Edge)
- Full regression: vitest run + tsc --noEmit + lint + build green
- Live browser check at desktop + 375px across all 6 themes
```

### 4.2 UX Specification Update

**Section:** Add "Visual Refresh Direction — 2026-11-18" after the Epic 5 "Visual Overhaul Direction" section

```markdown
### Visual Refresh Direction — 2026-11-18 (Epic 8, Obsidian Audio Lab)
- Scope: visual styling layer ONLY — deeper palette, new heading font, tighter radii, fretboard material upgrade, glow-based elevation. NO feature changes, NO layout architecture changes, NO backend.
- Source: Stitch "Fretwise / Obsidian Audio Lab" export — look-and-feel inspiration only. Features in mockups are NOT adopted.
- Aesthetic = **Obsidian Studio**: deep layered dark surfaces simulating studio rack equipment, phosphor glow elevation, metallic fretboard materials, precision typography
- Typography addition: Plus Jakarta Sans for headings (section titles, panel headers, modal titles); Inter and JetBrains Mono roles unchanged
- Surface depth: 4-tier obsidian surface system (floor → surface-1 → surface-2 → interactive overlay); replaces flat dark tokens
- Fretboard materials: recessed ebony board (inner shadow), nickel-silver fret wire (specular + shadow), pearl inlays (iridescent), wound bronze / bright steel strings
- Dot elevation: root gets gold phosphor halo (glow, not shadow); other dots get subtle state-matched glow
- Radii: tightened to 4px (controls), 8px (panels), full-round (pills/badges) — "rack gear" precision
- Controls: segmented pill selectors, recessed slot containers, hardware-inspired button styling
- Glass: deeper translucency values, directional border highlights (simulated overhead lighting)
- DECISION POINT — Dot colour semantics: Stitch mockups assign blue=scale, green=chord, gold=root. Current app uses violet=scale, rose/cyan=mode, gold=root. Recommendation: keep current semantic mapping (it's contrast-checked across 6 themes), apply only the visual treatment (glow, sizing, depth). Owner to confirm.
- Light theme: corresponding depth/type/radii but white-tinted surfaces, not obsidian
- Applies to all 6 themes; each theme gets the structural upgrades (depth, radii, type, fretboard materials) while keeping its own colour palette
```

### 4.3 Sprint Status Update

Add to `sprint-status.yaml`:
```yaml
  # ─── Epic 8: Obsidian Visual Refresh ─────────────────────────────────────────
  # Visual reskin to Obsidian Audio Lab aesthetic. Frontend-only, no backend/API.
  # Source: stitch_fretwise_interactive_guitar_fretboard/ + sprint-change-proposal-2026-11-18.md
  epic-8: backlog
  8-1-obsidian-token-foundation-and-typography: backlog
  8-2-chrome-reskin-controlbar-selectors-modechips: backlog
  8-3-fretboard-visual-upgrade: backlog
  8-4-library-panels-overlay-reskin: backlog
  8-5-contrast-accessibility-audit-theme-harmonization: backlog
```

## 5. Decision Points

1. **Dot colour semantics** — The Stitch mockups change what colours mean (blue=scale, green=chord). I recommend keeping the current meanings (violet=scale, rose=mode, cyan=freeform, gold=root) since they're contrast-checked across all 6 themes and the legend depends on them. We borrow only the glow, sizing, and depth treatment. **Owner decision needed.**

2. **New look as default dark theme vs. separate theme** — My recommendation is that the obsidian aesthetic becomes the new default dark theme (everyone gets it). The 4 premium themes + light theme pick up the structural upgrades (typography, radii, fretboard materials) but keep their own colour palettes. Alternative: add "Obsidian" as a 6th premium theme and leave dark unchanged. **Owner decision needed.**

3. **Epic 7 retrospective** — Epic 7 is fully done (7.1–7.4 committed). Should we run the retrospective before starting Epic 8, or defer it? Previous pattern has been to run retros between epics. **Owner decision needed.**

## 6. Implementation Handoff

**Scope:** Minor — Direct implementation by Developer agent.
- All changes are frontend-only CSS/SVG styling
- No new features, no backend, no API changes
- Follows the same Epic 5 pattern (token foundation → component reskin → audit)
- Story creation via `bmad-create-story`, implementation via `bmad-dev-story`

**Sequence:** Epic 7 retrospective (optional) → CS 8.1 → VS 8.1 → DS 8.1 → CR 8.1 → ... → ER Epic 8

**Success criteria:** All 6 themes pass WCAG 2.1 AA contrast audit, 750+ tests green, live browser check at desktop + 375px shows the obsidian aesthetic across all surfaces.
