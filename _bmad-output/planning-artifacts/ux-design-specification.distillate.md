---
type: bmad-distillate
sources:
  - "ux-design-specification.md"
downstream_consumer: "dev agent implementing guitar app stories"
created: "2026-05-26"
revised: "2026-09-08 (added Visual Overhaul Direction — Epic 5, Aurora glass-first)"
token_estimate: 2450
parts: 1
---

## Project Identity
- Guitar app: fretboard visualization for songwriters/explorers; core loop = open → pick tuning → pick root+scale → fretboard highlights instantly
- Inspired by Guitar Pro 6 scale highlight; anti-reference for aesthetics, load time, navigation friction, fixed small fretboard
- Primary user: Voice (SA guitarist/songwriter), desktop-first during writing sessions, phone secondary; knows music theory
- Secondary: alternate-tuning guitarists needing fast visual reference
- UX reference: Songsterr (content-dominant layout, persistent minimal controls, non-aggressive premium layer)

## Core Principles
- Zero to fretboard: fretboard is landing state, nothing gates access
- Scale with screen: fretboard fills viewport; user controls size by resizing window
- Overlay don't replace: mode exploration adds info, parent scale is always foundation
- Instant and silent: all interactions < 100ms, no spinners, no loading states on core interactions
- Controls defer to fretboard: selectors/panels are compact and secondary
- Fretboard orientation: low E left, high e right; shows whole neck (all 24 frets simultaneously)

## Success Criteria
- App loads → fretboard visible, no action required
- Tuning change → string labels + highlights update < 100ms
- Scale selection → all scale notes light up across 24 frets simultaneously
- Mode overlay → characteristic notes appear as distinct 3rd colour, parent scale unchanged
- Mode swap → previous overlay disappears, new appears instantly
- Note Name Toggle → pitch names appear/disappear on dots, no layout shift
- Capo set → fretboard shifts, note names update, highlights reposition simultaneously

## Design System
- Stack: Tailwind CSS + shadcn/ui + CSS custom property theming (rationale: bespoke canvas component needs freedom; no opinionated system; shadcn/ui is headless/owned code; CSS vars enable zero-cost theme switching)
- Rejected: MUI, Ant Design (impose aesthetic defaults conflicting with dark pro-tool identity)
- Fonts: JetBrains Mono (all fretboard text: note names, nut labels, fret numbers); Inter (all UI chrome: selectors, tooltips, nav, paywall)

## Design Tokens — Dark Theme (Free Default)
- `--color-bg`: `#080810`; `--color-surface`: `#0f0f1a`; `--color-surface-raised`: `#16162a`; `--color-border`: `#1e1e30`
- `--color-fretboard`: `#0b0b16`; `--color-string`: `#3a3a5c`; `--color-fret`: `#1a1a2e`; `--color-fret-marker`: `#1e1e35`
- `--color-text-primary`: `#e2e8f0`; `--color-text-secondary`: `#64748b`; `--color-text-muted`: `#334155`
- `--color-dot-root`: `#f59e0b` (amber); `--color-dot-scale`: `#6366f1` (indigo); `--color-dot-mode`: `#fb7185` (rose); `--color-dot-freeform`: `#22d3ee` (cyan)
- Dot rendering: root = 100% opacity, 20px, always dominant; scale = 85% opacity, 18px; mode overlay = 90% opacity, 18px, subtle outer glow; freeform = 80% opacity, 18px, dashed/ring style

## Premium Theme Token Overrides
- Neon: root `#4ade80` green, scale `#22d3ee` cyan, mode `#f0abfc` pink; bg `#0a0a0a`
- Mono: root `#f1f5f9` white, scale `#94a3b8` slate, mode `#cbd5e1` light slate; bg `#1a1a1a`
- Vibrant: root `#fbbf24` gold, scale `#818cf8` violet, mode `#f87171` coral-red; bg `#0d1b2a`
- Minimal: root `#92400e` dark amber, scale `#3730a3` dark indigo, mode `#9f1239` dark rose; bg `#f5f5f0`
- Premium theme fallback: attempting premium theme without subscription silently falls back to dark
- Dot opacity per theme: dark 0.85, neon 0.95, mono 0.90, vibrant 0.90, minimal 0.80

