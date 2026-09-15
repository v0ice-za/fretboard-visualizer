export const CHORDS = {
  'Major':          { intervals: [0, 4, 7] },
  'Minor':          { intervals: [0, 3, 7] },
  'Dominant 7':     { intervals: [0, 4, 7, 10] },
  'Minor 7':        { intervals: [0, 3, 7, 10] },
  'Major 7':        { intervals: [0, 4, 7, 11] },
  'Sus2':           { intervals: [0, 2, 7] },
  'Sus4':           { intervals: [0, 5, 7] },
  'Diminished':     { intervals: [0, 3, 6] },
  'Augmented':      { intervals: [0, 4, 8] },
  'Diminished 7':   { intervals: [0, 3, 6, 9] },
  'Minor 7♭5':      { intervals: [0, 3, 6, 10] },
  'Minor Major 7':  { intervals: [0, 3, 7, 11] },
  'Dominant 9':     { intervals: [0, 4, 7, 10, 14] },
}

export const CHORD_NAMES = Object.keys(CHORDS)
