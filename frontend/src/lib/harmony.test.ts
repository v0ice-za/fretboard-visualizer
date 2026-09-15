import { diatonicChords, chordDisplayName } from './harmony';

describe('diatonicChords — triads', () => {
  it('C major: I ii iii IV V vi vii° with derived qualities', () => {
    const chords = diatonicChords('C', 'Major (Ionian)');
    expect(chords).toHaveLength(7);
    expect(chords.map((c) => c.chordRoot)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(chords.map((c) => c.chordType)).toEqual([
      'Major',
      'Minor',
      'Minor',
      'Major',
      'Major',
      'Minor',
      'Diminished',
    ]);
    expect(chords.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(chords.every((c) => c.buildable)).toBe(true);
  });

  it('A natural minor: i ii° III iv v VI VII — proves quality is derived, not hardcoded', () => {
    const chords = diatonicChords('A', 'Natural Minor (Aeolian)');
    expect(chords.map((c) => chordDisplayName(c))).toEqual([
      'Am',
      'Bdim',
      'C',
      'Dm',
      'Em',
      'F',
      'G',
    ]);
    expect(chords.map((c) => c.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  });

  it('displays chord tones as note names', () => {
    const chords = diatonicChords('C', 'Major (Ionian)');
    expect(chords[0].notes).toEqual(['C', 'E', 'G']); // I = C major
    expect(chords[1].notes).toEqual(['D', 'F', 'A']); // ii = D minor
    expect(chords[6].notes).toEqual(['B', 'D', 'F']); // vii° = B diminished
  });

  it('derives an augmented triad in harmonic minor (III+)', () => {
    const chords = diatonicChords('A', 'Harmonic Minor');
    expect(chords[2].chordType).toBe('Augmented');
    expect(chords[2].roman).toBe('III+');
  });
});

describe('diatonicChords — non-heptatonic degrade', () => {
  it('returns [] for Pentatonic Minor (the store default)', () => {
    expect(diatonicChords('A', 'Pentatonic Minor')).toEqual([]);
  });

  it('returns [] for an unknown scale name', () => {
    expect(diatonicChords('C', 'Not A Scale')).toEqual([]);
  });

  it('returns [] for an 8-note symmetric scale', () => {
    expect(diatonicChords('C', 'Diminished (H-W)')).toEqual([]);
  });

  it('returns [] for an invalid root note (not in CHROMATIC_NOTES)', () => {
    expect(diatonicChords('X', 'Major (Ionian)')).toEqual([]);
    expect(diatonicChords('', 'Major (Ionian)')).toEqual([]);
  });
});

describe('diatonicChords — sevenths', () => {
  it('C major 7ths: Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7♭5', () => {
    const chords = diatonicChords('C', 'Major (Ionian)', { sevenths: true });
    expect(chords.map((c) => chordDisplayName(c))).toEqual([
      'Cmaj7',
      'Dm7',
      'Em7',
      'Fmaj7',
      'G7',
      'Am7',
      'Bm7♭5',
    ]);
    expect(chords.map((c) => c.roman)).toEqual([
      'Imaj7',
      'ii7',
      'iii7',
      'IVmaj7',
      'V7',
      'vi7',
      'vii∅7',
    ]);
    // vii∅7 (half-diminished) resolves to the Minor 7♭5 CHORDS entry (Option A).
    expect(chords[6].chordType).toBe('Minor 7♭5');
    expect(chords.every((c) => c.buildable)).toBe(true);
  });

  it('includes the 7th tone in the chord notes', () => {
    const chords = diatonicChords('C', 'Major (Ionian)', { sevenths: true });
    expect(chords[0].notes).toEqual(['C', 'E', 'G', 'B']); // Cmaj7
    expect(chords[4].notes).toEqual(['G', 'B', 'D', 'F']); // G7
  });
});
