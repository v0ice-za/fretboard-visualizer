import { CHORDS, CHORD_NAMES } from '@/data/chords.js';
import { CHROMATIC_NOTES, noteIndex, noteAtSemitone } from '@/data/notes.js';

/** A chord identified by its root note + a `CHORDS` type key. Every ref this
 *  module emits is directly renderable: `setChordName(type)` then
 *  `setChordRoot(root)` highlights it on the board (same contract as 6.1). */
export interface ChordRef {
  root: string;
  type: string;
}

/** A shares-notes result: how many pitch classes it shares with the active
 *  chord, and whether its pitch-class set is *identical* (e.g. C6 ≡ Am7). */
export interface SharedChordRef extends ChordRef {
  sharedCount: number;
  sameNotes: boolean;
}

/** A substitution suggestion carrying a human-readable relationship label. */
export interface LabeledChordRef extends ChordRef {
  relation: string;
}

export type ChordFamily = 'major' | 'minor' | 'dominant' | 'diminished' | 'other';

const CHORD_DEFS = CHORDS as Record<string, { intervals: number[] }>;
const NAMES = CHORD_NAMES as string[];

const DEFAULT_MIN_SHARED = 2;
const DEFAULT_CAP = 24;

/** Pitch-class set (values 0–11) for a chord at a given root. Extension
 *  intervals (14/17/21) fold via `% 12`. Returns an empty set for an unknown
 *  root or type — callers treat that as "no active chord". */
export function pitchClassSet(root: string, chordType: string): Set<number> {
  const base = noteIndex(root);
  const def = CHORD_DEFS[chordType];
  if (base === -1 || !def) return new Set();
  return new Set(def.intervals.map((i) => (((base + i) % 12) + 12) % 12));
}

/** Classify a chord type by its interval signature (never by name string), so
 *  the whole 28-entry vocabulary is covered without a lookup table. Drives which
 *  substitutions are musically valid (relative for maj/min, tritone + ii–V for
 *  dominant). */
export function chordFamily(chordType: string): ChordFamily {
  const def = CHORD_DEFS[chordType];
  if (!def) return 'other';
  const s = new Set(def.intervals.map((i) => i % 12));
  const hasMaj3 = s.has(4);
  const hasMin3 = s.has(3);
  const hasDim5 = s.has(6);
  const hasDom7 = s.has(10);
  // Minor 3rd + diminished 5th → diminished family (Diminished, Diminished 7,
  // Minor 7♭5). Checked first so half-diminished never reads as a plain dominant.
  if (hasMin3 && hasDim5) return 'diminished';
  // Dominant ♭7 with a major 3rd (or no 3rd at all, i.e. 7sus4) → dominant.
  if (hasDom7 && (hasMaj3 || !hasMin3)) return 'dominant';
  if (hasMaj3) return 'major';
  if (hasMin3) return 'minor';
  return 'other';
}

/** Other library chords (any root × any type) that share ≥ `minShared` pitch
 *  classes with the active chord, ranked most-related first and capped. The
 *  active chord itself (same root AND type) is excluded. Ranking is a total,
 *  deterministic order so results are stable across runs (test-safe):
 *    1. shared-tone count desc
 *    2. overlap ratio (shared / candidate size) desc — favours tight matches
 *    3. root chromatic index asc
 *    4. CHORD_NAMES insertion index asc
 */
