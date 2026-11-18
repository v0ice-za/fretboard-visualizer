import { create } from 'zustand';

// Device-level display preferences. Deliberately NOT in fretboardStore: that store is
// URL-synced (useUrlState) and session-synced (useSessionSync), and handedness must be
// neither — it describes the viewer's instrument, not the shared fretboard state.
const STORAGE_KEY = 'guitar-app-left-handed';

interface Prefs {
  leftHanded: boolean;
}

const DEFAULTS: Prefs = { leftHanded: false };

// localStorage can THROW (not just return null) in Safari private mode / sandboxed
// iframes / when site data is blocked — so every access is guarded (4.5 lesson).
function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Prefs> | null;
    return { leftHanded: typeof p?.leftHanded === 'boolean' ? p.leftHanded : DEFAULTS.leftHanded };
  } catch {
    return DEFAULTS;
  }
}

function persist(p: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Non-fatal: preferences simply won't survive a reload.
  }
}

interface PreferencesState extends Prefs {
  setLeftHanded: (leftHanded: boolean) => void;
  toggleLeftHanded: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...readPrefs(),
  setLeftHanded: (leftHanded) => {
    set({ leftHanded });
    persist({ leftHanded });
  },
  toggleLeftHanded: () => get().setLeftHanded(!get().leftHanded),
}));
