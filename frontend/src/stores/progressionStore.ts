import { create } from 'zustand';

export interface ProgressionChord {
  id: string;
  rootNote: string;
  chordName: string;
}

export interface ProgressionState {
  chords: ProgressionChord[];
  activeIndex: number | null;
  addChord: (rootNote: string, chordName: string) => void;
  removeChord: (id: string) => void;
  moveChord: (id: string, direction: 'up' | 'down') => void;
  setActiveIndex: (index: number | null) => void;
  next: () => void;
  prev: () => void;
  clear: () => void;
}

/** Guard against an unbounded list; a writing-tool progression is never this long. */
export const MAX_PROGRESSION_CHORDS = 32;

export const DEFAULT_PROGRESSION_STATE = {
  chords: [] as ProgressionChord[],
  activeIndex: null as number | null,
};

export const useProgressionStore = create<ProgressionState>((set) => ({
  ...DEFAULT_PROGRESSION_STATE,

  addChord: (rootNote, chordName) =>
    set((state) => {
      if (state.chords.length >= MAX_PROGRESSION_CHORDS) return state;
      return {
        chords: [...state.chords, { id: crypto.randomUUID(), rootNote, chordName }],
      };
    }),

  removeChord: (id) =>
    set((state) => {
      const idx = state.chords.findIndex((c) => c.id === id);
      if (idx === -1) return state;
      const chords = state.chords.filter((c) => c.id !== id);
      let activeIndex = state.activeIndex;
      if (chords.length === 0) {
        activeIndex = null;
      } else if (activeIndex !== null) {
        // Removed before the active chord → shift left to keep pointing at it.
        // Removed the active chord itself → clamp into the new range.
        // Removed after it → unchanged.
        if (idx < activeIndex) activeIndex -= 1;
        else if (idx === activeIndex) activeIndex = Math.min(activeIndex, chords.length - 1);
      }
      return { chords, activeIndex };
    }),

  moveChord: (id, direction) =>
    set((state) => {
      const idx = state.chords.findIndex((c) => c.id === id);
      if (idx === -1) return state;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= state.chords.length) return state; // boundary no-op
      const chords = [...state.chords];
      [chords[idx], chords[target]] = [chords[target], chords[idx]];
      // Keep activeIndex pointing at the same chord that visually moved.
      let activeIndex = state.activeIndex;
      if (activeIndex === idx) activeIndex = target;
      else if (activeIndex === target) activeIndex = idx;
      return { chords, activeIndex };
    }),

  setActiveIndex: (index) =>
    set((state) => {
      if (index === null) return { activeIndex: null };
      if (index < 0 || index >= state.chords.length) return state;
      return { activeIndex: index };
    }),

  next: () =>
    set((state) => {
      if (state.chords.length === 0) return { activeIndex: null };
      const current = state.activeIndex ?? -1; // null → start at 0
      return { activeIndex: Math.min(current + 1, state.chords.length - 1) };
    }),

  prev: () =>
    set((state) => {
      if (state.chords.length === 0) return { activeIndex: null };
      const current = state.activeIndex ?? 0;
      return { activeIndex: Math.max(current - 1, 0) };
    }),

  clear: () => set({ chords: [], activeIndex: null }),
}));
