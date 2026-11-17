import { create } from 'zustand';
import { setVolume as setEngineVolume } from '@/lib/audioEngine';

const STORAGE_KEY = 'guitar-app-audio';

interface AudioPrefs {
  /** Output volume 0–1. */
  volume: number;
}

const DEFAULTS: AudioPrefs = { volume: 0.7 };

// localStorage can THROW (not just return null) in Safari private mode / sandboxed
// iframes / when site data is blocked — so every access is guarded (4.5 lesson).
function readPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    // Older versions also persisted `enabled` (the Sound toggle, retired in Story 7.2 —
    // audio is now opt-in per click, never a standing on/off switch). Ignore it if
    // present rather than erroring, so a pre-7.2 localStorage value still hydrates volume.
    const p = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      volume:
        typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1
          ? p.volume
          : DEFAULTS.volume,
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(p: AudioPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Non-fatal: preferences simply won't survive a reload.
  }
}

interface AudioState extends AudioPrefs {
  setVolume: (volume: number) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  ...readPrefs(),
  setVolume: (v) => {
    const volume = Math.max(0, Math.min(1, v));
    set({ volume });
    persist({ volume });
    setEngineVolume(volume);
  },
}));
