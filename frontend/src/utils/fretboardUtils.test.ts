import {
  calculateFreeformDots,
  calculateChordDots,
  calculateFretboardDots,
  calculateKeyRootMarkers,
  getLegendEntries,
  generateAriaLabel,
  toPitchClass,
  mirrorX,
  VIEWBOX_WIDTH,
  NUT_X,
  NUT_LABEL_X,
  FRET_AREA_RIGHT,
} from './fretboardUtils';
import { CHORDS } from '@/data/chords.js';

describe('mirrorX (Story 7.4)', () => {
  it('is the identity when right-handed', () => {
    expect(mirrorX(NUT_X, false)).toBe(NUT_X);
    expect(mirrorX(123.4, false)).toBe(123.4);
  });

  it('reflects x across the viewBox when left-handed', () => {
    expect(mirrorX(NUT_X, true)).toBe(VIEWBOX_WIDTH - NUT_X);
    expect(mirrorX(0, true)).toBe(VIEWBOX_WIDTH);
  });

  it('is an involution', () => {
    for (const x of [0, NUT_X, 333.3, VIEWBOX_WIDTH]) {
      expect(mirrorX(mirrorX(x, true), true)).toBeCloseTo(x);
    }
  });

  it('maps the nut-label margin onto the fret-area edge — the mirrored board fits the viewBox', () => {
    expect(mirrorX(NUT_LABEL_X, true)).toBe(FRET_AREA_RIGHT);
    expect(mirrorX(FRET_AREA_RIGHT, true)).toBe(NUT_LABEL_X);
  });
});

describe('calculateFreeformDots', () => {
  it('returns 1 dot for a valid mark at fret 5, string 1', () => {
    const result = calculateFreeformDots([{ fret: 5, string: 1 }], 'Standard E', 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fret: 5, string: 1, state: 'freeform' });
  });

  it('returns 0 dots when mark fret is below capo', () => {
    const result = calculateFreeformDots([{ fret: 2, string: 0 }], 'Standard E', 3);
    expect(result).toHaveLength(0);
  });

  it('returns 1 dot when mark fret equals capo (inclusive lower bound)', () => {
    const result = calculateFreeformDots([{ fret: 3, string: 0 }], 'Standard E', 3);
    expect(result).toHaveLength(1);
    expect(result[0].fret).toBe(3);
  });

  it('returns 0 dots for a mark with fret -1 (invalid)', () => {
    const result = calculateFreeformDots([{ fret: -1, string: 0 }], 'Standard E', 0);
    expect(result).toHaveLength(0);
  });

  it('returns 0 dots for a mark with string 6 (out of bounds)', () => {
    const result = calculateFreeformDots([{ fret: 0, string: 6 }], 'Standard E', 0);
    expect(result).toHaveLength(0);
  });

  it('returns the sounded note for the given tuning and fret', () => {
    // Standard E string 0 is 'E' (low E); fret 5 = A
    const result = calculateFreeformDots([{ fret: 5, string: 0 }], 'Standard E', 0);
    expect(result[0].note).toBe('A');
  });

  it('filters multiple marks, returning only valid ones above capo', () => {
    const marks = [
      { fret: 2, string: 0 }, // below capo=3 → filtered
      { fret: 3, string: 1 }, // at capo=3 → included
      { fret: 7, string: 2 }, // above capo → included
    ];
    const result = calculateFreeformDots(marks, 'Standard E', 3);
    expect(result).toHaveLength(2);
    expect(result[0].fret).toBe(3);
    expect(result[1].fret).toBe(7);
  });
});