## Typography Scale
- Note name inside dot: JetBrains Mono 10px 500
- Nut string labels (E A D G B e): JetBrains Mono 14px 600
- Fret position numbers: JetBrains Mono 11px 400, muted colour, below fretboard
- Mode chip label: Inter 12px 500
- Dropdown option: Inter 14px 400
- Control bar label: Inter 13px 500
- Tooltip body: Inter 12px 400, max 1 line
- Section header: Inter 15px 600
- Paywall prompt: Inter 13px 400
- Typography in rem: 10px = 0.625rem, 14px = 0.875rem

## Spacing & Layout
- Base unit: 4px (Tailwind default)
- Control bar height: 48px (`h-12`); gap between items: 8px (`gap-2`)
- Fretboard horizontal padding: 16px (`px-4`); vertical padding: 12px (`py-3`)
- Dot diameter scale: 18px custom; root: 20px custom
- Mode chips row height: 32px (`h-8`); gap between chips: 6px (`gap-1.5`)
- Panel padding: 16px (`p-4`); dropdown item height: 36px (`h-9`)
- Fretboard height formula: `calc(100vh - var(--control-bar-height) - var(--mode-row-height))`
- No px-fixed widths on fretboard — must reflow

## Layout Architecture (Chosen: Direction A)
- Chosen: Direction A — Persistent Top Control Bar (evaluated A–F; A wins on fretboard height + all controls visible + mobile scaling + Songsterr mental model match)
- Modular: layout zones separated from zone content; switching layout = changing config object, not rebuild
- Zones: `top-bar` (Tuning/Key/Scale + icon buttons), `mode-row` (conditional on scale active), `fretboard` (always present), `library-panel`, `bottom-bar`
- Default config: `{ topBar: true, modeRow: true, sidePanel: false, bottomBar: false, libraryMode: 'drawer' }`; libraryMode options: `'drawer' | 'sidebar' | 'inline' | 'modal'`
- React structure: `<AppShell layout={activeLayout}>` with named slots; each zone component self-contained, unaware of position
- Desktop layout: Control bar (48px) → Mode chips row (32px, conditional) → Fretboard (fills remaining height)
- Mobile (≤768px): control bar wraps two lines; fretboard scrolls horizontally; dots scale down proportionally; min viewport 375px (~10 frets visible, dots 14px)

## Component Specs
- `AppShell`: CSS Grid, named zone areas, `layout` prop, landmark roles (`<header>`, `<main>`, `<aside>`)
- `FretboardCanvas`: SVG renderer; props: `tuning`, `capo`, `highlights[]` (`{ string, fret, type }`); renders strings/frets/position markers/nut/labels/fret numbers/FretDot children; full 24-fret desktop, scrollable mobile; `role="img"` with dynamic `aria-label`
- `FretDot`: single highlight; states: `root` (amber 20px 100%), `scale` (indigo 18px 85%), `mode` (rose 18px 90% glow), `freeform` (cyan 18px 80% dashed ring); optional note name label via Note Name Toggle; each dot has `aria-label` with note name + position
- `ControlBar`: persistent top bar; anatomy: logo · divider · TuningSelect · KeySelect · ScaleSelect · spacer · icon buttons; `<header>` landmark, keyboard-navigable
- `ModeChipsRow`: conditional (renders only when scale active); 7 ModeChip components; hidden (no scale) vs visible (scale active, one chip optionally active)
- `ModeChip`: states default/hover/active; Tooltip with plain-language interval description e.g. "Dorian — Natural Minor with ♮6"; `aria-pressed` reflects active state
- `LibraryPanel`: variants `mode="drawer"` (Dir A/F), `mode="sidebar"` (Dir B/E), `mode="sheet"` (mobile)
- `LibraryItem`: states default/active (indigo tint + checkmark)/locked (muted + Badge lock icon → triggers PaywallCard)/preview; `role="option"`, `aria-selected`, `aria-disabled`
- `PaywallCard`: compact inline, anchored via Floating UI, max-width 280px, never covers fretboard; anatomy: headline · 3-bullet features · price ($12/yr) · Subscribe CTA · dismiss; CTA triggers auth if unauthenticated
- `CustomTuningCreator`: shadcn/ui Sheet; 6 string rows (note + octave selectors) · tuning name input · Save/Discard · live read-only FretboardCanvas preview updating per string; each row labelled "String N"

