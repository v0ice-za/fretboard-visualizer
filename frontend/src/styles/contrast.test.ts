/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

// Story 8.5: computed (not eyeballed) WCAG 2.1 AA audit of the Obsidian chrome
// across all 6 themes, plus colour-vision-deficiency separation of the
// root/scale/mode dot trio. Values are parsed straight from index.css so the
// audit can't drift from what ships. Dot-text contrast is covered separately
// by FretDot.test.tsx (composited against the board).

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8').replace(/\r\n/g, '\n')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`selector not found: ${selector}`)
  const open = css.indexOf('{', start)
  const body = css.slice(open + 1, css.indexOf('\n}', open)).replace(/\/\*[\s\S]*?\*\//g, '')
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const ROOT = block(':root')
const DARK = block('.dark,\n[data-theme="dark"]')
// Cascade as it applies on <html>: dark-family themes also carry the .dark class.
const THEMES: Record<string, Record<string, string>> = {
  light: ROOT,
  dark: { ...ROOT, ...DARK },
  neon: { ...ROOT, ...DARK, ...block('[data-theme="neon"]') },
  mono: { ...ROOT, ...DARK, ...block('[data-theme="mono"]') },
  vibrant: { ...ROOT, ...DARK, ...block('[data-theme="vibrant"]') },
  minimal: { ...ROOT, ...block('[data-theme="minimal"]') },
}

// ── colour maths ────────────────────────────────────────────────────────────
type RGBA = [number, number, number, number] // sRGB 0..1 + alpha

function parse(value: string): RGBA {
  const v = value.trim().toLowerCase()
  if (v.startsWith('#')) {
    const h = v.length === 4 ? [...v.slice(1)].map((c) => c + c).join('') : v.slice(1)
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).concat(1) as RGBA
  }
  const fn = v.match(/^(rgb|oklch)\(([^)]+)\)$/)
  if (!fn) throw new Error(`unparseable colour: ${value}`)
  const [main, alphaPart] = fn[2].split('/')
  const parts = main.replace(/,/g, ' ').trim().split(/\s+/).map(parseFloat)
  const alpha = alphaPart ? parseFloat(alphaPart) : 1
  if (fn[1] === 'rgb') return [parts[0] / 255, parts[1] / 255, parts[2] / 255, alpha]
  return [...oklchToSrgb(parts[0], parts[1], parts[2]), alpha] as RGBA
}

function oklchToSrgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return lin.map((c) => {
    const x = Math.min(1, Math.max(0, c))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }) as [number, number, number]
}

/** Browser-style alpha compositing (in encoded sRGB). */
function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3]
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1) as RGBA
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (c: RGBA) =>
  0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2])

function contrast(fg: RGBA, bg: RGBA): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Resolve a theme token to an opaque colour (translucent tokens sit on --background). */
function tok(theme: Record<string, string>, name: string): RGBA {
  const raw = theme[name]
  if (!raw) throw new Error(`missing --${name}`)
  return over(parse(raw), parse(theme.background))
}

// ── WCAG text + state-indicator audit ───────────────────────────────────────
const SURFACES = ['background', 'card', 'popover', 'glass-panel-bg', 'glass-bar-bg', 'glass-overlay-bg']
const INDIGO: RGBA = [99 / 255, 102 / 255, 241 / 255, 1] // active underglow / row edge

