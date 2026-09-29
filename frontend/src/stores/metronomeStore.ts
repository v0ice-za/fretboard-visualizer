import { create } from 'zustand';

export const MIN_BPM = 30;
export const MAX_BPM = 300;
export const DEFAULT_BPM = 100;
export const MIN_BEATS_PER_MEASURE = 1;
export const MAX_BEATS_PER_MEASURE = 12;
export const DEFAULT_BEATS_PER_MEASURE = 4;

interface MetronomeState {
  bpm: number;
  beatsPerMeasure: number;
  isPlaying: boolean;
  /** 0-indexed beat currently sounding, for a visual pulse. Not persisted. */
  currentBeat: number;
  setBpm: (bpm: number) => void;
  setBeatsPerMeasure: (n: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setCurrentBeat: (beat: number) => void;
}

export const DEFAULT_METRONOME_STATE = {
  bpm: DEFAULT_BPM,
  beatsPerMeasure: DEFAULT_BEATS_PER_MEASURE,
  isPlaying: false,
  currentBeat: 0,
};

export const useMetronomeStore = create<MetronomeState>((set, get) => ({
  ...DEFAULT_METRONOME_STATE,
  setBpm: (bpm) => set({ bpm: Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm))) }),
  setBeatsPerMeasure: (n) =>
    set({ beatsPerMeasure: Math.max(MIN_BEATS_PER_MEASURE, Math.min(MAX_BEATS_PER_MEASURE, Math.round(n))) }),
  setPlaying: (isPlaying) => set({ isPlaying, currentBeat: 0 }),
  togglePlaying: () => set({ isPlaying: !get().isPlaying, currentBeat: 0 }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
}));
