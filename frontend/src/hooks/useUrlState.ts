import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { TUNINGS } from '@/data/tunings.js';
import { SCALES } from '@/data/scales.js';
import { CHORDS, CHORD_NAMES } from '@/data/chords.js';
import { FREE_TUNINGS } from '@/data/freeTunings';
import { FREE_TIER_CHORD_COUNT } from '@/features/library/ChordLibrary';
import { MODES } from '@/utils/fretboardUtils';

const ROOT_NOTE_RE = /^[A-G]#?$/;
const UINT_RE = /^\d+$/;

const FREE_CHORDS = new Set((CHORD_NAMES as string[]).slice(0, FREE_TIER_CHORD_COUNT));

interface GatedFromUrl {
  tuning?: string;
  chord?: { name: string; root: string };
}

export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTuning, setRootNote, setScaleName, setModeIndex, setCapoPosition, setNoteNamesVisible, setFreeformMarks, setChordName, setChordRoot, tuning, rootNote, scaleName, modeIndex, capoPosition, noteNamesVisible, freeformMarks, chordName, chordRoot } =
    useFretboardStore();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isPremium = useSubscriptionStore((s) => s.isPremium);

  // Premium-only values named in the URL, held back until entitlement is confirmed.
  // Everyone lands unauthenticated on a hard load (auth bootstraps from the refresh
  // cookie asynchronously), so "not premium yet" can't be read as "never premium":
  // the visible fallback is simply the default state, and these apply later if ever.
  const gatedRef = useRef<GatedFromUrl | null>(null);

  // Hydrate store from URL on mount only
  useEffect(() => {
    const urlTuning = searchParams.get('tuning');
    const urlKey = searchParams.get('key');
    const urlScale = searchParams.get('scale');
    const urlCapo = searchParams.get('capo');
    const gated: GatedFromUrl = {};

    // Matches only the static predefined TUNINGS — custom tuning names never resolve
    // from a URL (private per-account data).
    if (urlTuning && (TUNINGS as Record<string, string[]>)[urlTuning]) {
      if ((FREE_TUNINGS as readonly string[]).includes(urlTuning)) setTuning(urlTuning);
      else gated.tuning = urlTuning;
    }
    if (urlKey && ROOT_NOTE_RE.test(urlKey)) {
      setRootNote(urlKey);
    }
    if (urlScale && urlScale in (SCALES as Record<string, unknown>)) {
      setScaleName(urlScale);
    }
    if (urlCapo && UINT_RE.test(urlCapo)) {
      const parsed = Number(urlCapo);
      if (parsed >= 1 && parsed <= 12) setCapoPosition(parsed);
    }

    // Modes are independent of the selected scale (overlay notes come from
    // MODES[i].scaleName), so the index range is the only validity rule.
    const urlMode = searchParams.get('mode');
    if (urlMode && UINT_RE.test(urlMode)) {
      const parsed = Number(urlMode);
      if (parsed < MODES.length) setModeIndex(parsed);
    }

    const urlChord = searchParams.get('chord');
    const urlChordRoot = searchParams.get('croot');
    if (urlChord && urlChord in (CHORDS as Record<string, unknown>) && urlChordRoot && ROOT_NOTE_RE.test(urlChordRoot)) {
      if (FREE_CHORDS.has(urlChord)) {
        // setChordName resets chordRoot, so the root must be set second.
        setChordName(urlChord);
        setChordRoot(urlChordRoot);
      } else {
        gated.chord = { name: urlChord, root: urlChordRoot };
      }
    }

    const urlNotes = searchParams.get('notes');
    if (urlNotes === '1') setNoteNamesVisible(true);

    const urlMarks = searchParams.get('marks');
    if (urlMarks) {
      const seen = new Set<string>();
      const parsed = urlMarks.split(',').flatMap(pair => {
        const parts = pair.split('-');
        if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return [];
        const [f, s] = parts.map(Number);
        if (Number.isInteger(f) && Number.isInteger(s) && f >= 0 && f <= 24 && s >= 0 && s <= 5) {
          const key = `${f}-${s}`;
          if (seen.has(key)) return [];
          seen.add(key);
          return [{ fret: f, string: s }];
        }
        return [];
      });
      if (parsed.length > 0) setFreeformMarks(parsed);
    }

    if (gated.tuning || gated.chord) gatedRef.current = gated;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Apply URL-named premium values once, the first time entitlement is confirmed —
  // same ref-gated "fires once on gain" sequencing as useThemeGuard/useSessionSync.
  // A field the user already changed in the meantime is left alone.
  useEffect(() => {
    const gated = gatedRef.current;
    if (!gated || !isAuthenticated || !isPremium) return;
    gatedRef.current = null;

    const current = useFretboardStore.getState();
    if (gated.tuning && current.tuning === DEFAULT_FRETBOARD_STATE.tuning) {
      setTuning(gated.tuning);
    }
    if (gated.chord && current.chordName === null) {
      setChordName(gated.chord.name);
      setChordRoot(gated.chord.root);
    }
  }, [isAuthenticated, isPremium, setTuning, setChordName, setChordRoot]);

  // Push store state → URL on any change (replace so back/forward isn't flooded).
  // Reads from getState() so the effect always sees the post-hydration values even
  // on the initial mount run (hydration effect fires first and updates the store
  // synchronously before this effect body executes).
  useEffect(() => {
    const state = useFretboardStore.getState();
    const params: Record<string, string> = {
      tuning: state.tuning,
      key: state.rootNote,
      scale: state.scaleName,
    };
    if (state.capoPosition > 0) {
      params.capo = String(state.capoPosition);
    }
    if (state.modeIndex !== null) params.mode = String(state.modeIndex);
    if (state.chordName) {
      params.chord = state.chordName;
      params.croot = state.chordRoot ?? state.rootNote;
    }
    if (state.noteNamesVisible) params.notes = '1';
    if (state.freeformMarks.length > 0) {
      params.marks = state.freeformMarks.map(m => `${m.fret}-${m.string}`).join(',');
    }
    setSearchParams(params, { replace: true });
  }, [tuning, rootNote, scaleName, modeIndex, capoPosition, chordName, chordRoot, noteNamesVisible, freeformMarks, setSearchParams]);
}
