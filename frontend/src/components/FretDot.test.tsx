import { render } from '@testing-library/react';
import FretDot, { DOT_CONFIG, FretDotDefs, GLOW_FILTER_ID, ROOT_GLOW_FILTER_ID } from './FretDot';
import type { FretDotProps } from './FretDot';

function renderDot(props: FretDotProps) {
  const { container } = render(
    <svg>
      <FretDotDefs />
      <FretDot {...props} />
    </svg>
  );
  return container;
}

const BASE = { fret: 3, string: 0, note: 'A', cx: 100, cy: 50 } as const;

describe('FretDot', () => {
  it('renders SVG circle with fret-dot class on all states', () => {
    const states = ['root', 'scale', 'mode', 'mode-root', 'freeform'] as const;
    states.forEach(state => {
      const container = renderDot({ ...BASE, state });
      expect(container.querySelector('circle.fret-dot')).toBeInTheDocument();
    });
  });

  describe('mode-root state', () => {
    it('renders theme-driven fuchsia fill (CSS var w/ hex fallback), r=14, full opacity', () => {
      const container = renderDot({ ...BASE, state: 'mode-root' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', 'var(--color-dot-mode-root, #d946ef)');
      expect(circle).toHaveAttribute('r', '14');
      expect(circle).toHaveAttribute('opacity', '1');
    });

    it('applies glow SVG filter', () => {
      const container = renderDot({ ...BASE, state: 'mode-root' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('filter', `url(#${GLOW_FILTER_ID})`);
    });
  });

  describe('root state', () => {
    it('renders theme-driven gold fill (CSS var w/ hex fallback), r=14, full opacity', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', 'var(--color-dot-root, #fbbf24)');
      expect(circle).toHaveAttribute('r', '14');
      expect(circle).toHaveAttribute('opacity', '1');
    });

    it('applies the gold root-glow SVG filter (Story 8.3)', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('filter', `url(#${ROOT_GLOW_FILTER_ID})`);
    });

    it('does not render dashed ring', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(1);
    });
  });

  describe('scale state', () => {
    it('renders theme-driven violet fill (CSS var w/ hex fallback), r=12, 85% opacity', () => {
      const container = renderDot({ ...BASE, state: 'scale' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', 'var(--color-dot-scale, #8b5cf6)');
      expect(circle).toHaveAttribute('r', '12');
      expect(circle).toHaveAttribute('opacity', '0.85');
    });

    it('does not apply glow filter', () => {
      const container = renderDot({ ...BASE, state: 'scale' });
      expect(container.querySelector('circle.fret-dot')).not.toHaveAttribute('filter');
    });
  });

  describe('mode state', () => {
    it('renders theme-driven cyan fill (CSS var w/ hex fallback), r=12, 90% opacity', () => {
      const container = renderDot({ ...BASE, state: 'mode' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', 'var(--color-dot-mode, #22d3ee)');
      expect(circle).toHaveAttribute('r', '12');
      expect(circle).toHaveAttribute('opacity', '0.9');
    });

    it('applies glow SVG filter', () => {
      const container = renderDot({ ...BASE, state: 'mode' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('filter', `url(#${GLOW_FILTER_ID})`);
    });
  });

  describe('freeform state', () => {
    it('renders theme-driven pink fill (CSS var w/ hex fallback), r=12, 80% opacity', () => {
      const container = renderDot({ ...BASE, state: 'freeform' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', 'var(--color-dot-freeform, #f0abfc)');
      expect(circle).toHaveAttribute('r', '12');
      expect(circle).toHaveAttribute('opacity', '0.8');
    });

    it('renders dashed ring as second circle, stroke matches the theme-driven fill var', () => {
      const container = renderDot({ ...BASE, state: 'freeform' });
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(2);
      // second circle is the ring
      expect(circles[1]).toHaveAttribute('stroke-dasharray', '4 3');
      expect(circles[1]).toHaveAttribute('fill', 'none');
      expect(circles[1]).toHaveAttribute('stroke', 'var(--color-dot-freeform, #f0abfc)');
    });
  });

  describe('key-root state', () => {
    it('renders a single hollow ring: no fill, theme-driven stroke, no glow, click-through', () => {
      const container = renderDot({ ...BASE, state: 'key-root' });
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(1);
      const ring = circles[0];
      expect(ring).toHaveClass('fret-dot');
      expect(ring).toHaveAttribute('fill', 'none');
      expect(ring).toHaveAttribute('stroke', 'var(--color-dot-key-root, #f1f5f9)');
      expect(ring).toHaveAttribute('pointer-events', 'none');
      expect(ring).not.toHaveAttribute('filter');
    });

    it('is larger than the root dot so it encircles, never covers, a dot underneath', () => {
      expect(DOT_CONFIG['key-root'].radius).toBeGreaterThan(DOT_CONFIG.root.radius);
      const container = renderDot({ ...BASE, state: 'key-root', sizeScale: 0.5 });
      expect(container.querySelector('circle')).toHaveAttribute('r', String(DOT_CONFIG['key-root'].radius * 0.5));
    });

    it('renders the note name only when asked', () => {
      expect(renderDot({ ...BASE, state: 'key-root' }).querySelector('text')).not.toBeInTheDocument();
      const text = renderDot({ ...BASE, state: 'key-root', showNoteName: true }).querySelector('text');
      expect(text).toHaveAttribute('fill', 'var(--color-text-primary, #e2e8f0)');
    });
  });

  it('attaches data-state attribute to group for querying', () => {
    const container = renderDot({ ...BASE, state: 'root' });
    expect(container.querySelector('[data-state="root"]')).toBeInTheDocument();
  });

  describe('showNoteName prop', () => {
    it('renders <text> note label when showNoteName=true', () => {
      const container = renderDot({ ...BASE, state: 'root', showNoteName: true });
      expect(container.querySelector('text')).toBeInTheDocument();
    });

    it('does NOT render <text> when showNoteName=false', () => {
      const container = renderDot({ ...BASE, state: 'root', showNoteName: false });
      expect(container.querySelector('text')).not.toBeInTheDocument();
    });

    it('does NOT render <text> when showNoteName is omitted', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      expect(container.querySelector('text')).not.toBeInTheDocument();
    });
  });

  describe('freeform ring pointer-events', () => {
    it('freeform ring circle has pointer-events="none"', () => {
      const container = renderDot({ ...BASE, state: 'freeform' });
      const circles = container.querySelectorAll('circle');
      const ring = circles[1]; // second circle is the dashed ring
      expect(ring).toHaveAttribute('pointer-events', 'none');
    });
  });

  // AC2 (Story 5.5) / AC7 (Story 4.5): the bold ~8px note label inside each dot is
  // "normal" text under WCAG 2.1, so it must clear 4.5:1 against its dot fill, in
  // EVERY theme. This checks the TRUE RENDERED colour, not the nominal fill: dots
  // with opacity<1 alpha-composite with --color-fretboard, and that composite
  // differs enough between themes that a single static text colour can fail AA in
  // one of them (caught in code review 2026-09-14 for `scale` — see FretDot.tsx).
  //
  // Since Story 4.5, `fill` AND `textColor` are always `var(--...)` strings (not
  // raw hex) — jsdom doesn't resolve CSS custom properties on SVG attributes, so
  // this suite mirrors the real values from index.css per theme/state below (same
  // established pattern as 5.5's SCALE_TEXT mirror, just generalised to every
  // state/theme). Keep FILL/TEXT/BOARD in sync with index.css by hand; a mismatch
  // here would silently under- or over-report real contrast.
  describe('note-name contrast (WCAG 2.1 AA, composited with the board, all 6 themes)', () => {
    const srgbToLinear = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => {
      const n = hex.replace('#', '');
      const r = parseInt(n.slice(0, 2), 16);
      const g = parseInt(n.slice(2, 4), 16);
      const b = parseInt(n.slice(4, 6), 16);
      return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    // Alpha-composite a dot's fill (at its fixed opacity) over the board colour —
    // this is the colour the note-name text actually renders against.
    const composite = (fillHex: string, opacity: number, boardHex: string) => {
      const parse = (hex: string) => {
        const n = hex.replace('#', '');
        return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
      };
      const [fr, fg, fb] = parse(fillHex);
      const [br, bg, bb] = parse(boardHex);
      const mix = (f: number, b: number) => Math.round(opacity * f + (1 - opacity) * b);
      return [mix(fr, br), mix(fg, bg), mix(fb, bb)]
        .map(v => v.toString(16).padStart(2, '0'))
        .join('');
    };

    // A key-root ring has no fill to composite text against — it's covered by the
    // non-text ring suite below instead.
    type DotState = Exclude<keyof typeof DOT_CONFIG, 'key-root'>;
    type ThemeName = 'dark' | 'light' | 'neon' | 'mono' | 'vibrant' | 'minimal';

    // --color-fretboard per theme, mirrored from index.css.
    const BOARD: Record<ThemeName, string> = {
      dark: '#0b0b16',
      light: '#f1f1f4',
      neon: '#0d0d0d',
      mono: '#1e1e1e',
      vibrant: '#102030',
      minimal: '#efefe8',
    };

    // --color-dot-* per theme/state, mirrored from index.css.
    const FILL: Record<ThemeName, Record<DotState, string>> = {
      dark: { root: '#fbbf24', scale: '#8b5cf6', mode: '#22d3ee', 'mode-root': '#d946ef', freeform: '#f0abfc' },
      light: { root: '#fbbf24', scale: '#8b5cf6', mode: '#22d3ee', 'mode-root': '#d946ef', freeform: '#f0abfc' },
      neon: { root: '#4ade80', scale: '#22d3ee', mode: '#d946ef', 'mode-root': '#38bdf8', freeform: '#facc15' },
      mono: { root: '#f8fafc', scale: '#7f8a99', mode: '#cbd5e1', 'mode-root': '#a8a29e', freeform: '#78716c' },
      vibrant: { root: '#fbbf24', scale: '#818cf8', mode: '#f87171', 'mode-root': '#c084fc', freeform: '#2dd4bf' },
      minimal: { root: '#92400e', scale: '#3730a3', mode: '#166534', 'mode-root': '#86198f', freeform: '#1e3a8a' },
    };

    // --dot-text-* per theme/state, mirrored from index.css.
    const TEXT: Record<ThemeName, Record<DotState, string>> = {
      dark: { root: '#1a0e00', scale: '#f5f3ff', mode: '#04191c', 'mode-root': '#1a0030', freeform: '#2a0730' },
      light: { root: '#1a0e00', scale: '#0a0518', mode: '#04191c', 'mode-root': '#1a0030', freeform: '#2a0730' },
      neon: { root: '#000000', scale: '#000000', mode: '#000000', 'mode-root': '#000000', freeform: '#000000' },
      mono: { root: '#000000', scale: '#000000', mode: '#000000', 'mode-root': '#000000', freeform: '#ffffff' },
      vibrant: { root: '#000000', scale: '#000000', mode: '#000000', 'mode-root': '#000000', freeform: '#000000' },
      minimal: { root: '#ffffff', scale: '#ffffff', mode: '#ffffff', 'mode-root': '#ffffff', freeform: '#ffffff' },
    };

    const states = (Object.keys(DOT_CONFIG) as (keyof typeof DOT_CONFIG)[]).filter(
      (s): s is DotState => s !== 'key-root'
    );
    (Object.keys(BOARD) as ThemeName[]).forEach(theme => {
      it.each(states)(`%s dot text clears 4.5:1 against its composited fill — ${theme} theme`, state => {
        const container = renderDot({ ...BASE, state, showNoteName: true });
        expect(container.querySelector('text')).toBeInTheDocument();

        const { opacity } = DOT_CONFIG[state];
        const fill = FILL[theme][state];
        const textFill = TEXT[theme][state];
        const compositedFill = composite(fill, opacity, BOARD[theme]);
        expect(contrast(compositedFill, textFill)).toBeGreaterThanOrEqual(4.5);
      });
    });

    // --color-dot-key-root per theme, mirrored from index.css. The ring is a
    // graphical object, so WCAG 2.1 non-text contrast (3:1) against the board applies.
    const RING: Record<ThemeName, string> = {
      dark: '#f1f5f9',
      light: '#0f172a',
      neon: '#ffffff',
      mono: '#fbbf24',
      vibrant: '#f1f5f9',
      minimal: '#0f172a',
    };

    // --color-text-primary per theme, mirrored from index.css (light/dark are
    // oklch() there — these are their sRGB conversions). Used for a lone ring's
    // note name, which sits directly on the board.
    const BOARD_TEXT: Record<ThemeName, string> = {
      dark: '#d8dfe4',
      light: '#14161b',
      neon: '#e4e4e7',
      mono: '#f4f4f5',
      vibrant: '#e2e8f0',
      minimal: '#1c1917',
    };

    it.each(Object.keys(BOARD) as ThemeName[])('key-root ring clears 3:1 against the board — %s theme', theme => {
      expect(contrast(RING[theme], BOARD[theme])).toBeGreaterThanOrEqual(3);
    });

    it.each(Object.keys(BOARD) as ThemeName[])('key-root ring differs from the root dot colour — %s theme', theme => {
      expect(RING[theme]).not.toBe(FILL[theme].root);
    });

    it.each(Object.keys(BOARD) as ThemeName[])('lone key-root note name clears 4.5:1 against the board — %s theme', theme => {
      expect(contrast(BOARD_TEXT[theme], BOARD[theme])).toBeGreaterThanOrEqual(4.5);
    });
  });
});