## shadcn/ui Components (use directly)
- Select/DropdownMenu: tuning/key/scale selectors
- Tooltip: mode chip descriptions, icon button labels
- Sheet: custom tuning creator, library drawer (mobile), auth overlay, settings
- Dialog: paywall prompt (desktop modal variant)
- Slider: capo position (frets 0–12)
- Button: Subscribe CTA, icon buttons
- Badge: lock indicator on premium items
- Separator: dividers in control bar and library panel
- All styled via CSS custom property tokens — no component internals modified

## Component Roadmap
- Phase 1 (core loop): AppShell, FretboardCanvas, FretDot, ControlBar, ModeChipsRow, ModeChip
- Phase 2 (library + freemium): LibraryPanel, LibraryItem, PaywallCard, capo Slider
- Phase 3 (premium): CustomTuningCreator, ThemeSelector, chord progression components

## UX Patterns
- Selector label format: `[Category muted] [Active Value primary] ▾`
- Dropdown structure: free items (section header) → premium items (lock badge) → My Tunings (premium) → Create Custom Tuning at bottom
- Selection is immediate — no Apply button; locked items clickable → triggers PaywallCard; keyboard: arrows navigate, Enter selects, Escape closes
- Tooltip: 300ms delay desktop, 500ms long-press mobile; one sentence max; mode chips: "[Mode] — [parent scale] with [interval difference]"
- Paywall: always inline never blocking modal; lock Badge always visible on locked items; card copy: feature headline + max 3 benefits + $12/yr + Subscribe CTA; post-subscription unlocks in-place, no reload
- Button hierarchy: Primary (filled indigo), Secondary (outlined), Ghost (no border), Icon (32px square), Chip (pill), Destructive (rose outlined)
- Destructive actions require AlertDialog confirmation; one primary action per view max; icon buttons always have Tooltip
- Toast (non-visual actions only): custom tuning saved → "[Name] saved" 3s; subscription activated → "Premium unlocked" 4s; style: `--surface-raised` bg, bottom-right, no colour coding
- Inline error: rose/coral 12px Inter text; within relevant form field
- Empty state: no scale selected → fretboard shows strings/frets, no dots, no placeholder copy (valid starting state)
- Navigation: SPA; URL query params for state (`?tuning=drop-d&key=A&scale=natural-minor`); auth as Sheet overlay, never full-page redirect
- Freeform marking mobile: requires explicit mode toggle to prevent accidental marks during scroll
- Mode chips mobile: horizontally scrollable, no wrapping

## Mode Overlay Interaction (Novel Pattern)
- Trigger: scale selected → mode chips row appears below control bar
- 7 chips: Ionian | Dorian | Phrygian | Lydian | Mixolydian | Aeolian | Locrian
- Click chip → rose/coral dots appear at characteristic note positions; amber + indigo unchanged
- Click another chip → previous overlay swaps instantly to new
- Click active chip → overlay removed, pure scale view
- Overlay is additive; swapping modes instant with no transition delay
- Three-colour visual language: amber (root), indigo (parent scale), rose (mode characteristic) — must be distinguishable without legend
- Amber/indigo/rose passes deuteranopia + protanopia simulation

