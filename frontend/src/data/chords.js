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
  // ── Story 6.2: expanded vocabulary. APPEND-ONLY below this line. ──
  // Ordering is load-bearing twice over: ChordLibrary slices CHORD_NAMES.slice(0,5)
  // for the free preview, and harmony.ts classifies diatonic chords by first exact
  // interval-array match in insertion order — so never reorder the head, and every
  // array below MUST stay unique (enforced by chords.test.js). See story 6.2 Dev Notes.
  'Major 6':        { intervals: [0, 4, 7, 9] },
  'Minor 6':        { intervals: [0, 3, 7, 9] },
  'Add 9':          { intervals: [0, 4, 7, 14] },
  'Minor Add 9':    { intervals: [0, 3, 7, 14] },
  'Major 9':        { intervals: [0, 4, 7, 11, 14] },
  'Minor 9':        { intervals: [0, 3, 7, 10, 14] },
  'Dominant 7♭5':   { intervals: [0, 4, 6, 10] },
  'Dominant 7♯5':   { intervals: [0, 4, 8, 10] }, // this IS aug7 — no separate 'Augmented 7'
  'Dominant 7sus4': { intervals: [0, 5, 7, 10] },
  'Dominant 11':    { intervals: [0, 4, 7, 10, 14, 17] },
  'Minor 11':       { intervals: [0, 3, 7, 10, 14, 17] },
  'Dominant 13':    { intervals: [0, 4, 7, 10, 14, 21] },
  'Major 13':       { intervals: [0, 4, 7, 11, 14, 21] },
  'Major 6/9':      { intervals: [0, 4, 7, 9, 14] },
  'Minor 6/9':      { intervals: [0, 3, 7, 9, 14] },
}

export const CHORD_NAMES = Object.keys(CHORDS)
