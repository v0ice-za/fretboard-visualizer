import { calculateFreeformDots } from './fretboardUtils';

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