describe('calculateChordDots', () => {
  it('returns root dots (state="root") and chord tone dots (state="scale") for A Major on Standard E', () => {
    const dots = calculateChordDots([0, 4, 7], 'A', 'Standard E');
    const rootDots = dots.filter(d => d.state === 'root');
    const scaleDots = dots.filter(d => d.state === 'scale');
    expect(rootDots.length).toBeGreaterThan(0);
    expect(scaleDots.length).toBeGreaterThan(0);
    rootDots.forEach(d => expect(d.note).toBe('A'));
    expect(dots.every(d => d.state === 'root' || d.state === 'scale')).toBe(true);
  });

  it('different tunings produce different dot positions for the same chord', () => {
    const dotsE = calculateChordDots([0, 4, 7], 'A', 'Standard E');
    const dotsDropD = calculateChordDots([0, 4, 7], 'A', 'Drop D');
    expect(dotsE).not.toEqual(dotsDropD);
  });

  it('capoPosition skips frets below capo', () => {
    const dots = calculateChordDots([0, 4, 7], 'A', 'Standard E', 3);
    expect(dots.every(d => d.fret >= 3)).toBe(true);
  });

  // Story 6.2 AC3: 5- and 6-note extended chords (9/11/13) must highlight without
  // crashing or overflowing. calculateChordDots folds every interval via % 12 into a
  // note Set, so extension tones (14/17/21) collapse into pitch classes — verified here.
  describe('extended chords (9/11/13)', () => {
    const extended: [string, number[]][] = [
      ['Dominant 9', CHORDS['Dominant 9'].intervals], // 5 notes
      ['Major 9', CHORDS['Major 9'].intervals],       // 5 notes
      ['Dominant 11', CHORDS['Dominant 11'].intervals], // 6 notes
      ['Minor 11', CHORDS['Minor 11'].intervals],       // 6 notes
      ['Dominant 13', CHORDS['Dominant 13'].intervals], // 6 notes
      ['Major 13', CHORDS['Major 13'].intervals],       // 6 notes
      ['Add 9', CHORDS['Add 9'].intervals],             // 4 notes
      ['Minor Add 9', CHORDS['Minor Add 9'].intervals], // 4 notes
      ['Major 6/9', CHORDS['Major 6/9'].intervals],     // 5 notes
      ['Minor 6/9', CHORDS['Minor 6/9'].intervals],     // 5 notes
    ];

    it.each(extended)('%s highlights on Standard E with only root/scale dots', (_name, intervals) => {
      const dots = calculateChordDots(intervals, 'C', 'Standard E');
      expect(dots.length).toBeGreaterThan(0);
      expect(dots.every(d => d.state === 'root' || d.state === 'scale')).toBe(true);
      expect(dots.filter(d => d.state === 'root').every(d => d.note === 'C')).toBe(true);
      // every dot sits within the rendered board (no overflow/NaN)
      expect(dots.every(d => d.fret >= 0 && d.fret <= 24 && Number.isFinite(d.cx) && Number.isFinite(d.cy))).toBe(true);
    });

    it.each(extended)('%s renders across two tunings without crashing', (_name, intervals) => {
      const e = calculateChordDots(intervals, 'C', 'Standard E');
      const dropD = calculateChordDots(intervals, 'C', 'Drop D');
      expect(e.length).toBeGreaterThan(0);
      expect(dropD.length).toBeGreaterThan(0);
      expect(e).not.toEqual(dropD);
    });

    it('a 6-note chord folds the 13th (21) into the same pitch class as its 6th (9)', () => {
      // 21 % 12 === 9, so Dominant 13's 13th tone shares dots with the 6th degree —
      // inherent to pitch-class rendering, and proves the fold is correct, not a bug.
      const dots = calculateChordDots(CHORDS['Dominant 13'].intervals, 'C', 'Standard E');
      const notes = new Set(dots.map(d => d.note));
      // C13 tones fold to pitch classes {C, E, G, B♭, D, A}
      expect(notes).toContain('A'); // the 13th (21 → 9 semitones → A)
    });
  });
});

describe('toPitchClass', () => {
  it('strips a trailing octave digit', () => {
    expect(toPitchClass('E2')).toBe('E');
    expect(toPitchClass('F#3')).toBe('F#');
    expect(toPitchClass('Eb2')).toBe('Eb');
  });
  it('leaves a bare pitch class unchanged', () => {
    expect(toPitchClass('E')).toBe('E');
    expect(toPitchClass('C#')).toBe('C#');
  });
});

describe('strings override', () => {
  const ALL_C = ['C', 'C', 'C', 'C', 'C', 'C'];

  it('calculateFretboardDots uses the override instead of the named tuning', () => {
    // Every open string is C, root is C → a root dot at fret 0 on all 6 strings.
    const dots = calculateFretboardDots('Standard E', 'C', 'Major (Ionian)', 0, null, ALL_C);
    const openRoots = dots.filter(d => d.fret === 0 && d.state === 'root');
    expect(openRoots).toHaveLength(6);
  });

  it('calculateFretboardDots is unchanged when no override is passed', () => {
    // Sanity: omitting the override falls back to the named tuning lookup (no crash, returns dots).
    const withUndefined = calculateFretboardDots('Standard E', 'A', 'Pentatonic Minor', 0, null, undefined);
    const original = calculateFretboardDots('Standard E', 'A', 'Pentatonic Minor', 0, null);
    expect(withUndefined).toEqual(original);
  });

  it('calculateChordDots uses the override', () => {
    const dots = calculateChordDots([0, 4, 7], 'C', 'Standard E', 0, ALL_C);
    const openRoots = dots.filter(d => d.fret === 0 && d.state === 'root');
    expect(openRoots).toHaveLength(6);
  });
});

