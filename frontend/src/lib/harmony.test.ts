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

// Story 6.2 AC6 — expanding CHORDS must NOT reclassify any standard diatonic chord
// (harmony.ts matches by first exact array; new entries are append-only) but SHOULD
// let previously-unbuildable exotic-scale degrees resolve. This closes 6.1's deferred
// "exotic heptatonic scales not tested for buildable 7ths" finding.
describe('diatonicChords — expanded library (6.2)', () => {
  describe('golden-path regression — standard scales classify identically', () => {
    it('C major triads unchanged after CHORDS grew', () => {
      const chords = diatonicChords('C', 'Major (Ionian)');
      expect(chords.map((c) => c.chordType)).toEqual([
        'Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished',
      ]);
    });

    it('C major 7ths unchanged (no new entry steals a diatonic slot)', () => {
      const chords = diatonicChords('C', 'Major (Ionian)', { sevenths: true });
      expect(chords.map((c) => c.chordType)).toEqual([
        'Major 7', 'Minor 7', 'Minor 7', 'Major 7', 'Dominant 7', 'Minor 7', 'Minor 7♭5',
      ]);
    });

    it('A natural-minor 7ths unchanged', () => {
      const chords = diatonicChords('A', 'Natural Minor (Aeolian)', { sevenths: true });
      expect(chords.map((c) => c.chordType)).toEqual([
        'Minor 7', 'Minor 7♭5', 'Major 7', 'Minor 7', 'Minor 7', 'Major 7', 'Dominant 7',
      ]);
    });
  });

  describe('exotic scales gain buildable degrees from the new 4-note types', () => {
    it('Double Harmonic (Byzantine): the V degree now builds as Dominant 7♭5', () => {
      const chords = diatonicChords('C', 'Double Harmonic (Byzantine)', { sevenths: true });
      const v = chords[4]; // degree 5, rooted on G
      expect(v.buildable).toBe(true);
      expect(v.chordRoot).toBe('G');
      expect(v.chordType).toBe('Dominant 7♭5');
      // suffix map closed in 6.2 → reads 'G7♭5', not a bare 'G'
      expect(chordDisplayName(v)).toBe('G7♭5');
    });

    it('Double Harmonic (Byzantine): the iii degree now builds as Minor 6', () => {
      const chords = diatonicChords('C', 'Double Harmonic (Byzantine)', { sevenths: true });
      const iii = chords[2]; // rooted on E
      expect(iii.buildable).toBe(true);
      expect(iii.chordType).toBe('Minor 6');
      expect(chordDisplayName(iii)).toBe('Em6');
    });

    it('Enigmatic: a degree that was unbuildable with the old set now resolves', () => {
      const before = diatonicChords('C', 'Enigmatic', { sevenths: true });
      // With the old 13-entry set Enigmatic had zero buildable 7ths; now at least one does.
      expect(before.some((c) => c.buildable)).toBe(true);
      const major6 = before.find((c) => c.chordType === 'Major 6');
      expect(major6).toBeDefined();
      expect(chordDisplayName(major6!)).toBe(major6!.chordRoot + '6');
    });

    it('never emits a chordType that is not a real CHORDS key', () => {
      // Guard the invariant the highlight path depends on: buildable ⇒ chordType is renderable.
      for (const scale of ['Double Harmonic (Byzantine)', 'Persian', 'Arabic', 'Enigmatic', 'Hungarian Minor']) {
        for (const c of diatonicChords('C', scale, { sevenths: true })) {
          if (c.buildable) expect(c.chordType).not.toBe('');
          else expect(c.chordType).toBe('');
        }
      }
    });

    // Exhaustive check: every degree, across all 5 exotic scales, that resolves to
    // one of the 5 new-in-6.2 4-note types — computed directly from SCALES+CHORDS
    // (not hand-guessed) so this can't silently drift if either data file changes.
    it.each([
      ['Double Harmonic (Byzantine)', 2, 'E', 'Minor 6', 'Em6'],
      ['Double Harmonic (Byzantine)', 4, 'G', 'Dominant 7♭5', 'G7♭5'],
      ['Arabic', 0, 'C', 'Dominant 7♭5', 'C7♭5'],
      ['Arabic', 5, 'G#', 'Dominant 7♯5', 'G#7♯5'],
      ['Persian', 5, 'G#', 'Dominant 7♯5', 'G#7♯5'],
      ['Enigmatic', 2, 'E', 'Major 6', 'E6'],
      ['Enigmatic', 3, 'F#', 'Dominant 7♭5', 'F#7♭5'],
      ['Hungarian Minor', 1, 'D', 'Dominant 7♭5', 'D7♭5'],
      ['Hungarian Minor', 6, 'B', 'Minor 6', 'Bm6'],
    ] as const)(
      '%s degree %i (%s) builds as %s → displays %s',
      (scaleName, degree, expectedRoot, expectedType, expectedDisplay) => {
        const chords = diatonicChords('C', scaleName, { sevenths: true });
        const chord = chords[degree];
        expect(chord.buildable).toBe(true);
        expect(chord.chordRoot).toBe(expectedRoot);
        expect(chord.chordType).toBe(expectedType);
        expect(chordDisplayName(chord)).toBe(expectedDisplay);
      }
    );

    it('Dominant 7sus4 can never be produced by diatonic third-stacking (no scale, no degree)', () => {
      // Structural, not a coverage gap: stacking thirds always yields a 3rd at
      // position 1 (interval 3 or 4), but 7sus4's defining feature is no 3rd at
      // all ([0,5,7,10]) — so this type is permanently unbuildable via harmonization.
      // Verified computationally across every heptatonic scale in SCALES.
      for (const scale of ['Double Harmonic (Byzantine)', 'Persian', 'Arabic', 'Enigmatic', 'Hungarian Minor']) {
        const chords = diatonicChords('C', scale, { sevenths: true });
        expect(chords.some((c) => c.chordType === 'Dominant 7sus4')).toBe(false);
      }
    });
  });
});
