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
  setTuning: (tuning: string) => void;
  setRootNote: (rootNote: string) => void;
  setScaleName: (scaleName: string) => void;
  setModeIndex: (index: number | null) => void;
  setCapoPosition: (pos: number) => void;
  toggleFreeformMark: (mark: FreeformMark) => void;
  setNoteNamesVisible: (visible: boolean) => void;
  setFreeformModeActive: (active: boolean) => void;
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
      const exists = state.freeformMarks.some(
        (m) => m.fret === mark.fret && m.string === mark.string
      );
      return {
        freeformMarks: exists
          ? state.freeformMarks.filter(
              (m) => !(m.fret === mark.fret && m.string === mark.string)
            )
          : [...state.freeformMarks, mark],
      };
    }),
  setNoteNamesVisible: (noteNamesVisible) => set({ noteNamesVisible }),
  setFreeformModeActive: (freeformModeActive) => set({ freeformModeActive }),
}));