describe('calculateKeyRootMarkers', () => {
  it('marks every C in Standard E (frets 0–24) when a D chord is shown in the key of C', () => {
    const markers = calculateKeyRootMarkers('C', 'D', 'Standard E');
    // Two Cs per string across 25 frets on all six strings.
    expect(markers).toHaveLength(12);
    expect(markers.every(m => m.state === 'key-root' && m.note === 'C')).toBe(true);
    expect(markers.map(m => `${m.string}-${m.fret}`).sort()).toEqual(
      ['0-8', '0-20', '1-3', '1-15', '2-10', '2-22', '3-5', '3-17', '4-1', '4-13', '5-8', '5-20'].sort()
    );
  });

  it('skips frets below the capo', () => {
    const markers = calculateKeyRootMarkers('C', 'D', 'Standard E', 3);
    expect(markers).toHaveLength(11); // the B-string C at fret 1 is under the capo
    expect(markers.every(m => m.fret >= 3)).toBe(true);
  });

  it('honours an explicit strings override (custom tunings)', () => {
    const markers = calculateKeyRootMarkers('C', 'G', 'Custom', 0, ['C', 'C', 'C', 'C', 'C', 'C']);
    expect(markers.filter(m => m.fret === 0)).toHaveLength(6);
  });

  it('returns no markers when the chord is rooted on the key', () => {
    expect(calculateKeyRootMarkers('C', 'C', 'Standard E')).toEqual([]);
  });

  it('compares pitch classes, not spellings', () => {
    expect(calculateKeyRootMarkers('C#', 'Db', 'Standard E')).toEqual([]);
  });
});

describe('getLegendEntries', () => {
  it('returns nothing when no dots are rendered', () => {
    expect(getLegendEntries({ chordActive: false, states: new Set() })).toEqual([]);
    expect(getLegendEntries({ chordActive: true, states: new Set() })).toEqual([]);
  });

  it('labels chord-view states in a fixed order', () => {
    const entries = getLegendEntries({
      chordActive: true,
      states: new Set(['freeform', 'key-root', 'scale', 'root'] as const),
    });
    expect(entries).toEqual([
      { state: 'root', label: 'Chord root' },
      { state: 'scale', label: 'Chord tone' },
      { state: 'key-root', label: 'Key root' },
      { state: 'freeform', label: 'Freeform mark' },
    ]);
  });

  it('labels scale-view states in a fixed order', () => {
    const entries = getLegendEntries({
      chordActive: false,
      states: new Set(['mode', 'scale', 'mode-root', 'root', 'freeform'] as const),
    });
    expect(entries.map(e => e.label)).toEqual(['Root', 'Scale note', 'Mode note', 'Mode root', 'Freeform mark']);
  });

  it('only lists states that are present', () => {
    const entries = getLegendEntries({ chordActive: false, states: new Set(['root', 'scale'] as const) });
    expect(entries.map(e => e.state)).toEqual(['root', 'scale']);
  });
});

describe('generateAriaLabel', () => {
  it('describes the scale view', () => {
    expect(generateAriaLabel('Standard E', 'A', 'Pentatonic Minor')).toBe(
      'A Pentatonic Minor scale on Standard E tuning'
    );
  });

  it('keeps the mode and capo suffixes in the scale view', () => {
    expect(generateAriaLabel('Standard E', 'C', 'Major (Ionian)', 1, 2)).toBe(
      'C Major (Ionian) scale on Standard E tuning, Dorian mode overlay active, capo at fret 2'
    );
  });

  it('names the chord and the key when a chord is shown', () => {
    expect(generateAriaLabel('Standard E', 'C', 'Major (Ionian)', null, 0, { root: 'D', type: 'Minor' })).toBe(
      'D Minor chord in the key of C on Standard E tuning'
    );
  });

  it('omits the mode overlay but keeps the capo in the chord view', () => {
    expect(generateAriaLabel('Drop D', 'C', 'Major (Ionian)', 1, 3, { root: 'G', type: 'Major' })).toBe(
      'G Major chord in the key of C on Drop D tuning, capo at fret 3'
    );
  });
});
