import { CHORDS, CHORD_NAMES } from './chords.js'

// Story 6.2 — data-integrity guards for the expanded chord vocabulary.
// These aren't cosmetic: harmony.ts (diatonicChords) classifies each diatonic
// chord by the FIRST exact interval-array match in CHORDS insertion order, so a
// duplicate array or a reordered head silently reclassifies established chords
// and/or changes which chords are free (ChordLibrary slices the first 5).

describe('CHORDS data integrity', () => {
  it('every chord interval array is unique (keeps harmony.ts first-match deterministic)', () => {
    const serialized = Object.values(CHORDS).map((c) => JSON.stringify(c.intervals))
    const unique = new Set(serialized)
    // Pinpoint the offender if this ever fails.
    const seen = new Set()
    const dupes = []
    for (const [name, def] of Object.entries(CHORDS)) {
      const key = JSON.stringify(def.intervals)
      if (seen.has(key)) dupes.push(`${name} = [${def.intervals}]`)
      seen.add(key)
    }
    expect(dupes).toEqual([])
    expect(unique.size).toBe(CHORD_NAMES.length)
  })

  it('every chord starts on the root (interval 0) and has ascending, non-negative intervals', () => {
    for (const [name, def] of Object.entries(CHORDS)) {
      expect(def.intervals[0], name).toBe(0)
      for (let i = 1; i < def.intervals.length; i++) {
        expect(def.intervals[i], name).toBeGreaterThan(def.intervals[i - 1])
      }
    }
  })

  it('CHORD_NAMES === Object.keys(CHORDS) in order', () => {
    expect(CHORD_NAMES).toEqual(Object.keys(CHORDS))
  })
})

describe('CHORDS free-preview invariance (AC2)', () => {
  // ChordLibrary derives FREE_CHORD_NAMES from CHORD_NAMES.slice(0, 5).
  // Reordering the head would silently change which chords are free.
  it('the first 5 keys are exactly the free-tier basics, in order', () => {
    expect(CHORD_NAMES.slice(0, 5)).toEqual([
      'Major',
      'Minor',
      'Dominant 7',
      'Minor 7',
      'Major 7',
    ])
  })

  it('the original 13 chords are unchanged and still first (append-only)', () => {
    const originalHead = {
      Major: [0, 4, 7],
      Minor: [0, 3, 7],
      'Dominant 7': [0, 4, 7, 10],
      'Minor 7': [0, 3, 7, 10],
      'Major 7': [0, 4, 7, 11],
      Sus2: [0, 2, 7],
      Sus4: [0, 5, 7],
      Diminished: [0, 3, 6],
      Augmented: [0, 4, 8],
      'Diminished 7': [0, 3, 6, 9],
      'Minor 7♭5': [0, 3, 6, 10],
      'Minor Major 7': [0, 3, 7, 11],
      'Dominant 9': [0, 4, 7, 10, 14],
    }
    const keys = Object.keys(originalHead)
    expect(CHORD_NAMES.slice(0, keys.length)).toEqual(keys)
    keys.forEach((name) => expect(CHORDS[name].intervals).toEqual(originalHead[name]))
  })
})

describe('CHORDS expanded vocabulary (AC1)', () => {
  it('adds the 15 expected new chord types with correct intervals', () => {
    const expected = {
      'Major 6': [0, 4, 7, 9],
      'Minor 6': [0, 3, 7, 9],
      'Add 9': [0, 4, 7, 14],
      'Minor Add 9': [0, 3, 7, 14],
      'Major 9': [0, 4, 7, 11, 14],
      'Minor 9': [0, 3, 7, 10, 14],
      'Dominant 7♭5': [0, 4, 6, 10],
      'Dominant 7♯5': [0, 4, 8, 10],
      'Dominant 7sus4': [0, 5, 7, 10],
      'Dominant 11': [0, 4, 7, 10, 14, 17],
      'Minor 11': [0, 3, 7, 10, 14, 17],
      'Dominant 13': [0, 4, 7, 10, 14, 21],
      'Major 13': [0, 4, 7, 11, 14, 21],
      'Major 6/9': [0, 4, 7, 9, 14],
      'Minor 6/9': [0, 3, 7, 9, 14],
    }
    for (const [name, intervals] of Object.entries(expected)) {
      expect(CHORDS[name]?.intervals, name).toEqual(intervals)
    }
    expect(CHORD_NAMES).toHaveLength(13 + 15)
  })

  it('does not add aug7 / m7♭5 / a second dominant-9 synonym (would duplicate arrays)', () => {
    expect(CHORDS['Augmented 7']).toBeUndefined() // == Dominant 7♯5 [0,4,8,10]
    expect(CHORD_NAMES.filter((n) => n === 'Minor 7♭5')).toHaveLength(1)
    // Only one entry carries the dominant-9 array.
    const dom9 = Object.entries(CHORDS).filter(
      ([, d]) => JSON.stringify(d.intervals) === JSON.stringify([0, 4, 7, 10, 14]),
    )
    expect(dom9.map(([n]) => n)).toEqual(['Dominant 9'])
  })
})