describe.each(Object.keys(THEMES))('%s theme chrome (WCAG 2.1 AA)', (name) => {
  const t = THEMES[name]

  it.each(SURFACES)('foreground + muted text on --%s ≥ 4.5:1', (surface) => {
    const bg = tok(t, surface)
    expect(contrast(tok(t, 'foreground'), bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tok(t, 'muted-foreground'), bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('text in recessed selector slots (--input) ≥ 4.5:1', () => {
    const slot = tok(t, 'input')
    expect(contrast(tok(t, 'foreground'), slot)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tok(t, 'muted-foreground'), slot)).toBeGreaterThanOrEqual(4.5)
  })

  it('active rows/plates (text on surface-2) ≥ 4.5:1', () => {
    // Active LibraryItem / IconButton / mode chip all render foreground text + glyphs
    // on surface-2. (--primary violet was moved off surface-2: it measured 2.5–3.3:1.)
    expect(contrast(tok(t, 'foreground'), tok(t, 'popover'))).toBeGreaterThanOrEqual(4.5)
  })

  it('indigo active indicator vs surface-2 ≥ 3:1 (non-text)', () => {
    expect(contrast(INDIGO, tok(t, 'popover'))).toBeGreaterThanOrEqual(3)
  })
})

// ── colour-vision-deficiency separation (root / scale / mode) ───────────────
// Machado et al. 2009, severity 1.0, applied in linear RGB.
const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
}

function simulate(c: RGBA, m: number[][]): RGBA {
  const lin = [0, 1, 2].map((i) => toLinear(c[i]))
  const out = m.map((row) => Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])))
  return [...out.map((x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)), 1] as RGBA
}

/** CIE76 ΔE in CIELAB (D65). */
function deltaE(p: RGBA, q: RGBA): number {
  const lab = (c: RGBA) => {
    const [r, g, b] = [0, 1, 2].map((i) => toLinear(c[i]))
    const xyz = [
      (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
      0.2126 * r + 0.7152 * g + 0.0722 * b,
      (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883,
    ].map((v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116))
    return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])]
  }
  const [a, b] = [lab(p), lab(q)]
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

// Dot fill opacities from FretDot.tsx DOT_CONFIG (root 1, scale 0.85, mode 0.9).
const TRIO = [
  ['color-dot-root', 1],
  ['color-dot-scale', 0.85],
  ['color-dot-mode', 0.9],
] as const
/** ΔE floor for "distinguishable at a glance" between co-occurring dot states. */
const CVD_FLOOR = 20

describe.each(Object.keys(THEMES))('%s theme dot trio under CVD simulation', (name) => {
  const t = THEMES[name]
  const board = parse(t['color-fretboard'])
  const fills = TRIO.map(([token, alpha]) => {
    const [r, g, b] = parse(t[token])
    return over([r, g, b, alpha], board)
  })

  it.each(Object.keys(CVD) as (keyof typeof CVD)[])('%s: every pair separated by ΔE ≥ 20', (kind) => {
    const sim = fills.map((f) => simulate(f, CVD[kind]))
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
      expect(deltaE(sim[i], sim[j]), `${TRIO[i][0]} vs ${TRIO[j][0]}`).toBeGreaterThanOrEqual(CVD_FLOOR)
    }
  })
})

// ── motion / transparency / font guards ─────────────────────────────────────
describe('accessibility fallbacks', () => {
  it('reduced-motion neutralises every transition and animation app-wide', () => {
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(rm).toMatch(/transition-duration: 0\.01ms !important/)
    expect(rm).toMatch(/animation-duration: 0\.01ms !important/)
  })

  it('reduced-transparency collapses every glass class and its directional edges', () => {
    for (const cls of ['.glass-surface', '.glass-overlay', '.glass-bar']) {
      const re = new RegExp(`prefers-reduced-transparency: reduce\\)\\s*\\{\\s*\\${cls}\\s*\\{([^}]*)\\}`)
      const m = css.match(re)
      expect(m, `${cls} fallback`).not.toBeNull()
      expect(m![1]).toMatch(/backdrop-filter: none|background: var\(--card\)/)
    }
    expect(css).toMatch(/--glass-border-shade: var\(--border\);/)
  })

  it('Plus Jakarta Sans falls back to Inter then the system sans stack', () => {
    expect(css).toMatch(/--font-heading: 'Plus Jakarta Sans Variable', 'Inter Variable', ui-sans-serif, system-ui, sans-serif;/)
  })

  it('every backdrop-filter ships with its -webkit- prefix (Safari)', () => {
    const plain = (css.match(/^\s*backdrop-filter:/gm) ?? []).length
    const webkit = (css.match(/^\s*-webkit-backdrop-filter:/gm) ?? []).length
    expect(webkit).toBe(plain)
  })
})
