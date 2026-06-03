import { TUNINGS } from '@/data/tunings.js';
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

export type DotState = 'root' | 'scale' | 'mode' | 'freeform';

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

export function calculateFretboardDots(
  tuningName: string,
  rootNote: string,
  scaleName: string,
  capoPosition = 0,
  modeIndex: number | null = null
): FretDotData[] {
  const strings = (TUNINGS as Record<string, string[]>)[tuningName] ?? TUNINGS['Standard E'];
  const scaleNotes = getScaleNotes(rootNote, scaleName);

  let modeOnlyNotes: Set<string> | null = null;
  if (modeIndex !== null && modeIndex >= 0 && modeIndex < MODES.length) {
    const allModeNotes = getScaleNotes(rootNote, MODES[modeIndex].scaleName) as Set<string>;
    modeOnlyNotes = new Set([...allModeNotes].filter(n => !scaleNotes.has(n)));
  }

  const dots: FretDotData[] = [];

  for (let stringIdx = 0; stringIdx < STRING_COUNT; stringIdx++) {
    const openNote = strings[stringIdx];
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      if (fret < capoPosition) continue;
      const note = getNoteAtFret(openNote, fret);
      let state: DotState | null = null;
      if (isRoot(note, rootNote)) {
        state = 'root';
      } else if (scaleNotes.has(note)) {
        state = 'scale';
      } else if (modeOnlyNotes && modeOnlyNotes.has(note)) {
        state = 'mode';
      }
      // 'freeform' (Story 1.8) deferred
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
