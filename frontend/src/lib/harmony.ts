import { SCALES } from '@/data/scales.js';
import { CHORDS } from '@/data/chords.js';
import { noteAtSemitone, noteIndex } from '@/data/notes.js';

/** One diatonic chord built on a scale degree. `chordType` is a valid `CHORDS`
 *  key when `buildable`, otherwise `''` (the highlight path can only render real
 *  `CHORDS` keys — never emit one that isn't). */
export interface DiatonicChord {
  degree: number; // 0-based scale-degree index (0 = tonic)
  roman: string; // Roman numeral, cased + suffixed by quality (I, ii, vii°, V7, vii∅7…)
  chordRoot: string; // note name this chord is rooted on (ii of C major → 'D')
  chordType: string; // a `CHORDS` key when buildable, else ''
  notes: string[]; // chord tones as note names (for display/tests)
  buildable: boolean; // true when the interval set matched a `CHORDS` entry
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

type Quality = 'major' | 'minor' | 'diminished' | 'augmented' | 'other';

/** Short suffix appended to the chord root for the degree-strip display name.
 *  E.g. root 'D' + 'Minor' → 'Dm'; root 'B' + 'Minor 7♭5' → 'Bm7♭5'. */
const DISPLAY_SUFFIX: Record<string, string> = {
  Major: '',
  Minor: 'm',
  Diminished: 'dim',
  Augmented: '+',
  'Major 7': 'maj7',
  'Minor 7': 'm7',
  'Dominant 7': '7',
  'Diminished 7': 'dim7',
  'Minor 7♭5': 'm7♭5',
  'Minor Major 7': 'mMaj7',
};

/** Roman-numeral 7th suffix keyed by matched chord type. The numeral's own case
 *  already conveys major/minor, so a minor-7th only needs '7', not 'm7'. */
const ROMAN_7TH_SUFFIX: Record<string, string> = {
  'Major 7': 'maj7',
  'Dominant 7': '7',
  'Minor 7': '7',
  'Diminished 7': '°7',
  'Minor 7♭5': '∅7',
  'Minor Major 7': 'maj7',
};

/** Display name for the degree strip: chord root + short quality suffix. */
export function chordDisplayName(chord: DiatonicChord): string {
  return chord.chordRoot + (DISPLAY_SUFFIX[chord.chordType] ?? '');
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function triadQuality(third: number, fifth: number): Quality {
  if (third === 4 && fifth === 7) return 'major';
  if (third === 3 && fifth === 7) return 'minor';
  if (third === 3 && fifth === 6) return 'diminished';
  if (third === 4 && fifth === 8) return 'augmented';
  return 'other';
}

function buildRoman(
  degree: number,
  quality: Quality,
  chordType: string,
  sevenths: boolean
): string {
  const base = ROMAN_NUMERALS[degree];
  const upper = quality === 'major' || quality === 'augmented';
  let roman = upper ? base : base.toLowerCase();

  if (sevenths && chordType) {
    roman += ROMAN_7TH_SUFFIX[chordType] ?? '';
  } else {
    // Triad symbols (also the fallback when a 7th chord isn't in CHORDS).
    if (quality === 'diminished') roman += '°';
    else if (quality === 'augmented') roman += '+';
  }
  return roman;
}

/** Compute the diatonic chords for a root note + scale by stacking scale thirds
 *  on each degree. Quality is DERIVED from the scale's own interval set, never
 *  hardcoded to the major I-ii-iii pattern. Only heptatonic (7-note) scales
 *  harmonize — anything else returns `[]` and the caller renders a degrade note. */
export function diatonicChords(
  rootNote: string,
  scaleName: string,
  opts?: { sevenths?: boolean }
): DiatonicChord[] {
  // Guard an unknown root note: noteIndex returns -1 for anything not in
  // CHROMATIC_NOTES, which would silently produce wrong chord roots. Real paths
  // pass useUrlState-validated notes; this defends future callers.
  if (noteIndex(rootNote) === -1) return [];

  const scale = (SCALES as Record<string, { intervals: number[] }>)[scaleName];
  if (!scale || scale.intervals.length !== 7) return [];

  const sevenths = opts?.sevenths ?? false;
  const iv = scale.intervals; // ordered, length 7
  const positions = sevenths ? [0, 2, 4, 6] : [0, 2, 4];
  const chordEntries = Object.entries(CHORDS) as [string, { intervals: number[] }][];

  const result: DiatonicChord[] = [];
  for (let i = 0; i < 7; i++) {
    // Stack thirds: scale degrees i, i+2, i+4 (and i+6 for 7ths), wrapping the
    // array and adding an octave (+12) each wrap so the tones stay ascending.
    const semis = positions.map((p) => {
      const idx = i + p;
      return iv[idx % 7] + 12 * Math.floor(idx / 7);
    });
    const rootSemi = semis[0]; // === iv[i]
    const intervalSet = semis.map((s) => (((s - rootSemi) % 12) + 12) % 12);

    const chordRoot = noteAtSemitone(rootNote, iv[i]);
    const notes = semis.map((s) => noteAtSemitone(rootNote, s));

    let chordType = '';
    for (const [name, def] of chordEntries) {
      if (arraysEqual(def.intervals, intervalSet)) {
        chordType = name;
        break;
      }
    }
    const buildable = chordType !== '';
    const quality = triadQuality(intervalSet[1], intervalSet[2]);
    const roman = buildRoman(i, quality, chordType, sevenths);

    result.push({ degree: i, roman, chordRoot, chordType, notes, buildable });
  }
  return result;
}