## Responsive Design
- Desktop-first; primary target ≥1024px
- ≥1024px: full Direction A, all 24 frets visible, fretboard fills remaining height
- 768–1023px (tablet landscape): same as desktop; selector labels hidden, icon+value only
- <768px (portrait/phone): control bar stacks two rows; fretboard horizontal scroll; library/paywall → bottom Sheet
- 375px minimum: ~10 frets visible, dots scale to 14px
- Fretboard mobile: `overflow-x: auto` wrapper, `touch-action: pan-x` on SVG
- `sm` control bar: Row 1: Logo + selectors; Row 2: mode chips (scrollable); icon buttons collapse to ⋯ overflow menu
- Mobile selectors: native OS picker on iOS/Android

## Accessibility (Target: WCAG 2.1 AA)
- Colour contrast: amber 7.2:1 ✓, indigo 4.6:1 ✓ (large text; note names inside dots may need weight boost at 10px), rose 5.1:1 ✓
- Touch targets: minimum 44×44px effective touch area; freeform fret positions enlarged via tap zone padding
- Tab order: Logo → Tuning → Key → Scale → Icon buttons → Mode chips
- Mode chips keyboard: arrow keys navigate, Enter/Space toggle; fretboard freeform: arrows navigate positions, Space toggles mark
- Focus indicators: 2px indigo outline, 2px offset; never `outline: none` without replacement
- FretboardCanvas: `role="img"`, dynamic `aria-label` updated on every state change (e.g. "Guitar fretboard, Drop D tuning, A Natural Minor scale highlighted, Dorian mode overlay active"); visual content not individually screen-reader-navigable
- Skip link: `<a href="#fretboard" className="sr-only focus:not-sr-only">Skip to fretboard</a>` at top of AppShell
- `prefers-reduced-motion`: dot transitions skip 80ms fade
- shadcn/ui + Radix handle ARIA automatically — don't override unless necessary
- Dot transitions: 80ms fade (skip with reduced motion)

## Future / Out of Scope for v1
- Playback through scales/chords with speed/tempo control (deferred; fretboard is pure renderer — architecture does not block this)
- Offline support (not required for v1)
- Layout variants tied to premium themes (enabled by modular layout config)
- A/B testing layout without codebase branching (enabled by modular layout config)