export function sharedNoteChords(
  root: string,
  chordType: string,
  opts: { minShared?: number; cap?: number } = {}
): SharedChordRef[] {
  const minShared = opts.minShared ?? DEFAULT_MIN_SHARED;
  const cap = opts.cap ?? DEFAULT_CAP;
  const active = pitchClassSet(root, chordType);
  if (active.size === 0) return [];
  const activeIdx = noteIndex(root);

  type Ranked = SharedChordRef & { ratio: number; rootIdx: number; typeIdx: number };
  const results: Ranked[] = [];

  for (let rootIdx = 0; rootIdx < 12; rootIdx++) {
    const candRoot = CHROMATIC_NOTES[rootIdx];
    for (let t = 0; t < NAMES.length; t++) {
      const candType = NAMES[t];
      if (rootIdx === activeIdx && candType === chordType) continue; // exclude self
      const pcs = pitchClassSet(candRoot, candType);
      let shared = 0;
      for (const pc of pcs) if (active.has(pc)) shared++;
      if (shared < minShared) continue;
      results.push({
        root: candRoot,
        type: candType,
        sharedCount: shared,
        sameNotes: pcs.size === active.size && shared === active.size,
        ratio: shared / pcs.size,
        rootIdx,
        typeIdx: t,
      });
    }
  }

  results.sort(
    (a, b) =>
      b.sharedCount - a.sharedCount ||
      b.ratio - a.ratio ||
      a.rootIdx - b.rootIdx ||
      a.typeIdx - b.typeIdx
  );

  return results
    .slice(0, cap)
    .map(({ root, type, sharedCount, sameNotes }) => ({ root, type, sharedCount, sameNotes }));
}

/** Per-family extension-upgrade chains (same root, richer type). Curated music
 *  theory — cannot be derived from intervals alone. Every target MUST be a real
 *  `CHORDS` key (enforced by a test). Keyed by the exact base type. */
const JAZZIFY_UPGRADES: Record<string, string[]> = {
  Major: ['Major 7', 'Major 6', 'Add 9', 'Major 9', 'Major 6/9', 'Major 13'],
  Minor: ['Minor 7', 'Minor 6', 'Minor Add 9', 'Minor 9', 'Minor 6/9', 'Minor 11'],
  'Dominant 7': ['Dominant 9', 'Dominant 13', 'Dominant 7♯5', 'Dominant 7♭5', 'Dominant 7sus4'],
  'Major 7': ['Major 9', 'Major 13', 'Major 6/9'],
  'Minor 7': ['Minor 9', 'Minor 11', 'Minor 6/9'],
};

/** Relative-substitution type, preserving the 7th where a natural sibling
 *  exists; any other maj/min-family type falls back to the plain triad. */
const RELATIVE_MINOR_TYPE: Record<string, string> = { Major: 'Minor', 'Major 7': 'Minor 7' };
const RELATIVE_MAJOR_TYPE: Record<string, string> = { Minor: 'Major', 'Minor 7': 'Major 7' };

/** Jazzier options for the active chord:
 *  - `upgrades`: same root, richer type (extension chains above).
 *  - `substitutions`: family-gated reharmonizations — relative maj/min,
 *    tritone sub and ii-of-V (dominant only). Never emits a wrong-key sub.
 */
export function jazzifySuggestions(
  root: string,
  chordType: string
): { upgrades: ChordRef[]; substitutions: LabeledChordRef[] } {
  const upgrades: ChordRef[] = [];
  const substitutions: LabeledChordRef[] = [];
  if (!CHORD_DEFS[chordType] || noteIndex(root) === -1) return { upgrades, substitutions };

  for (const target of JAZZIFY_UPGRADES[chordType] ?? []) {
    if (target !== chordType && CHORD_DEFS[target]) upgrades.push({ root, type: target });
  }

  switch (chordFamily(chordType)) {
    case 'major':
      substitutions.push({
        root: noteAtSemitone(root, -3),
        type: RELATIVE_MINOR_TYPE[chordType] ?? 'Minor',
        relation: 'Relative minor',
      });
      break;
    case 'minor':
      substitutions.push({
        root: noteAtSemitone(root, 3),
        type: RELATIVE_MAJOR_TYPE[chordType] ?? 'Major',
        relation: 'Relative major',
      });
      break;
    case 'dominant':
      // Tritone sub: same dominant colour a ♭5 away (G7 → D♭7).
      substitutions.push({
        root: noteAtSemitone(root, 6),
        type: chordType,
        relation: 'Tritone sub',
      });
      // ii-of-V framing: treat the active chord as V; its ii is a m7 a fifth up.
      substitutions.push({
        root: noteAtSemitone(root, 7),
        type: 'Minor 7',
        relation: 'ii of V',
      });
      break;
    default:
      break; // diminished / other → no safe generic substitution
  }

  return { upgrades, substitutions };
}
