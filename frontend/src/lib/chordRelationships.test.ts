import {
  pitchClassSet,
  chordFamily,
  sharedNoteChords,
  jazzifySuggestions,
} from './chordRelationships';
import { CHORDS, CHORD_NAMES } from '@/data/chords.js';

const pcsArray = (root: string, type: string) => [...pitchClassSet(root, type)].sort((a, b) => a - b);

describe('pitchClassSet', () => {
  it('computes absolute pitch classes for a triad', () => {
    expect(pcsArray('C', 'Major')).toEqual([0, 4, 7]); // C E G
    expect(pcsArray('A', 'Minor')).toEqual([0, 4, 9]); // A C E
  });

  it('folds extension intervals (14/17/21) via % 12', () => {
    // C Dominant 13 = [0,4,7,10,14,21] → C E G B♭ D A
    expect(pcsArray('C', 'Dominant 13')).toEqual([0, 2, 4, 7, 9, 10]);
  });

  it('returns an empty set for an unknown root or type', () => {
    expect(pitchClassSet('H', 'Major').size).toBe(0);
    expect(pitchClassSet('C', 'Nope').size).toBe(0);
  });

  it('C6 and Am7 are the same pitch-class set (aliasing)', () => {
    expect(pcsArray('C', 'Major 6')).toEqual(pcsArray('A', 'Minor 7')); // {0,4,7,9}
  });
});

describe('chordFamily', () => {
  it.each([
    ['Major', 'major'],
    ['Major 7', 'major'],
    ['Major 6', 'major'],
    ['Major 9', 'major'],
    ['Add 9', 'major'],
    ['Augmented', 'major'],
    ['Minor', 'minor'],
    ['Minor 7', 'minor'],
    ['Minor 6', 'minor'],
    ['Minor Major 7', 'minor'],
    ['Minor 6/9', 'minor'],
    ['Dominant 7', 'dominant'],
    ['Dominant 9', 'dominant'],
    ['Dominant 7♭5', 'dominant'],
    ['Dominant 7♯5', 'dominant'],
    ['Dominant 7sus4', 'dominant'],
    ['Dominant 13', 'dominant'],
    ['Diminished', 'diminished'],
    ['Diminished 7', 'diminished'],
    ['Minor 7♭5', 'diminished'],
    ['Sus2', 'other'],
    ['Sus4', 'other'],
  ])('classifies %s as %s', (type, family) => {
    expect(chordFamily(type)).toBe(family);
  });

  it('every CHORDS type classifies without throwing', () => {
    for (const name of CHORD_NAMES as string[]) {
      expect(['major', 'minor', 'dominant', 'diminished', 'other']).toContain(chordFamily(name));
    }
  });
});

describe('sharedNoteChords', () => {
  it('ranks by shared-tone count and excludes the active chord itself', () => {
    const res = sharedNoteChords('C', 'Major');
    expect(res.find((r) => r.root === 'C' && r.type === 'Major')).toBeUndefined();
    // Monotonically non-increasing shared count (ranking invariant).
    for (let i = 1; i < res.length; i++) {
      expect(res[i].sharedCount).toBeLessThanOrEqual(res[i - 1].sharedCount);
    }
  });

  it('flags identical-pitch-set aliases and ranks them at the top', () => {
    const res = sharedNoteChords('C', 'Major 6'); // {0,4,7,9}
    // A Minor 7 shares all 4 tones → sameNotes, and appears before any 2-shared entry.
    const alias = res.find((r) => r.root === 'A' && r.type === 'Minor 7');
    expect(alias?.sameNotes).toBe(true);
    expect(alias?.sharedCount).toBe(4);
    expect(res[0].sharedCount).toBe(4);
  });

  it('honours the minShared threshold and the cap', () => {
    const strict = sharedNoteChords('C', 'Major', { minShared: 3 });
    expect(strict.every((r) => r.sharedCount >= 3)).toBe(true);
    const capped = sharedNoteChords('C', 'Dominant 13', { cap: 5 });
    expect(capped.length).toBeLessThanOrEqual(5);
  });

  it('is deterministic — identical results across repeated calls', () => {
    const a = sharedNoteChords('G', 'Dominant 7');
    const b = sharedNoteChords('G', 'Dominant 7');
    expect(a).toEqual(b);
  });

  it('returns [] for an unknown active chord', () => {
    expect(sharedNoteChords('C', 'Nope')).toEqual([]);
  });
});

describe('jazzifySuggestions', () => {
  it('major chord → extension upgrades + relative minor', () => {
    const { upgrades, substitutions } = jazzifySuggestions('C', 'Major');
    expect(upgrades).toContainEqual({ root: 'C', type: 'Major 7' });
    expect(upgrades).toContainEqual({ root: 'C', type: 'Major 9' });
    expect(substitutions).toContainEqual({ root: 'A', type: 'Minor', relation: 'Relative minor' });
  });

  it('minor chord → relative major (preserves the 7th)', () => {
    const { substitutions } = jazzifySuggestions('A', 'Minor 7');
    expect(substitutions).toContainEqual({ root: 'C', type: 'Major 7', relation: 'Relative major' });
  });

  it('dominant chord → tritone sub and ii-of-V, no relative', () => {
    const { substitutions } = jazzifySuggestions('G', 'Dominant 7');
    expect(substitutions).toContainEqual({ root: 'C#', type: 'Dominant 7', relation: 'Tritone sub' });
    expect(substitutions).toContainEqual({ root: 'D', type: 'Minor 7', relation: 'ii of V' });
    expect(substitutions.some((s) => s.relation.startsWith('Relative'))).toBe(false);
  });

  it('diminished / other families get no substitutions', () => {
    expect(jazzifySuggestions('B', 'Minor 7♭5').substitutions).toEqual([]);
    expect(jazzifySuggestions('C', 'Sus4').substitutions).toEqual([]);
  });

  it('never lists the active type as its own upgrade', () => {
    const { upgrades } = jazzifySuggestions('C', 'Major 7');
    expect(upgrades.every((u) => u.type !== 'Major 7')).toBe(true);
  });

  it('every JAZZIFY_UPGRADES target is a real CHORDS key', () => {
    // Exercise every base type that has upgrades and assert each target exists.
    for (const base of ['Major', 'Minor', 'Dominant 7', 'Major 7', 'Minor 7']) {
      for (const u of jazzifySuggestions('C', base).upgrades) {
        expect(CHORDS as Record<string, unknown>).toHaveProperty([u.type]);
      }
    }
  });

  it('returns empties for an unknown chord', () => {
    expect(jazzifySuggestions('C', 'Nope')).toEqual({ upgrades: [], substitutions: [] });
  });
});
