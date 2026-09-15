import { create } from 'zustand';

export interface FreeformMark {
  fret: number;
  string: number;
}

export interface FretboardState {
  tuning: string;
  rootNote: string;
  scaleName: string;
  modeIndex: number | null;
  capoPosition: number;
  freeformMarks: FreeformMark[];
  noteNamesVisible: boolean;
  freeformModeActive: boolean;
  chordName: string | null;
  chordRoot: string | null;
  setTuning: (tuning: string) => void;
  setRootNote: (rootNote: string) => void;
  setScaleName: (scaleName: string) => void;
  setModeIndex: (index: number | null) => void;
  setCapoPosition: (pos: number) => void;
  toggleFreeformMark: (mark: FreeformMark) => void;
  setFreeformMarks: (marks: FreeformMark[]) => void;
  setNoteNamesVisible: (visible: boolean) => void;
  setFreeformModeActive: (active: boolean) => void;
  setChordName: (name: string | null) => void;
  setChordRoot: (root: string | null) => void;
}

export const DEFAULT_FRETBOARD_STATE = {
  tuning: 'Standard E',
  rootNote: 'A',
  scaleName: 'Pentatonic Minor',
  modeIndex: null as number | null,
  capoPosition: 0,
  freeformMarks: [] as FreeformMark[],
  noteNamesVisible: false,
  freeformModeActive: false,
  chordName: null as string | null,
  chordRoot: null as string | null,
};

export const useFretboardStore = create<FretboardState>((set) => ({
  ...DEFAULT_FRETBOARD_STATE,
  setTuning: (tuning) => set({ tuning }),
  setRootNote: (rootNote) => set({ rootNote }),
  setScaleName: (scaleName) => set({ scaleName }),
  setModeIndex: (modeIndex) => set({ modeIndex }),
  setCapoPosition: (pos: number) => set({ capoPosition: Math.max(0, Math.min(12, pos)) }),
  toggleFreeformMark: (mark) =>
    set((state) => {
      if (mark.fret < 0 || mark.fret > 24 || mark.string < 0 || mark.string > 5) return state;
      const exists = state.freeformMarks.some(
        (m) => m.fret === mark.fret && m.string === mark.string
      );
      if (!exists && state.freeformMarks.length >= 150) return state;
      return {
        freeformMarks: exists
          ? state.freeformMarks.filter(
              (m) => !(m.fret === mark.fret && m.string === mark.string)
            )
          : [...state.freeformMarks, mark],
      };
    }),
  setFreeformMarks: (marks) => set({ freeformMarks: marks.slice(0, 150) }),
  setNoteNamesVisible: (noteNamesVisible) => set({ noteNamesVisible }),
  setFreeformModeActive: (freeformModeActive) => set({ freeformModeActive }),
  // Selecting/clearing a chord always resets chordRoot so a chord picked from the
  // standard Chord tab never inherits a leftover diatonic root (cross-feature
  // state-leak class from 4.4/4.5 reviews). The In-Key feature calls setChordRoot
  // AFTER setChordName to root a diatonic chord at its own degree.
  setChordName: (chordName) => set({ chordName, chordRoot: null }),
  setChordRoot: (chordRoot) => set({ chordRoot }),
}));
