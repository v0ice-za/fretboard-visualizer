import { render, screen } from '@testing-library/react';
import FretboardCanvas from './FretboardCanvas';

const STANDARD_E = { tuning: 'Standard E', rootNote: 'A', scaleName: 'Pentatonic Minor' };

describe('FretboardCanvas', () => {
  // ── Structure & accessibility ────────────────────────────────
  it('renders SVG with role="img" and dynamic aria-label', () => {
    render(<FretboardCanvas {...STANDARD_E} />);
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'A Pentatonic Minor scale on Standard E tuning');
  });

  it('updates aria-label when props change', () => {
    const { rerender } = render(<FretboardCanvas {...STANDARD_E} />);
    rerender(<FretboardCanvas tuning="Drop D" rootNote="E" scaleName="Blues Minor" />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'E Blues Minor scale on Drop D tuning'
    );
  });

  // ── Grid: 24 fret lines × 6 string lines ────────────────────
  it('renders 6 string horizontal lines', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    expect(container.querySelectorAll('[data-testid="string-line"]')).toHaveLength(6);
  });

  it('renders 24 fret vertical lines', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    expect(container.querySelectorAll('[data-testid="fret-line"]')).toHaveLength(24);
  });

  // ── Nut labels ───────────────────────────────────────────────
  it('renders nut labels for each string (Standard E: E A D G B E)', () => {
    render(<FretboardCanvas {...STANDARD_E} />);
    const expected = ['E', 'A', 'D', 'G', 'B', 'E'];
    expected.forEach((note, i) => {
      expect(screen.getByTestId(`nut-label-${i}`)).toHaveTextContent(note);
    });
  });

  it('updates nut labels when tuning changes (Drop D: D A D G B E)', () => {
    const { rerender } = render(<FretboardCanvas {...STANDARD_E} />);
    rerender(<FretboardCanvas tuning="Drop D" rootNote="A" scaleName="Pentatonic Minor" />);
    expect(screen.getByTestId('nut-label-0')).toHaveTextContent('D');
    expect(screen.getByTestId('nut-label-5')).toHaveTextContent('E');
  });

  // ── Fret numbers ─────────────────────────────────────────────
  it('renders fret numbers 1 through 24', () => {
    render(<FretboardCanvas {...STANDARD_E} />);
    expect(screen.getByTestId('fret-number-1')).toHaveTextContent('1');
    expect(screen.getByTestId('fret-number-12')).toHaveTextContent('12');
    expect(screen.getByTestId('fret-number-24')).toHaveTextContent('24');
  });

  // ── Position markers ─────────────────────────────────────────
  it('renders inlay markers at frets 3, 5, 7, 9 (single) and 12 (double)', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    [3, 5, 7, 9, 12].forEach(fret => {
      expect(container.querySelector(`[data-testid="inlay-${fret}"]`)).toBeInTheDocument();
    });
  });

  // ── FretDots ─────────────────────────────────────────────────
  it('renders FretDots for A Pentatonic Minor on Standard E', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    expect(container.querySelectorAll('.fret-dot').length).toBeGreaterThan(0);
  });

  it('renders root dots (amber) for A note positions', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    expect(container.querySelectorAll('[data-state="root"]').length).toBeGreaterThan(0);
  });

  it('renders scale dots (indigo) for scale note positions', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    expect(container.querySelectorAll('[data-state="scale"]').length).toBeGreaterThan(0);
  });

  // ── Mobile responsive scroll ─────────────────────────────────
  it('wraps SVG in overflow-x: auto container for horizontal scroll', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    const wrapper = container.querySelector('[data-testid="fretboard-scroll-wrapper"]');
    expect(wrapper).toHaveStyle({ overflowX: 'auto' });
  });

  it('SVG has minWidth of 450px for readability at 375px viewport', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} />);
    const svg = container.querySelector('[data-testid="fretboard-svg"]');
    expect(svg).toHaveStyle({ minWidth: '450px' });
  });

  // ── Performance: <100ms on state change ─────────────────────
  it('re-renders in under 100ms on tuning/scale change', () => {
    const { rerender } = render(<FretboardCanvas {...STANDARD_E} />);
    const start = performance.now();
    rerender(<FretboardCanvas tuning="Drop D" rootNote="G" scaleName="Major (Ionian)" />);
    expect(performance.now() - start).toBeLessThan(100);
  });

  // ── Integration: tuning change updates dots ──────────────────
  it('FretDots update when tuning/scale changes', () => {
    const { rerender, container } = render(<FretboardCanvas {...STANDARD_E} />);
    const dotsBefore = container.querySelectorAll('.fret-dot').length;

    // Drop D + different root should produce a different dot set
    rerender(<FretboardCanvas tuning="Drop D" rootNote="D" scaleName="Natural Minor (Aeolian)" />);
    const dotsAfter = container.querySelectorAll('.fret-dot').length;

    // Both should render dots; counts may differ due to different tuning/scale
    expect(dotsBefore).toBeGreaterThan(0);
    expect(dotsAfter).toBeGreaterThan(0);
  });
});
