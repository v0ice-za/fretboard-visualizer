import { create } from 'zustand';
import type { DetectedNote } from '@/lib/pitchDetection';
import type { TunerErrorCode } from '@/lib/tunerEngine';

interface TunerState {
  isListening: boolean;
  detectedNote: DetectedNote | null;
  error: TunerErrorCode | null;
  setListening: (listening: boolean) => void;
  setDetectedNote: (note: DetectedNote | null) => void;
  setError: (error: TunerErrorCode | null) => void;
}

export const DEFAULT_TUNER_STATE = {
  isListening: false,
  detectedNote: null as DetectedNote | null,
  error: null as TunerErrorCode | null,
};

export const useTunerStore = create<TunerState>((set) => ({
  ...DEFAULT_TUNER_STATE,
  // Clear a stale error only when (re)starting — NOT when stopping. The hook
  // calls setError(code) then setListening(false) on a failed mic request;
  // if this cleared the error unconditionally, that message would be wiped
  // the instant it was set.
  setListening: (isListening) => set((state) => ({ isListening, error: isListening ? null : state.error })),
  setDetectedNote: (detectedNote) => set({ detectedNote }),
  setError: (error) => set({ error }),
}));
