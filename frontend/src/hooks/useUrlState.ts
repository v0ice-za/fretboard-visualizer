import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFretboardStore } from '@/stores/fretboardStore';
import { TUNINGS } from '@/data/tunings.js';
import { SCALES } from '@/data/scales.js';

const ROOT_NOTE_RE = /^[A-G]#?$/;

export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTuning, setRootNote, setScaleName, setCapoPosition, setNoteNamesVisible, setFreeformMarks, tuning, rootNote, scaleName, capoPosition, noteNamesVisible, freeformMarks } =
    useFretboardStore();

  // Hydrate store from URL on mount only
  useEffect(() => {
    const urlTuning = searchParams.get('tuning');
    const urlKey = searchParams.get('key');
    const urlScale = searchParams.get('scale');
    const urlCapo = searchParams.get('capo');

    if (urlTuning && (TUNINGS as Record<string, string[]>)[urlTuning]) {
      setTuning(urlTuning);
    }
    if (urlKey && ROOT_NOTE_RE.test(urlKey)) {
      setRootNote(urlKey);
    }
    if (urlScale && urlScale in (SCALES as Record<string, unknown>)) {
      setScaleName(urlScale);
    }
    if (urlCapo) {
      const parsed = parseInt(urlCapo, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        setCapoPosition(parsed);
      }
    }

    const urlNotes = searchParams.get('notes');
    if (urlNotes === '1') setNoteNamesVisible(true);

    const urlMarks = searchParams.get('marks');
    if (urlMarks) {
      const parsed = urlMarks.split(',').flatMap(pair => {
        const parts = pair.split('-');
        if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return [];
        const [f, s] = parts.map(Number);
        if (Number.isInteger(f) && Number.isInteger(s) && f >= 0 && f <= 24 && s >= 0 && s <= 5) {
          return [{ fret: f, string: s }];
        }
        return [];
      });
      if (parsed.length > 0) setFreeformMarks(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

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
    if (state.noteNamesVisible) params.notes = '1';
    if (state.freeformMarks.length > 0) {
      params.marks = state.freeformMarks.map(m => `${m.fret}-${m.string}`).join(',');
    }
    setSearchParams(params, { replace: true });
  }, [tuning, rootNote, scaleName, capoPosition, noteNamesVisible, freeformMarks, setSearchParams]);
}
