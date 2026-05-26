import { render } from '@testing-library/react';
import FretDot, { FretDotDefs, GLOW_FILTER_ID } from './FretDot';
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
    it('renders amber fill, r=13, full opacity', () => {
      const container = renderDot({ ...BASE, state: 'root' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#f59e0b');
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
    it('renders indigo fill, r=11, 85% opacity', () => {
      const container = renderDot({ ...BASE, state: 'scale' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#6366f1');
      expect(circle).toHaveAttribute('r', '11');
      expect(circle).toHaveAttribute('opacity', '0.85');
    });

    it('does not apply glow filter', () => {
      const container = renderDot({ ...BASE, state: 'scale' });
      expect(container.querySelector('circle.fret-dot')).not.toHaveAttribute('filter');
    });
  });

  describe('mode state', () => {
    it('renders rose fill, r=11, 90% opacity', () => {
      const container = renderDot({ ...BASE, state: 'mode' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#fb7185');
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
    it('renders cyan fill, r=11, 80% opacity', () => {
      const container = renderDot({ ...BASE, state: 'freeform' });
      const circle = container.querySelector('circle.fret-dot');
      expect(circle).toHaveAttribute('fill', '#22d3ee');
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
});
