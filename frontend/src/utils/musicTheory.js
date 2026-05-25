import { CHROMATIC_NOTES, noteIndex, normalizeNote } from '../data/notes.js';
import { SCALES } from '../data/scales.js';

export function getNoteAtFret(openNote, fret) {
  const open = noteIndex(openNote);
  return CHROMATIC_NOTES[(open + fret) % 12];
}

export function getScaleNotes(rootNote, scaleName) {
  const scale = SCALES[scaleName];
  if (!scale) return new Set();
  const root = noteIndex(rootNote);
  return new Set(scale.intervals.map(i => CHROMATIC_NOTES[(root + i) % 12]));
}

export function isRoot(note, rootNote) {
  return normalizeNote(note) === normalizeNote(rootNote);
}

export function getIntervalName(semitones) {
  const names = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
  return names[semitones % 12] ?? '';
}

export function getNoteInterval(note, rootNote, scaleName) {
  const scale = SCALES[scaleName];
  if (!scale) return null;
  const root = noteIndex(rootNote);
  const n = noteIndex(note);
  const diff = (n - root + 12) % 12;
  return scale.intervals.includes(diff) ? diff : null;
}

// Standard fret marker positions
export const FRET_MARKERS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
export const DOUBLE_MARKERS = new Set([12, 24]);
