import { TUNINGS } from '@/data/tunings.js';
import { SCALES } from '@/data/scales.js';
import { getNoteAtFret, getScaleNotes, isRoot, FRET_MARKERS, DOUBLE_MARKERS } from '@/utils/musicTheory.js';
import type { FreeformMark } from '@/stores/fretboardStore';

// 7 modes — index matches chip position in ModeChipsRow
// scaleName must exactly match a key in SCALES (scales.js)
export const MODES = [
  { name: 'Ionian',     scaleName: 'Major (Ionian)',          description: 'Major — bright and resolved' },
  { name: 'Dorian',     scaleName: 'Dorian',                  description: 'Minor with a bright ♮6' },
  { name: 'Phrygian',   scaleName: 'Phrygian',                description: 'Minor with a ♭2 — Spanish flavour' },
  { name: 'Lydian',     scaleName: 'Lydian',                  description: 'Major with a ♯4 — dreamy' },
  { name: 'Mixolydian', scaleName: 'Mixolydian',              description: 'Major with a ♭7 — bluesy dominant' },
  { name: 'Aeolian',    scaleName: 'Natural Minor (Aeolian)', description: 'Natural minor — dark and resolved' },
  { name: 'Locrian',    scaleName: 'Locrian',                 description: 'Diminished — unstable ♭5' },
] as const;


export type DotState = 'root' | 'scale' | 'mode' | 'mode-root' | 'freeform';

export interface FretDotData {
  fret: number;    // 0 (open string) to 24
  string: number;  // 0 (low E / thickest) to 5 (high e / thinnest)
  state: DotState;
  note: string;    // e.g. "A", "C#"
  cx: number;      // SVG x center coordinate
  cy: number;      // SVG y center coordinate
}

// SVG layout constants — shared with FretboardCanvas and tests
export const VIEWBOX_WIDTH = 900;
export const VIEWBOX_HEIGHT = 220;
export const FRET_COUNT = 24;
export const STRING_COUNT = 6;
export const NUT_X = 40;            // x of nut line (left boundary of fret columns)
export const FRET_AREA_WIDTH = 844; // total fret column space (NUT_X to right edge minus padding)
export const FRET_AREA_RIGHT = NUT_X + FRET_AREA_WIDTH;
export const OPEN_DOT_X = NUT_X;    // open-string dots sit on the nut line
export const NUT_LABEL_X = 16;      // x center for string name labels
export const FRET_NUMBER_Y = 208;   // y for fret number labels
// String y positions: index 0 = low E (top), index 5 = high e (bottom), 33px spacing
export const STRING_Y = [22, 55, 88, 121, 154, 187] as const;

export { FRET_MARKERS, DOUBLE_MARKERS };

// Logarithmic fret position formula (real guitar geometry: fret n is at 1 - 0.5^(n/12))
function fretPosition(n: number): number {
  return 1 - Math.pow(0.5, n / 12);
}

const FRET_POS_AT_MAX = fretPosition(FRET_COUNT);

// X coordinate of the fret wire at position n (0 = nut, 24 = last fret)
export function getFretLineX(fret: number): number {
  return NUT_X + (fretPosition(fret) / FRET_POS_AT_MAX) * FRET_AREA_WIDTH;
}

// X center of the dot for a given fret (0 = open string, 1–24 = mid-column)
export function getDotCx(fret: number): number {
  if (fret === 0) return OPEN_DOT_X;
  return (getFretLineX(fret - 1) + getFretLineX(fret)) / 2;
}

// Y center for a string index — string 0 (low E / thick) is at the bottom
export function getDotCy(stringIdx: number): number {
  return STRING_Y[STRING_COUNT - 1 - stringIdx];
}

export function generateAriaLabel(
  tuning: string,
  rootNote: string,
  scaleName: string,
  modeIndex?: number | null,
  capoPosition?: number
): string {
  const base = `${rootNote} ${scaleName} scale on ${tuning} tuning`;
  let label = base;
  if (modeIndex != null && modeIndex >= 0 && modeIndex < MODES.length) {
    label = `${label}, ${MODES[modeIndex].name} mode overlay active`;
  }
  if (capoPosition && capoPosition > 0) {
    label = `${label}, capo at fret ${capoPosition}`;
  }
  return label;
}

// Maps each diatonic scale to its mode number (0 = Ionian … 6 = Locrian)
const DIATONIC_MODE_POSITION: Record<string, number> = {
  'Major (Ionian)': 0, 'Dorian': 1, 'Phrygian': 2, 'Lydian': 3,
  'Mixolydian': 4, 'Natural Minor (Aeolian)': 5, 'Locrian': 6,
};