## Visual Overhaul Direction — 2026-09-08 Revision (Epic 5)
- Scope: visual execution layer ONLY (elevation, spacing, controls, affordance, motion). Vision/flows/IA/component-strategy above UNCHANGED. Fretboard rendering out of scope.
- Diagnosed gaps in shipped chrome: (1) flat — no elevation/shadow tokens, `--card`/`--popover` near-identical; (2) plain 16px grey icons in bare `p-2` buttons; (3) cramped — 48px bar, 32px buttons (below 44px rule), `gap-1`; (4) mystery icons — native `title` not styled Tooltip (both #3/#4 were already spec-violations)
- Confirmed decisions: depth=**glassy/translucent**; affordance=**labels-on-desktop + tooltips-on-mobile**; signature=**Aurora**; fretboard dot scope=**Option B (retune)**
- Aesthetic = **Glass-first dark**: frosted chrome over solid near-black, luminous hairline borders, layered elevation, soft shadows, restrained glows
- GUARDRAIL: glass on chrome ONLY (bar/panels/dropdowns/sheets/tooltips/paywall). Fretboard NEVER under blur — renders on solid `--color-fretboard`. Also honor `prefers-reduced-transparency` (collapse to solid, drop backdrop-filter) + `prefers-reduced-motion`

### Aurora signature (dark chrome tokens)
- `--signature-grad`: `linear-gradient(100deg, #6366f1, #8b5cf6, #22d3ee)` (logo, primary CTA, active fills)
- `--primary` → `#8b5cf6` electric violet; accent → `#22d3ee` cyan; neutrals → cool blue-slate (`#e6e8f2`/`#99a1b7`/`#626b83`); canvas `#080810` retained
- Alternatives rejected: Ember (warm amber→coral→magenta), Halcyon (teal→emerald→lime)

### New tokens (add to `.dark`/`[data-theme]` + light `:root`, OKLCH)
- `--glass-bar-bg` ~`oklch(0.11 0.02 270 / 0.70)`; `--glass-panel-bg` ~`/0.78`; `--glass-overlay-bg` ~`oklch(0.14 0.025 270 / 0.88)`; `--glass-blur` 16px; `--glass-blur-strong` 24px
- `--glass-border` `oklch(0.70 0.04 270 / 0.14)`; `--glass-border-strong` `/0.24`; `--glass-highlight` `oklch(1 0 0 / 0.06)`
- `--shadow-sm/md/lg`; `--glow-primary` (1px violet ring + soft violet blur); `--glow-accent` (cyan)
- Light theme: glass = light-tinted white translucency ~0.65–0.85 alpha; softer shadows; darker borders
- `.glass-surface` recipe: bg + `backdrop-filter: blur() saturate(1.2)` + 1px `--glass-border` + `--shadow-md` + `inset 0 1px 0 --glass-highlight` (the inset top-highlight + shadow = "lifted glass")

### Density upgrades (from → to)
- `--top-bar-height` 48px → **60px (3.75rem)**; bar padding `py-2 px-4` → `py-2.5 px-5`; group gap `gap-2` → `gap-3` + `Separator`s
- icon button 32px → **44px min** (visual ~40px); icon glyph 16px → **18–20px**; icon gap `gap-1` → `gap-1.5/2`; capo label 12px → 13px; base UI type 14px, panel headers 15px

### Control & affordance
- `IconButton` component: 40px container, 18–20px glyph, hover-lift + `--shadow-sm`, active = `--primary` fill + `--glow-primary`, 44px touch, visible focus ring
- Desktop (`md`+): action cluster shows icon + label ("Notes"/"Draw"/"Library"/"Account"); < `md`: icon-only + styled shadcn `Tooltip` (~150ms) — REMOVE all native `title`
- Selectors: taller (h-10), glass rest, `[Category]`/`[Value]`, `--glow-primary` focus; `SelectContent` on `--glass-overlay-bg` + `--shadow-lg`
- Logo refreshed ~24–26px + accent glow; capo slider glass+glow

### Component polish
- ControlBar (highest impact): glass bar floats over board + `--shadow-md`, grouped w/ `Separator`s, desktop labels
- ModeChipsRow: pill glass chips, active rose+glow, bigger tap; LibraryPanel: glass aside + `--shadow-lg`, sliding tab indicator, item hover-elevation + polished locked state
- PaywallCard: glass overlay + `--shadow-lg` + `--glow-primary` CTA, still non-blocking; Auth (LoginModal/EmailAuthForm/GoogleAuthButton) + all sheets/dialogs on `--glass-overlay-bg` unified
- NavTabs.jsx (parallel legacy nav + "Upgrade to Pro") → fold-in or remove; one nav system only

### Fretboard dot retune — Option B (token values only; layout/logic/3-colour scheme unchanged)
- root `#f59e0b`→**`#fbbf24` gold** (warm anchor kept); scale `#6366f1`→**`#8b5cf6` violet**; mode `#fb7185`→**`#22d3ee` cyan**; freeform `#22d3ee`→**`#f0abfc` pink**
- GATE: retuned trio + freeform must re-verify WCAG AA over glass-composited board (both themes) + deuteranopia/protanopia separation before ship; note names = non-colour fallback

### Motion
- hover-lift/glow 120ms; dropdowns/sheets 150–180ms scale+fade; library tab slide 180ms; ALL behind `prefers-reduced-motion`; fretboard 80ms dot transition UNCHANGED

### Epic 5 story seams
- 5.1 tokens+`.glass-surface`+density+reduced-transparency (both themes; dots NOT changed) → 5.2 ControlBar+IconButton+selectors+tooltips → 5.3 Library+chips+PaywallCard → 5.4 auth+sheets+NavTabs reconcile → 5.5 dot retune + contrast/colour-blind/motion/cross-browser audit
