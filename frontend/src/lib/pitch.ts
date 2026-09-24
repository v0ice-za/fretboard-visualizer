import { noteIndex } from '@/data/notes.js';

// MIDI convention: C-1 = 0, so C4 = 60 and A4 = 69 (concert pitch 440 Hz).
const A4_MIDI = 69;
const A4_HZ = 440;

/** Concert-pitch frequency (Hz) for a MIDI note number. */
export function midiToFrequency(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** Parse a note token that carries an explicit octave (e.g. "E2", "F#3", "Eb2")
 *  into a MIDI number. Returns null when there's no octave digit (a bare
 *  pitch-class like "E") or the token is unparseable. */
function parseExplicitMidi(token: string): number | null {
  const m = /^([A-Ga-g][#b]?)(-?\d+)$/.exec(token.trim());
  if (!m) return null;
  const pc = noteIndex(m[1]);
  if (pc === -1) return null;
  return pc + 12 * (parseInt(m[2], 10) + 1);
}

/**
 * Absolute MIDI note numbers for a tuning's open strings, low→high.
 *
 * Predefined tunings store pitch classes only (`['E','A','D','G','B','E']`) with
 * no octave, but audio needs absolute pitch. Real guitars are strung strictly
 * ascending, so we anchor the lowest string near octave 2 (standard low E → E2 =
 * MIDI 40) and place each higher string at the *nearest ascending* pitch of its
 * class. For Standard E this reconstructs E2·A2·D3·G3·B3·E4 exactly. Tokens that
 * already carry an octave (custom tunings, e.g. "E2") are honoured directly.
 */
export function openStringMidis(strings: string[]): number[] {
  const midis: number[] = [];
  for (let i = 0; i < strings.length; i++) {
    const explicit = parseExplicitMidi(strings[i]);
    if (explicit !== null) {
      midis.push(explicit);
      continue;
    }
    const pc = noteIndex(strings[i]);
    if (pc === -1) {
      // Defensive: unknown token → mirror the previous string (or a low E anchor).
      midis.push(midis[i - 1] ?? 40);
      continue;
    }
    if (i === 0) {
      midis.push(pc + 36); // octave-2 baseline: E(4)+36 = 40 = E2
    } else {
      const prev = midis[i - 1];
      let m = pc + 12 * Math.floor(prev / 12);
      while (m < prev) m += 12; // smallest pitch of this class at/above the lower string
      midis.push(m);
    }
  }
  return midis;
}

/**
 * Playable frequencies for a chord, voiced upward from its root in octave 3.
 * Interval offsets ≥ 12 (9ths/11ths/13ths) naturally voice into higher octaves.
 * Returns [] for an unknown root.
 */
export function chordFrequencies(root: string, intervals: number[]): number[] {
  const pc = noteIndex(root);
  if (pc === -1) return [];
  const rootMidi = pc + 48; // octave 3 (C3 = 48)
  return intervals.map((i) => midiToFrequency(rootMidi + i));
}

/**
 * Frequency of a single fretted (or open) note on a given string. `fret` is the
 * absolute fret number; an open string (fret 0) under a capo sounds at the capo.
 * Returns null for an out-of-range string index.
 */
export function stringFretFrequency(
  strings: string[],
  stringIdx: number,
  fret: number,
  capo = 0
): number | null {
  const base = openStringMidis(strings)[stringIdx];
  if (base === undefined) return null;
  const sounded = fret === 0 ? Math.max(0, capo) : fret;
  return midiToFrequency(base + sounded);
}
