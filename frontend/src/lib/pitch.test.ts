import {
  midiToFrequency,
  openStringMidis,
  chordFrequencies,
  stringFretFrequency,
} from './pitch';

const closeTo = (a: number, b: number, eps = 0.05) => Math.abs(a - b) < eps;

describe('midiToFrequency', () => {
  it('anchors A4 = 440 Hz and octaves halve/double', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5);
    expect(midiToFrequency(57)).toBeCloseTo(220, 5); // A3
    expect(midiToFrequency(81)).toBeCloseTo(880, 5); // A5
  });
});

describe('openStringMidis', () => {
  it('reconstructs Standard E as E2 A2 D3 G3 B3 E4', () => {
    expect(openStringMidis(['E', 'A', 'D', 'G', 'B', 'E'])).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('drops only the low string for Drop D', () => {
    expect(openStringMidis(['D', 'A', 'D', 'G', 'B', 'E'])).toEqual([38, 45, 50, 55, 59, 64]);
  });

  it('keeps every open string strictly ascending', () => {
    const midis = openStringMidis(['C', 'G', 'C', 'G', 'C', 'E']); // Open C
    for (let i = 1; i < midis.length; i++) {
      expect(midis[i]).toBeGreaterThanOrEqual(midis[i - 1]);
    }
  });

  it('honours explicit octave tokens from custom tunings', () => {
    expect(openStringMidis(['E2', 'A2', 'D3'])).toEqual([40, 45, 50]);
    expect(openStringMidis(['F#3'])).toEqual([54]);
  });
});

describe('chordFrequencies', () => {
  it('voices a C major triad from C3', () => {
    const [c, e, g] = chordFrequencies('C', [0, 4, 7]);
    expect(closeTo(c, 130.81)).toBe(true); // C3
    expect(closeTo(e, 164.81)).toBe(true); // E3
    expect(closeTo(g, 196.0)).toBe(true); // G3
  });

  it('voices extensions into higher octaves (13th spans > 1 octave)', () => {
    const freqs = chordFrequencies('C', [0, 4, 7, 10, 14, 21]);
    expect(freqs).toHaveLength(6);
    expect(freqs[5]).toBeGreaterThan(freqs[0]); // the 13th is well above the root
  });

  it('returns [] for an unknown root', () => {
    expect(chordFrequencies('H', [0, 4, 7])).toEqual([]);
  });
});

describe('stringFretFrequency', () => {
  it('open low E of Standard = E2 ≈ 82.41 Hz', () => {
    expect(closeTo(stringFretFrequency(['E', 'A', 'D', 'G', 'B', 'E'], 0, 0)!, 82.41)).toBe(true);
  });

  it('5th fret of low E = A2 ≈ 110 Hz', () => {
    expect(closeTo(stringFretFrequency(['E', 'A', 'D', 'G', 'B', 'E'], 0, 5)!, 110.0)).toBe(true);
  });

  it('returns null for an out-of-range string', () => {
    expect(stringFretFrequency(['E', 'A'], 9, 0)).toBeNull();
  });
});
