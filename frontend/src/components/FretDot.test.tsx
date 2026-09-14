import { render } from '@testing-library/react';
import FretDot, { DOT_CONFIG, FretDotDefs, GLOW_FILTER_ID } from './FretDot';
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
    const states = ['root', 'scale', 'mode', 'freeform'] as const;
    states.forEach(state => {
      const container = renderDot({ ...BASE, state });
      expect(container.querySelector('circle.fret-dot')).toBeInTheDocument();
    });
  });

  describe('root state', () => {
    it('renders gold fill, r=13, full opacity', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#fbbf24');
      expect(circle).toHaveAttribute('r', '13');
      expect(circle).toHaveAttribute('opacity', '1');
    });

    it('does not apply glow filter', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).not.toHaveAttribute('filter');
    });

    it('does not render dashed ring', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(1);
    });
  });

  describe('scale state', () => {
    it('renders violet fill, r=11, 85% opacity', () => {
      const container = renderDot({ ...BASE, state: 'scale' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#8b5cf6');
      expect(circle).toHaveAttribute('r', '11');
      expect(circle).toHaveAttribute('opacity', '0.85');
    });

    it('does not apply glow filter', () => {
      const container = renderDot({ ...BASE, state: 'scale' });
      expect(container.querySelector('circle.fret-dot')).not.toHaveAttribute('filter');
    });
  });

  describe('mode state', () => {
    it('renders cyan fill, r=11, 90% opacity', () => {
      const container = renderDot({ ...BASE, state: 'mode' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#22d3ee');
      expect(circle).toHaveAttribute('r', '11');
      expect(circle).toHaveAttribute('opacity', '0.9');
    });

    it('applies glow SVG filter', () => {
      const container = renderDot({ ...BASE, state: 'mode' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('filter', `url(#${GLOW_FILTER_ID})`);
    });
  });

  describe('freeform state', () => {
    it('renders pink fill, r=11, 80% opacity', () => {
      const container = renderDot({ ...BASE, state: 'freeform' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#f0abfc');
      expect(circle).toHaveAttribute('r', '11');
      expect(circle).toHaveAttribute('opacity', '0.8');
    });

    it('renders dashed ring as second circle', () => {
      const container = renderDot({ ...BASE, state: 'freeform' });
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(2);
      // second circle is the ring
      expect(circles[1]).toHaveAttribute('stroke-dasharray', '4 3');
      expect(circles[1]).toHaveAttribute('fill', 'none');
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

  // AC2 (Story 5.5): the bold ~8px note label inside each dot is "normal" text
  // under WCAG 2.1, so it must clear 4.5:1 against its dot fill. This checks the
  // TRUE RENDERED colour, not the nominal fill: dots with opacity<1 (scale, mode,
  // freeform) alpha-composite with --color-fretboard, and that composite differs
  // enough between the near-black dark board and near-white light board that
  // `scale`'s original static text colour failed AA in one theme (caught in code
  // review 2026-09-14 — see FretDot.tsx for the fix). Run per-theme so a future
  // palette or board-color tweak can't silently regress either theme.
  describe('note-name contrast (WCAG 2.1 AA, composited with the board, both themes)', () => {
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

    // Approximate sRGB of --color-fretboard per theme (oklch(0.08 0.015 270) dark /
    // oklch(0.95 0.005 270) light) — precise enough for this regression guardrail;
    // exact rendered contrast was additionally verified live in Chrome.
    const BOARD = { dark: '0b0b16', light: 'f1f1f4' };
    // `scale`'s textColor is a CSS var (theme-aware, see index.css); jsdom won't
    // resolve var() on an SVG attribute, so mirror both theme values here.
    const SCALE_TEXT = { dark: '#f5f3ff', light: '#0a0518' };

    const states = Object.keys(DOT_CONFIG) as (keyof typeof DOT_CONFIG)[];
    (['dark', 'light'] as const).forEach(theme => {
      it.each(states)(`%s dot text clears 4.5:1 against its composited fill — ${theme} theme`, state => {
        const container = renderDot({ ...BASE, state, showNoteName: true });
        const { fill, opacity, textColor } = DOT_CONFIG[state];
        const renderedTextFill = container.querySelector('text')!.getAttribute('fill')!;
        const textFill = renderedTextFill.startsWith('var(') ? SCALE_TEXT[theme] : textColor;
        const compositedFill = `#${composite(fill, opacity, BOARD[theme])}`;
        expect(contrast(compositedFill, textFill)).toBeGreaterThanOrEqual(4.5);
      });
    });
  });
});
