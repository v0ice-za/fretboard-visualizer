export const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Normalize enharmonic equivalents to sharps
const ENHARMONIC_MAP = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

export function normalizeNote(note) {
  return ENHARMONIC_MAP[note] ?? note;
}

export function noteIndex(note) {
  return CHROMATIC_NOTES.indexOf(normalizeNote(note));
}

export function noteAtSemitone(rootNote, semitones) {
  const root = noteIndex(rootNote);
  return CHROMATIC_NOTES[(root + semitones + 120) % 12];
}
