import { render, screen, fireEvent } from '@testing-library/react';
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
  it('renders nut labels for each string (Standard E top-to-bottom: E B G D A E)', () => {
    render(<FretboardCanvas {...STANDARD_E} />);
    // Fretboard is flipped: high e (index 5) at top, low E (index 0) at bottom
    const expected = ['E', 'B', 'G', 'D', 'A', 'E'];
    expected.forEach((note, i) => {
      expect(screen.getByTestId(`nut-label-${i}`)).toHaveTextContent(note);
    });
  });

  it('updates nut labels when tuning changes (Drop D top-to-bottom: E B G D A D)', () => {
    const { rerender } = render(<FretboardCanvas {...STANDARD_E} />);
    rerender(<FretboardCanvas tuning="Drop D" rootNote="A" scaleName="Pentatonic Minor" />);
    // Drop D = ['D','A','D','G','B','E']; flipped: label-0=E (high e), label-5=D (low D)
    expect(screen.getByTestId('nut-label-0')).toHaveTextContent('E');
    expect(screen.getByTestId('nut-label-5')).toHaveTextContent('D');
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

  // ── Mode overlay ─────────────────────────────────────────────
  it('aria-label includes mode name when modeIndex is set', () => {
    render(<FretboardCanvas {...STANDARD_E} modeIndex={1} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'A Pentatonic Minor scale on Standard E tuning, Dorian mode overlay active'
    );
  });

  it('renders mode dots (data-state="mode") when a mode is active', () => {
    // Dorian on A Pentatonic Minor adds characteristic notes (B, F#)
    const { container } = render(
      <FretboardCanvas tuning="Standard E" rootNote="A" scaleName="Pentatonic Minor" modeIndex={1} />
    );
    expect(container.querySelectorAll('[data-state="mode"]').length).toBeGreaterThan(0);
  });

  it('no mode dots when modeIndex is null', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} modeIndex={null} />);
    expect(container.querySelectorAll('[data-state="mode"]')).toHaveLength(0);
  });

  // ── Capo ─────────────────────────────────────────────────────
  it('renders capo-dim rect when capoPosition > 0', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} capoPosition={3} />);
    expect(container.querySelector('[data-testid="capo-dim"]')).toBeInTheDocument();
  });

  it('renders capo-indicator line when capoPosition > 0', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} capoPosition={3} />);
    expect(container.querySelector('[data-testid="capo-indicator"]')).toBeInTheDocument();
  });

  it('does not render capo-dim or capo-indicator when capoPosition is 0', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} capoPosition={0} />);
    expect(container.querySelector('[data-testid="capo-dim"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="capo-indicator"]')).not.toBeInTheDocument();
  });

  it('no dots rendered at frets below capo when capoPosition=3', () => {
    const { container } = render(<FretboardCanvas {...STANDARD_E} capoPosition={3} />);
    // FretDot renders <g data-fret={fret} ...> — query those
    const allDotGroups = container.querySelectorAll('[data-fret]');
    allDotGroups.forEach(g => {
      const fret = Number(g.getAttribute('data-fret'));
      expect(fret).toBeGreaterThanOrEqual(3);
    });
  });

  it('nut label at index 0 (high e) shifts away from "E" when capo=2 on Standard E', () => {
    render(<FretboardCanvas {...STANDARD_E} capoPosition={2} />);
    // Standard E high-e string = E; capo 2 → F#
    expect(screen.getByTestId('nut-label-0')).not.toHaveTextContent('E');
    expect(screen.getByTestId('nut-label-0')).toHaveTextContent('F#');
  });

  it('aria-label includes capo fret when capoPosition > 0', () => {
    render(<FretboardCanvas {...STANDARD_E} capoPosition={3} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'A Pentatonic Minor scale on Standard E tuning, capo at fret 3'
    );
  });

  // ── Freeform marking ─────────────────────────────────────────
  it('renders a freeform dot when freeformMarks has a valid entry', () => {
    const { container } = render(
      <FretboardCanvas {...STANDARD_E} freeformMarks={[{ fret: 5, string: 2 }]} />
    );
    expect(container.querySelector('[data-state="freeform"]')).toBeInTheDocument();
  });

  it('does NOT render a freeform dot when the mark is below capoPosition', () => {
    const { container } = render(
      <FretboardCanvas {...STANDARD_E} freeformMarks={[{ fret: 2, string: 0 }]} capoPosition={3} />
    );
    expect(container.querySelector('[data-state="freeform"]')).not.toBeInTheDocument();
  });

  it('calls onFretClick with correct fret/string when hit-target is clicked in freeform mode', () => {
    const onFretClick = vi.fn();
    const { container } = render(
      <FretboardCanvas
        {...STANDARD_E}
        freeformModeActive={true}
        onFretClick={onFretClick}
      />
    );
    const hitTarget = container.querySelector('[data-testid="fretboard-svg"] rect[role="button"]');
    expect(hitTarget).toBeInTheDocument();
    fireEvent.click(hitTarget!);
    expect(onFretClick).toHaveBeenCalledTimes(1);
    expect(onFretClick).toHaveBeenCalledWith(expect.objectContaining({ fret: expect.any(Number), string: expect.any(Number) }));
  });

  it('does NOT call onFretClick when freeformModeActive=false', () => {
    const onFretClick = vi.fn();
    const { container } = render(
      <FretboardCanvas
        {...STANDARD_E}
        freeformModeActive={false}
        onFretClick={onFretClick}
      />
    );
    // No role="button" hit-targets when freeform mode is off
    const buttons = container.querySelectorAll('[data-testid="fretboard-svg"] rect[role="button"]');
    expect(buttons).toHaveLength(0);
    expect(onFretClick).not.toHaveBeenCalled();
  });

  it('does NOT call onFretClick for a hit-target at a fret below capoPosition', () => {
    const onFretClick = vi.fn();
    const { container } = render(
      <FretboardCanvas
        {...STANDARD_E}
        freeformModeActive={true}
        capoPosition={5}
        onFretClick={onFretClick}
      />
    );
    // fret 0 (open string) is always active; frets 1..4 (below capo=5) should not have role="button"
    const buttons = container.querySelectorAll('rect[role="button"]');
    buttons.forEach(btn => {
      const ariaLabel = btn.getAttribute('aria-label') ?? '';
      const match = ariaLabel.match(/fret (\d+)/);
      if (match) {
        const fret = Number(match[1]);
        expect(fret === 0 || fret >= 5).toBe(true);
      }
    });
  });

  it('hit-targets have tabIndex=0 when freeformModeActive=true', () => {
    const { container } = render(
      <FretboardCanvas {...STANDARD_E} freeformModeActive={true} />
    );
    const tabbable = container.querySelectorAll('rect[tabindex="0"]');
    expect(tabbable.length).toBeGreaterThan(0);
  });

  it('hit-targets have tabIndex=-1 when freeformModeActive=false', () => {
    const { container } = render(
      <FretboardCanvas {...STANDARD_E} freeformModeActive={false} />
    );
    const tabbable = container.querySelectorAll('rect[tabindex="0"]');
    expect(tabbable).toHaveLength(0);
  });

  // ── Note names ───────────────────────────────────────────────
  it('shows note text inside dots when noteNamesVisible=true', () => {
    const { container } = render(
      <FretboardCanvas {...STANDARD_E} noteNamesVisible={true} />
    );
    const texts = container.querySelectorAll('[data-state] text');
    expect(texts.length).toBeGreaterThan(0);
  });

  it('hides note text inside dots when noteNamesVisible=false', () => {
    const { container } = render(
      <FretboardCanvas {...STANDARD_E} noteNamesVisible={false} />
    );
    const texts = container.querySelectorAll('[data-state] text');
    expect(texts).toHaveLength(0);
  });

  // ── Key-root markers + legend (Story 7.1) ───────────────────
  describe('key-root markers', () => {
    // Key of C, showing the ii chord (D minor).
    const C_KEY_DM = { tuning: 'Standard E', rootNote: 'C', scaleName: 'Major (Ionian)', chordName: 'Minor', chordRoot: 'D' };

    it('rings every key-root position while a chord rooted elsewhere is shown', () => {
      const { container } = render(<FretboardCanvas {...C_KEY_DM} />);
      expect(container.querySelectorAll('[data-state="key-root"]')).toHaveLength(12);
    });

    it('renders no rings in the scale view', () => {
      const { container } = render(<FretboardCanvas tuning="Standard E" rootNote="C" scaleName="Major (Ionian)" />);
      expect(container.querySelectorAll('[data-state="key-root"]')).toHaveLength(0);
    });

    it('renders no rings when the chord is rooted on the key (chordRoot null or equal)', () => {
      const { container, rerender } = render(<FretboardCanvas {...C_KEY_DM} chordRoot={null} />);
      expect(container.querySelectorAll('[data-state="key-root"]')).toHaveLength(0);
      rerender(<FretboardCanvas {...C_KEY_DM} chordRoot="C" />);
      expect(container.querySelectorAll('[data-state="key-root"]')).toHaveLength(0);
    });

    it('renders no rings for an unknown chord name (scale view fallback)', () => {
      const { container } = render(<FretboardCanvas {...C_KEY_DM} chordName="Not A Chord" />);
      expect(container.querySelectorAll('[data-state="key-root"]')).toHaveLength(0);
    });

    it('draws a ring around a chord tone that is also the key root, after the chord dot', () => {
      // A minor in the key of C: C is the minor third, so the chord dot and the ring share positions.
      const { container } = render(<FretboardCanvas {...C_KEY_DM} chordRoot="A" />);
      const chordDot = container.querySelector('[data-state="scale"][data-fret="8"][data-string="0"]');
      const ring = container.querySelector('[data-state="key-root"][data-fret="8"][data-string="0"]');
      expect(chordDot).toBeInTheDocument();
      expect(ring).toBeInTheDocument();
      expect(chordDot!.compareDocumentPosition(ring!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('shows the note name on a lone ring but not on a ring around a labelled chord tone', () => {
      const { container, rerender } = render(<FretboardCanvas {...C_KEY_DM} noteNamesVisible />);
      // D minor has no C, so every ring is alone and labelled.
      expect(container.querySelectorAll('[data-state="key-root"] text')).toHaveLength(12);
      rerender(<FretboardCanvas {...C_KEY_DM} chordRoot="A" noteNamesVisible />);
      expect(container.querySelectorAll('[data-state="key-root"] text')).toHaveLength(0);
    });

    it('names the chord and the key in the aria-label', () => {
      render(<FretboardCanvas {...C_KEY_DM} />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'D Minor chord in the key of C on Standard E tuning');
    });

    it('labels a key-rooted chord against its own key', () => {
      render(<FretboardCanvas {...C_KEY_DM} chordRoot={null} chordName="Major" />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'C Major chord in the key of C on Standard E tuning');
    });

    // Structural guardrail for the mono-theme key-root ring colour decision (code
    // review, Story 7.1): the ring's gold token is only safe from CVD confusion with
    // --color-dot-mode-root because the two states can never render on the same board.
    // A chord always wins over the scale/mode view in the `dots` memo, so passing
    // modeIndex alongside an active chord must produce zero mode/mode-root dots.
    it('never renders key-root markers together with mode/mode-root dots', () => {
      const { container } = render(<FretboardCanvas {...C_KEY_DM} modeIndex={1} />);
      expect(container.querySelectorAll('[data-state="key-root"]')).toHaveLength(12);
      expect(container.querySelectorAll('[data-state="mode"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-state="mode-root"]')).toHaveLength(0);
    });
  });

  describe('legend', () => {
    it('is not rendered unless showLegend is set', () => {
      render(<FretboardCanvas {...STANDARD_E} />);
      expect(screen.queryByRole('list', { name: 'Fretboard legend' })).not.toBeInTheDocument();
    });

    it('lists the scale-view states on the board', () => {
      render(<FretboardCanvas {...STANDARD_E} showLegend />);
      const items = screen.getAllByRole('listitem').map(i => i.textContent);
      expect(items).toEqual(['Root', 'Scale note']);
    });

    it('lists chord-view states including the key root', () => {
      render(
        <FretboardCanvas tuning="Standard E" rootNote="C" scaleName="Major (Ionian)" chordName="Minor" chordRoot="D" showLegend />
      );
      expect(screen.getAllByRole('listitem').map(i => i.textContent)).toEqual(['Chord root', 'Chord tone', 'Key root']);
    });

    it('adds the freeform entry when marks are on the board', () => {
      render(<FretboardCanvas {...STANDARD_E} freeformMarks={[{ fret: 1, string: 0 }]} showLegend />);
      expect(screen.getAllByRole('listitem').map(i => i.textContent)).toContain('Freeform mark');
    });

    it('sits outside the horizontally scrolling board', () => {
      render(<FretboardCanvas {...STANDARD_E} showLegend />);
      const wrapper = screen.getByTestId('fretboard-scroll-wrapper');
      expect(wrapper).not.toContainElement(screen.getByRole('list', { name: 'Fretboard legend' }));
    });
  });
});
