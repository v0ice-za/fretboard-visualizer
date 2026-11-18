/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

// Read from disk (Vitest's CSS pipeline can blank `?raw` CSS imports) and
// normalise CRLF so selector matching is checkout-agnostic.
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8').replace(/\r\n/g, '\n')

// Story 8.1 guard: jsdom doesn't compute the CSS cascade, so token coverage is
// checked structurally — every theme block must declare every Obsidian token.

/** Body of the first rule whose selector text starts at `selector`. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`selector not found: ${selector}`)
  const open = css.indexOf('{', start)
  return css.slice(open + 1, css.indexOf('\n}', open))
}

const THEME_SELECTORS = [
  ':root',
  '.dark,\n[data-theme="dark"]',
  '[data-theme="neon"]',
  '[data-theme="mono"]',
  '[data-theme="vibrant"]',
  '[data-theme="minimal"]',
]

const PER_THEME_TOKENS = [
  '--surface-interactive',
  '--glass-border-shade',
  '--glow-root',
  '--glow-root-color',
  '--glow-primary',
]

describe('Obsidian token foundation (Story 8.1)', () => {
  it.each(THEME_SELECTORS)('%s declares every per-theme token', (selector) => {
    const body = block(selector)
    for (const token of PER_THEME_TOKENS) {
      expect(body, `${selector} missing ${token}`).toMatch(new RegExp(`${token}:`))
    }
  })

  it('maps the four surface tiers to Tailwind colour utilities', () => {
    const theme = block('@theme inline')
    expect(theme).toContain('--color-surface-floor: var(--background)')
    expect(theme).toContain('--color-surface-1: var(--card)')
    expect(theme).toContain('--color-surface-2: var(--popover)')
    expect(theme).toContain('--color-surface-interactive: var(--surface-interactive)')
  })

  it('uses Plus Jakarta Sans for headings with a sans fallback', () => {
    expect(block('@theme inline')).toMatch(/--font-heading: 'Plus Jakarta Sans Variable',[^;]*sans-serif;/)
  })

  it('tightens radii to 4 / 6 / 8 / 12px', () => {
    const theme = block('@theme inline')
    expect(theme).toContain('--radius-sm: 0.25rem')
    expect(theme).toContain('--radius-md: 0.375rem')
    expect(theme).toContain('--radius-lg: 0.5rem')
    expect(theme).toContain('--radius-xl: 0.75rem')
  })

  it('dark theme uses the obsidian surface palette with an opaque border', () => {
    const dark = block('.dark,\n[data-theme="dark"]')
    expect(dark).toMatch(/--background: #0b0d13;/)
    expect(dark).toMatch(/--card: #12151f;/)
    expect(dark).toMatch(/--popover: #181c2a;/)
    // reduced-transparency substitutes var(--border) for glass borders — must be solid
    expect(dark).toMatch(/--border: #[0-9a-f]{6};/)
  })
})
