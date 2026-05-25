import { TUNINGS } from '@/data/tunings.js';
import { getNoteAtFret, getScaleNotes, isRoot, FRET_MARKERS, DOUBLE_MARKERS } from '@/utils/musicTheory.js';

export type DotState = 'root' | 'scale' | 'mode' | 'freeform';

export interface FretDotData {
  fret: number;    // 0 (open string) to 24
  string: number;  // 0 (low E / thickest) to 5 (high e / thinnest)
  state: DotState;
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

// Y center for a string index
export function getDotCy(stringIdx: number): number {
  return STRING_Y[stringIdx];
}

export function generateAriaLabel(tuning: string, rootNote: string, scaleName: string): string {
  return `${rootNote} ${scaleName} scale on ${tuning} tuning`;
}

export function calculateFretboardDots(
  tuningName: string,
  rootNote: string,
  scaleName: string,
  capoPosition = 0
): FretDotData[] {
  const strings = (TUNINGS as Record<string, string[]>)[tuningName] ?? TUNINGS['Standard E'];
  const scaleNotes = getScaleNotes(rootNote, scaleName);
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
      }
      // 'mode' (Story 1.6) and 'freeform' (Story 1.8) deferred
      if (state) {
        dots.push({ fret, string: stringIdx, state, cx: getDotCx(fret), cy: getDotCy(stringIdx) });
      }
    }
  }
  return dots;
}