// Returns the note within the current key that the target mode is rooted on,
// e.g. Lydian in D Natural Minor → Bb (the 4th degree of F major, D's relative major).
function getRelativeModeRoot(rootNote: string, scaleName: string, targetModeIdx: number): string | null {
  const scalePos = DIATONIC_MODE_POSITION[scaleName];
  if (scalePos === undefined) return null;
  const scaleData = (SCALES as Record<string, { intervals: number[] }>)[scaleName];
  if (!scaleData || scaleData.intervals.length < 7) return null;
  const degreeIdx = ((targetModeIdx - scalePos) + 7) % 7;
  return getNoteAtFret(rootNote, scaleData.intervals[degreeIdx]);
}

export function calculateFretboardDots(
  tuningName: string,
  rootNote: string,
  scaleName: string,
  capoPosition = 0,
  modeIndex: number | null = null
): FretDotData[] {
  const strings = (TUNINGS as Record<string, string[]>)[tuningName] ?? TUNINGS['Standard E'];
  const scaleNotes = getScaleNotes(rootNote, scaleName);

  // Parallel mode notes — same root, mode's own interval pattern
  const modeNotes: Set<string> | null =
    modeIndex !== null && modeIndex >= 0 && modeIndex < MODES.length
      ? (getScaleNotes(rootNote, MODES[modeIndex].scaleName) as Set<string>)
      : null;

  // Relative mode root — the note this mode is built on within the current key
  // e.g. Lydian in D Natural Minor → Bb
  const modeRootNote =
    modeIndex !== null && modeIndex >= 0 && modeIndex < MODES.length
      ? getRelativeModeRoot(rootNote, scaleName, modeIndex)
      : null;

  const dots: FretDotData[] = [];

  for (let stringIdx = 0; stringIdx < STRING_COUNT; stringIdx++) {
    const openNote = strings[stringIdx];
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      if (fret < capoPosition) continue;
      const note = getNoteAtFret(openNote, fret);
      let state: DotState | null = null;

      if (isRoot(note, rootNote)) {
        state = 'root';
      } else if (modeRootNote && isRoot(note, modeRootNote) && scaleNotes.has(note)) {
        state = 'mode-root'; // root of the selected mode within this key
      } else if (modeNotes && scaleNotes.has(note) && modeNotes.has(note)) {
        state = 'mode';      // in both scale and mode — highlighted
      } else if (scaleNotes.has(note)) {
        state = 'scale';     // in scale only — shown normally
      }

      if (state) {
        dots.push({ fret, string: stringIdx, state, note, cx: getDotCx(fret), cy: getDotCy(stringIdx) });
      }
    }
  }
  return dots;
}

export function calculateChordDots(
  intervals: number[],
  rootNote: string,
  tuningName: string,
  capoPosition = 0
): FretDotData[] {
  const strings = (TUNINGS as Record<string, string[]>)[tuningName] ?? TUNINGS['Standard E']
  const chordNotes = new Set(intervals.map(i => getNoteAtFret(rootNote, i % 12)))
  const dots: FretDotData[] = []

  for (let stringIdx = 0; stringIdx < STRING_COUNT; stringIdx++) {
    const openNote = strings[stringIdx]
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      if (fret < capoPosition) continue
      const note = getNoteAtFret(openNote, fret)
      if (isRoot(note, rootNote)) {
        dots.push({ fret, string: stringIdx, state: 'root', note, cx: getDotCx(fret), cy: getDotCy(stringIdx) })
      } else if (chordNotes.has(note)) {
        dots.push({ fret, string: stringIdx, state: 'scale', note, cx: getDotCx(fret), cy: getDotCy(stringIdx) })
      }
    }
  }
  return dots
}

export function calculateFreeformDots(
  marks: FreeformMark[],
  tuningName: string,
  capoPosition = 0
): FretDotData[] {
  const strings = (TUNINGS as Record<string, string[]>)[tuningName] ?? TUNINGS['Standard E'];
  return marks
    .filter(m => (m.fret === 0 || m.fret >= capoPosition) && m.fret >= 0 && m.fret <= FRET_COUNT && m.string >= 0 && m.string < STRING_COUNT)
    .map(m => ({
      fret: m.fret,
      string: m.string,
      state: 'freeform' as const,
      note: getNoteAtFret(strings[m.string], m.fret),
      cx: getDotCx(m.fret),
      cy: getDotCy(m.string),
    }));
}
