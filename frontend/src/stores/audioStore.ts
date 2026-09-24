import { create } from 'zustand';
import { setVolume as setEngineVolume } from '@/lib/audioEngine';

const STORAGE_KEY = 'guitar-app-audio';

interface AudioPrefs {
  /** Master sound on/off (premium feature; default off so nothing plays uninvited). */
  enabled: boolean;
  /** Output volume 0–1. */
  volume: number;
}

const DEFAULTS: AudioPrefs = { enabled: false, volume: 0.7 };

// localStorage can THROW (not just return null) in Safari private mode / sandboxed
// iframes / when site data is blocked — so every access is guarded (4.5 lesson).
function readPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      enabled: typeof p.enabled === 'boolean' ? p.enabled : DEFAULTS.enabled,
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
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  setVolume: (volume: number) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  ...readPrefs(),
  setEnabled: (enabled) => {
    set({ enabled });
    persist({ enabled, volume: get().volume });
  },
  toggleEnabled: () => {
    const enabled = !get().enabled;
    set({ enabled });
    persist({ enabled, volume: get().volume });
  },
  setVolume: (v) => {
    const volume = Math.max(0, Math.min(1, v));
    set({ volume });
    persist({ enabled: get().enabled, volume });
    setEngineVolume(volume);
  },
}));
