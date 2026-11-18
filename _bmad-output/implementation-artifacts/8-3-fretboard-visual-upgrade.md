# Story 8.3: Fretboard Visual Upgrade

Status: review

## Story

As a guitarist,
I want the fretboard to look like a real instrument,
so that the main view has the Obsidian "studio gear" feel.

## Acceptance Criteria

1. Recessed board: the scroll wrapper is a well (`.fretboard-well`: 8px radius, `--board-well-shadow` inset); top/bottom edges of the board are shaded with a depth gradient.
2. Nickel-silver fret wire: shadow line + `--fret-wire` core + `--fret-wire-highlight` specular.
3. Strings: wound bronze (`--string-wound`) on the three low strings, drawn steel (`--string-plain`) on the trebles; mono theme keeps grey strings.
4. Pearl inlays: `--inlay-pearl` fill at 20% with a `--inlay-refraction` rim.
5. Root dots: gold phosphor halo via an SVG filter driven by `--glow-root-color`; root/mode-root 28px, other tones 24px.
6. Dot colours, opacities, states and rendering logic unchanged; `--color-fretboard` (the contrast basis) unchanged.
7. Regression gate green.

## Tasks / Subtasks

- [x] 1. Material tokens in `index.css`: dark family on `.dark` (inherited by neon/mono/vibrant via the `.dark` class), light family in `:root` + `minimal`; mono overrides `--string-wound`.
- [x] 2. `FretboardCanvas.tsx`: depth gradient overlay rect (edges only — 0–9% and 93–100%, outside the string band), material strokes, `PEARL` inlay props, `fretboard-well` class.
- [x] 3. `FretDot.tsx`: radii 14/12, `ROOT_GLOW_FILTER_ID` filter in `FretDotDefs`, applied to `root`; updated `FretDot.test.tsx` (radius values, root now asserts the root-glow filter).
- [x] 4. Gate + live check.

## Dev Notes

- SVG gotchas handled: CSS `var()` doesn't resolve in presentation attributes such as `flood-color` or `stop-color`, so those are set via `style`. An objectBoundingBox gradient on a zero-width vertical line renders nothing, so the fret wire keeps the existing three-line technique instead of a gradient.
- WCAG: the composited-contrast suite in `FretDot.test.tsx` still passes unchanged. Dot fills, opacities and the board colour are identical, and the depth overlay doesn't reach any dot position. The glow sits outside the dot, so text-on-dot contrast is unaffected. A computed contrast check of the glow halo against neighbouring dots is 8.5's job.
- Ebony gradient on the board *base* was deliberately not applied: it would change the contrast basis the 4.5/5.5 audits rely on. 8.5 can revisit it with a re-audit.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Completion Notes List

- Live Chrome (desktop): bronze/steel strings, metallic frets, pearl inlays, gold root halos visible in dark and light; mode-note view (Dorian) + note names verified; no console errors.
- Gate: vitest 760/760, tsc, lint, build clean. <100ms NFR not re-measured (two extra SVG elements + one filter; no per-render logic added).

### File List

- frontend/src/index.css
- frontend/src/components/FretboardCanvas.tsx
- frontend/src/components/FretDot.tsx
- frontend/src/components/FretDot.test.tsx

## Change Log

- 2026-11-18: Implemented (DS, combined with 8.2 per owner). Status → review.
