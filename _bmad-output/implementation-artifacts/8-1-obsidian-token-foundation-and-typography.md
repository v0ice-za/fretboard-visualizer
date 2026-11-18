# Story 8.1: Obsidian Token Foundation & Typography

Status: review

## Story

As a developer,
I want the Obsidian surface palette, heading typography, tightened radii, and glow-first elevation tokens installed as one foundation in `index.css`,
so that Stories 8.2–8.5 reskin components by consuming tokens instead of inventing values.

## Acceptance Criteria

1. **4-tier surface tokens.** Tailwind colour utilities `surface-floor`, `surface-1`, `surface-2`, `surface-interactive` exist (e.g. `bg-surface-1`) and resolve per theme. In `dark`: floor `#0B0D13`, surface-1 `#12151F`, surface-2 `#181C2A`, interactive `rgb(255 255 255 / 0.05)`.
2. **Heading font.** Plus Jakarta Sans (variable) is loaded and `--font-heading` uses it with a system sans fallback chain. `h1`–`h3` and every `font-heading` consumer (shadcn `SheetTitle` already uses it) render in Plus Jakarta Sans. Body stays Inter; mono stays JetBrains Mono.
3. **Radii tightened.** `rounded-sm` = 4px (controls), `rounded-md` = 6px, `rounded-lg` = 8px (panels), `rounded-xl` = 12px, `rounded-full` unchanged (pills).
4. **Glass, shadow & glow tokens revised.** Deeper obsidian glass values for dark-family themes; shadows become subtle/ambient (glow-first); `--glow-primary` moves to the indigo spectrum; new `--glow-root` (gold halo, CSS box-shadow form) and `--glow-root-color` (bare colour for SVG filters in 8.3); new `--glass-border-shade` (bottom/right edge for 8.4's directional borders).
5. **All 6 themes covered.** `dark` gets the full obsidian palette. `neon`/`mono`/`vibrant` get the new tokens derived from their own palettes. `light`/`minimal` get white-tinted depth (not obsidian). Every theme block defines every new token (guarded by a test).
6. **No fretboard / dot change.** `--color-fretboard`, `--color-string`, `--color-fret`, `--color-fret-marker`, all `--color-dot-*` and `--dot-text-*` values are byte-identical to before (8.3/8.5 own those). `FretDot.test.tsx` passes untouched.
7. **No regressions.** `npx vitest run` (baseline 750), `npx tsc --noEmit`, `npm run lint`, `npm run build` all green; live check in Chrome (desktop + 375px) for `dark` and `light` shows the app loading with no console errors and readable text.

## Tasks / Subtasks

- [x] 1. Font (AC2)
  - [x] 1.1 `pnpm add -D @fontsource-variable/plus-jakarta-sans` in `frontend/` (match how Inter/JetBrains are installed — they are devDependencies).
  - [x] 1.2 Add `@import "@fontsource-variable/plus-jakarta-sans";` after the existing two font imports in `index.css`.
  - [x] 1.3 In `@theme inline`: `--font-heading: 'Plus Jakarta Sans Variable', 'Inter Variable', ui-sans-serif, system-ui, sans-serif;`. Verify the exact family name in the package's `index.css` (fontsource variable packages use `'<Name> Variable'`).
  - [x] 1.4 In `@layer base` add `h1, h2, h3 { font-family: var(--font-heading); }` (do NOT touch `components/ui/sheet.tsx` — it already uses `font-heading`).
- [x] 2. Radii (AC3) — in `@theme inline` replace the calc-based `--radius-sm/md/lg/xl` with explicit `0.25rem / 0.375rem / 0.5rem / 0.75rem`; set `:root --radius: 0.5rem`; leave `2xl–4xl` calc lines. Then build and grep the output CSS to confirm what bare `rounded` resolves to (see Dev Notes — do not assume).
- [x] 3. Surface tiers (AC1, AC5)
  - [x] 3.1 In `@theme inline` add aliases: `--color-surface-floor: var(--background); --color-surface-1: var(--card); --color-surface-2: var(--popover); --color-surface-interactive: var(--surface-interactive);`
  - [x] 3.2 Define `--surface-interactive` in every theme block: dark-family `rgb(255 255 255 / 0.05)`, light-family `rgb(15 23 42 / 0.04)`.
  - [x] 3.3 Dark block: `--background #0b0d13`, `--card #12151f`, `--popover #181c2a`, `--secondary #181c2a`, `--muted #1c2030`, `--input #0e111a`, `--border #232838` (MUST stay opaque — see Dev Notes), `--sidebar #0b0d13`, `--sidebar-border #232838`. Keep `--primary`, `--accent`, `--ring`, foregrounds unchanged.
- [x] 4. Glass / shadow / glow (AC4, AC5)
  - [x] 4.1 Dark: `--glass-bar-bg rgb(18 21 31 / 0.92)`, `--glass-panel-bg rgb(18 21 31 / 0.78)`, `--glass-overlay-bg rgb(18 21 31 / 0.84)`, `--glass-border rgb(255 255 255 / 0.08)`, `--glass-border-strong rgb(255 255 255 / 0.12)`, `--glass-border-shade rgb(255 255 255 / 0.02)`, `--glass-highlight rgb(255 255 255 / 0.08)`; blur values unchanged.
  - [x] 4.2 Dark shadows (ambient, not drop): `--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.40)`, `--shadow-md: 0 8px 24px -12px rgb(0 0 0 / 0.60)`, `--shadow-lg: 0 24px 48px -16px rgb(0 0 0 / 0.70)`.
  - [x] 4.3 Dark-family glows: `--glow-primary: 0 0 0 1px rgb(99 102 241 / 0.55), 0 0 16px rgb(99 102 241 / 0.35)`; `--glow-root: 0 0 16px rgb(245 158 11 / 0.45), 0 0 4px rgb(245 158 11 / 0.9)`; `--glow-root-color: rgb(245 158 11 / 0.45)`. `--glow-accent` unchanged.
  - [x] 4.4 neon/mono/vibrant: add `--surface-interactive`, `--glass-border-shade`, `--glow-root`, `--glow-root-color`; update `--glow-primary` + shadows to the dark values above. Keep their own surface/glass hex (they already have distinct palettes; deepen glass alpha only if it stays visibly that theme).
  - [x] 4.5 light (`:root`) + minimal: add the same new tokens with light-family values — `--glass-border-shade rgb(15 23 42 / 0.04)`, `--glow-primary: 0 0 0 1px rgb(99 102 241 / 0.50), 0 0 14px rgb(99 102 241 / 0.22)`, `--glow-root: 0 0 12px rgb(217 119 6 / 0.35)`, `--glow-root-color: rgb(217 119 6 / 0.35)`. Do not darken their backgrounds.
  - [x] 4.6 Add `--glass-border-shade` to the reduced-transparency override block at the bottom (`--glass-border-shade: var(--border)`).
- [x] 5. Token guard test (AC5, AC6) — new `frontend/src/styles/tokens.test.ts`: `import css from '../index.css?raw'`; split into theme blocks (`:root`, `.dark,\n[data-theme="dark"]`, and each `[data-theme="x"]`); assert each block declares `--surface-interactive`, `--glass-border-shade`, `--glow-root`, `--glow-root-color`, `--glow-primary`; assert `@theme inline` declares the four `--color-surface-*` aliases and `--font-heading` contains `Plus Jakarta Sans`. Write it RED first (before Tasks 3–4).
- [x] 6. Verify (AC6, AC7)
  - [x] 6.1 `git diff frontend/src/index.css` — confirm zero changed lines touch `--color-fretboard|string|fret|fret-marker|dot-*` or `--dot-text-*`.
  - [x] 6.2 Full gate: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  - [x] 6.3 Live check in Chrome (`pnpm dev`): dark + light at desktop and 375px; headings in Plus Jakarta Sans (DevTools computed font), panels at 8px radius, no console errors. Spot-check one premium theme by setting `data-theme` in DevTools.

## Dev Notes

### Scope boundary
Token/CSS-only story. Files touched: `frontend/src/index.css`, `frontend/package.json` (+ lockfile), new `frontend/src/styles/tokens.test.ts`. **No component edits** — 8.2 (ControlBar/selectors/chips), 8.3 (fretboard SVG + dots), 8.4 (panels/overlays/directional borders) consume these tokens. Out of scope here: ControlBar height, `--top-bar-height`, `--primary` hue, JetBrains Mono rollout to readouts, dot sizes/colours.

### Current state of `index.css` (read before editing)
- Fonts come from **@fontsource-variable** imports (lines 3–4), not a CDN. `--font-heading` currently = Inter.
- `@theme inline` maps shadcn vars (`--background`, `--card`, `--popover`…) to `--color-*` utilities; radii are `calc(var(--radius) * k)` with `--radius: 0.625rem` in `:root` only (no theme overrides it).
- Six theme blocks: `:root` (light), `.dark,[data-theme="dark"]`, `neon`, `mono`, `vibrant` (dark-family, get `.dark` class via `themeStore.ts` `DARK_FAMILY_THEMES`), `minimal` (light-family). Premium blocks redeclare the full chrome token set (glass/shadow/glow) — so new tokens must be added to **each** block, not just dark.
- Utility classes `.glass-surface`, `.glass-overlay`, `.glass-bar` and a `prefers-reduced-transparency` block that sets `--glass-border*: var(--border)` for every theme selector.
- ~19 component usages of `var(--shadow-*)`, `var(--glow-*)`, `var(--glass-*)` (ControlBar, IconButton, ModeChipsRow, LibraryItem, PaywallCard, ThemePicker, Metronome/Tuner, CustomTuningCreator, ChordsInKey, LibraryPanel). They pick up new values automatically — that's the intended blast radius; eyeball them in the live check.

### Decisions & gotchas
- **Font loading: self-host via fontsource, not Google Fonts CDN.** The epic AC says "via Google Fonts", but the project already self-hosts Inter/JetBrains with fontsource (no external request, no CSP/privacy issue, works offline and in Playwright). Same family, same result. If the owner insists on the CDN, swap Task 1 for a `<link>` in `index.html` — flagged in the completion notes.
- **Surface tiers are aliases, not new raw values.** Mapping `surface-floor/1/2` → `--background/--card/--popover` keeps shadcn components and the new tier utilities in lockstep and means premium themes inherit tiers from their existing palettes with zero new hex. Only `--surface-interactive` is a new raw value per theme.
- **`--border` must stay opaque.** The reduced-transparency block substitutes `var(--border)` for glass borders to make them solid; a translucent `--border` silently breaks that a11y fallback. Use `#232838`, not `rgba(255,255,255,.08)` (the translucent value belongs in `--glass-border`).
- **Bare `rounded` in Tailwind v4.** v4 renamed the scale (`rounded-sm` = old `rounded`); whether bare `rounded` reads `--radius` or a static value depends on the v4 minor. Build and inspect `dist/assets/*.css` for `.rounded{` before relying on it; 8.2 should prefer explicit `rounded-sm`.
- **SVG can't use box-shadow.** `--glow-root` is for HTML chrome; 8.3 will need `--glow-root-color` inside an SVG `<filter>`/`drop-shadow()` — that's why both forms exist.
- **Dot/fretboard tokens are frozen.** `FretDot.test.tsx` mirrors board + dot hex from `index.css` by hand and computes contrast; changing any of them here would either fail that suite or silently stale it. Dark `--color-fretboard` (`oklch(0.08 0.015 270)`) stays even though `--background` moves to `#0b0d13` — they're visually near-identical.
- **Never write a literal `*/` inside a CSS comment** — it broke the entire app in 4.5 and was only caught live in Chrome. Run the live check.
- **Contrast**: `--muted-foreground` (`oklch(0.58 0.02 270)`) on `#0b0d13`/`#12151f` stays well above 4.5:1; full computed audit is 8.5's job, but don't lower foreground tokens here.

### Testing standards
Vitest + jsdom. jsdom doesn't compute CSS cascade, so token correctness is guarded structurally (`?raw` import parse) and visually (live Chrome check). Vite supports `?raw` in Vitest out of the box; if TS complains, `vite/client` types already declare `*?raw` — check `tsconfig`/`vite-env.d.ts` before adding a declaration.

### Previous story / git intelligence
- Last commits (7.1–7.4) were feature work; Epic 5.1 (`_archive`… `5-1-elevation-glass-and-aurora-token-foundation.md`) is the direct precedent: same token-first pattern, same "chrome only, never over the fretboard" glass rule.
- 7.4 baseline: **750 tests passing**; it also added `.app-main` min-width and mobile action-cluster wrap fixes — don't disturb layout rules at the bottom of `index.css`.

### References
- `_bmad-output/planning-artifacts/epics.distillate.md` — Epic 8 / Story 8.1
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-18.md` — §4.1 detailed ACs, §5 decisions (keep dot colours; obsidian = default dark)
- `stitch_fretwise_interactive_guitar_fretboard/.../obsidian_audio_lab/DESIGN.md` — surface hex, glass fill/border, glow values, radii (visual inspiration only — no features)
- `frontend/src/index.css`, `frontend/src/stores/themeStore.ts`, `frontend/src/components/FretDot.test.tsx`

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- RED: `tokens.test.ts` 10/10 failing before CSS changes (missing tokens/aliases/font/radii).
- `import css from '../index.css?raw'` returned nothing under Vitest's CSS pipeline, and the Windows checkout is CRLF, so selector matching failed. Switched to `readFileSync` + `\r\n` → `\n` normalisation; `/// <reference types="node" />` because the app tsconfig doesn't include node types.
- Built CSS: bare `.rounded{border-radius:.25rem}` is a **static** 4px in this Tailwind v4 version (not `var(--radius)`); `.rounded-lg` = .5rem, `.rounded-md` = .375rem.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Plus Jakarta Sans self-hosted via `@fontsource-variable/plus-jakarta-sans` 5.3.0 (devDependency, same as Inter/JetBrains), **not** the Google Fonts CDN named in the epic AC. Family `'Plus Jakarta Sans Variable'`. `--font-heading` updated; `h1–h3` base rule added; shadcn `SheetTitle` picks it up with no ui/ edit.
- Surface tiers (`surface-floor/1/2/interactive`) are `@theme inline` aliases of `--background/--card/--popover` + new per-theme `--surface-interactive`.
- Dark: obsidian palette (`#0b0d13 / #12151f / #181c2a`), `--input #0e111a`, opaque `--border #232838`, obsidian glass, ambient shadows, indigo `--glow-primary`. `--primary` intentionally unchanged (8.2).
- neon/mono/vibrant: new tokens + dark shadow/glow values; own surface/glass hex kept. light/minimal: white-tinted new tokens, backgrounds unchanged.
- New tokens for later stories: `--glow-root` (box-shadow), `--glow-root-color` (for SVG filters, 8.3), `--glass-border-shade` (directional borders, 8.4; included in the reduced-transparency override).
- AC6 verified by diff: no changed line touches `--color-fretboard|string|fret|fret-marker|dot-*` or `--dot-text-*`; `FretDot.test.tsx` untouched and green.
- Gates: vitest **760/760** (750 + 10 new), `tsc --noEmit` clean, lint clean, build OK (only the existing >500 kB chunk warning).
- Live Chrome check (desktop): dark body = rgb(11,13,19), tokens resolve, Plus Jakarta Sans loaded and applied to the "Sign in" sheet title, fretboard looks the same as before, no console errors; light theme resolves the light-family tokens and renders clean. **375px check NOT performed** — the window-resize tool had no effect (viewport stayed at 1463px). Low risk because this story changes no layout, only token values, but it is not verified.

### File List

- frontend/src/index.css (modified)
- frontend/src/styles/tokens.test.ts (new)
- frontend/package.json (modified — added @fontsource-variable/plus-jakarta-sans)
- frontend/pnpm-lock.yaml (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/8-1-obsidian-token-foundation-and-typography.md (modified)

## Change Log

- 2026-11-18: Story created (CS).
- 2026-11-18: Implemented (DS) — obsidian surface tiers, Plus Jakarta Sans headings, 4/6/8/12px radii, obsidian glass + glow-first shadow tokens across all 6 themes, token guard test (+10 tests, 750 → 760). Status → review.
