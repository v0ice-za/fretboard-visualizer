/** Curated chord-progression presets for the Progression Builder. Each step is a
 *  semitone offset from the currently-selected root note (not scale-derived — the
 *  builder already works in absolute root+quality pairs, independent of the active
 *  scale, so presets follow the same convention and simply transpose to whichever
 *  root is active). `quality` must be a real `CHORDS` key.
 *
 *  Roman-numeral reference (major-key semitone offsets from I):
 *  I=0  ii=2  iii=4  IV=5  V=7  vi=9  vii°=11
 */

export interface ProgressionPresetStep {
  semitones: number;
  quality: string;
}

export interface ProgressionPreset {
  name: string;
  description: string;
  steps: ProgressionPresetStep[];
}

/** Common, widely-recognizable progressions — triads only. */
export const POPULAR_PROGRESSIONS: ProgressionPreset[] = [
  {
    name: 'I – V – vi – IV',
    description: 'The "four chord song" — pop\'s most-used progression',
    steps: [
      { semitones: 0, quality: 'Major' },
      { semitones: 7, quality: 'Major' },
      { semitones: 9, quality: 'Minor' },
      { semitones: 5, quality: 'Major' },
    ],
  },
  {
    name: 'I – IV – V',
    description: 'The three-chord classic — rock, blues, country',
    steps: [
      { semitones: 0, quality: 'Major' },
      { semitones: 5, quality: 'Major' },
      { semitones: 7, quality: 'Major' },
    ],
  },
  {
    name: 'I – vi – IV – V',
    description: 'The "50s progression" — doo-wop and early rock \'n\' roll',
    steps: [
      { semitones: 0, quality: 'Major' },
      { semitones: 9, quality: 'Minor' },
      { semitones: 5, quality: 'Major' },
      { semitones: 7, quality: 'Major' },
    ],
  },
  {
    name: 'vi – IV – I – V',
    description: 'A minor-first pop variant of the four-chord progression',
    steps: [
      { semitones: 9, quality: 'Minor' },
      { semitones: 5, quality: 'Major' },
      { semitones: 0, quality: 'Major' },
      { semitones: 7, quality: 'Major' },
    ],
  },
  {
    name: 'ii – V – I',
    description: 'The classic turnaround — jazz and pop alike',
    steps: [
      { semitones: 2, quality: 'Minor' },
      { semitones: 7, quality: 'Major' },
      { semitones: 0, quality: 'Major' },
    ],
  },
  {
    name: '12-Bar Blues',
    description: 'The standard blues form, all dominant 7ths',
    steps: [
      { semitones: 0, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Dominant 7' },
      { semitones: 5, quality: 'Dominant 7' },
      { semitones: 5, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Dominant 7' },
      { semitones: 7, quality: 'Dominant 7' },
      { semitones: 5, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Dominant 7' },
    ],
  },
];

/** Jazzier reharmonizations — extension chords, secondary dominants, tritone subs. */
export const JAZZY_PROGRESSIONS: ProgressionPreset[] = [
  {
    name: 'ii7 – V7 – Imaj7',
    description: 'The jazz turnaround, with proper 7th-chord colors',
    steps: [
      { semitones: 2, quality: 'Minor 7' },
      { semitones: 7, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Major 7' },
    ],
  },
  {
    name: 'Imaj7 – vi7 – ii7 – V7',
    description: 'The "rhythm changes" turnaround',
    steps: [
      { semitones: 0, quality: 'Major 7' },
      { semitones: 9, quality: 'Minor 7' },
      { semitones: 2, quality: 'Minor 7' },
      { semitones: 7, quality: 'Dominant 7' },
    ],
  },
  {
    name: 'iii7 – VI7 – ii7 – V7',
    description: 'An extended cycle into I, with VI as a secondary dominant',
    steps: [
      { semitones: 4, quality: 'Minor 7' },
      { semitones: 9, quality: 'Dominant 7' },
      { semitones: 2, quality: 'Minor 7' },
      { semitones: 7, quality: 'Dominant 7' },
    ],
  },
  {
    name: 'Tritone-Sub ii – V – I',
    description: 'Swaps V7 for its tritone substitute, a half-step above I',
    steps: [
      { semitones: 2, quality: 'Minor 7' },
      { semitones: 6, quality: 'Dominant 7' },
      { semitones: 0, quality: 'Major 7' },
    ],
  },
];
