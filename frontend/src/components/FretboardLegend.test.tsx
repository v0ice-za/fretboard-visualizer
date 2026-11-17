import { render, screen, within } from '@testing-library/react';
import FretboardLegend from './FretboardLegend';
import { getLegendEntries } from '@/utils/fretboardUtils';

describe('FretboardLegend', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<FretboardLegend entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a labelled list with one item per entry, in order', () => {
    const entries = getLegendEntries({
      chordActive: true,
      states: new Set(['root', 'scale', 'key-root', 'freeform'] as const),
    });
    render(<FretboardLegend entries={entries} />);
    const list = screen.getByRole('list', { name: 'Fretboard legend' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map(i => i.textContent)).toEqual(['Chord root', 'Chord tone', 'Key root', 'Freeform mark']);
  });

  it('renders scale-view labels', () => {
    const entries = getLegendEntries({ chordActive: false, states: new Set(['root', 'scale', 'mode'] as const) });
    render(<FretboardLegend entries={entries} />);
    expect(screen.getAllByRole('listitem').map(i => i.textContent)).toEqual(['Root', 'Scale note', 'Mode note']);
  });

  it('draws the key-root swatch as a hollow ring', () => {
    render(<FretboardLegend entries={[{ state: 'key-root', label: 'Key root' }]} />);
    const swatch = screen.getByRole('listitem').querySelector('svg circle');
    expect(swatch).toHaveAttribute('fill', 'none');
    expect(swatch).toHaveAttribute('stroke', 'var(--color-dot-key-root, #f1f5f9)');
  });

  it('draws filled swatches from the same tokens and opacity as the dots', () => {
    render(<FretboardLegend entries={[{ state: 'scale', label: 'Scale note' }]} />);
    const swatch = screen.getByRole('listitem').querySelector('svg circle');
    expect(swatch).toHaveAttribute('fill', 'var(--color-dot-scale, #8b5cf6)');
    expect(swatch).toHaveAttribute('opacity', '0.85');
  });

  it('adds the dashed ring to the freeform swatch', () => {
    render(<FretboardLegend entries={[{ state: 'freeform', label: 'Freeform mark' }]} />);
    const circles = screen.getByRole('listitem').querySelectorAll('svg circle');
    expect(circles).toHaveLength(2);
    expect(circles[1]).toHaveAttribute('stroke-dasharray', '2 1.5');
  });

  it('hides swatches from assistive tech — the text label carries the meaning', () => {
    render(<FretboardLegend entries={[{ state: 'root', label: 'Root' }]} />);
    expect(screen.getByRole('listitem').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
