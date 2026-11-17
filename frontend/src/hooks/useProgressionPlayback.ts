import { useEffect, useRef } from 'react';
import { useProgressionStore } from '@/stores/progressionStore';
import { useFretboardStore } from '@/stores/fretboardStore';

/**
 * Drives the fretboard from the active progression chord and wires ←/→ stepping.
 *
 * The single writer into `fretboardStore` for progression playback: when a chord is
 * active it sets `chordName` + `chordRoot` (the fretboard renders the shape from those —
 * see FretboardCanvas). It never touches `rootNote`: that's the selected KEY, which must
 * stay fixed so the key-root rings, Diatonic list, URL `?key=`, and preset transposition
 * all keep referring to it while the chords change (Story 7.1).
 *
 * On first activation it snapshots the pre-playback `chordName`/`chordRoot`; when playback
 * stops (progression cleared / deactivated) or the builder unmounts, it restores that
 * snapshot so the previous view returns intact and never gets stranded on a chord.
 * If the user never stepped, it leaves the fretboard untouched.
 */
export function useProgressionPlayback() {
  const chords = useProgressionStore((s) => s.chords);
  const activeIndex = useProgressionStore((s) => s.activeIndex);

  // Snapshot type mirrors fretboardStore, whose `chordName`/`chordRoot` are legitimately
  // `string | null` (null = scale view / rooted on the key). Intentionally wider than
  // ProgressionChord's fields.
  const savedRef = useRef<{ chordName: string | null; chordRoot: string | null } | null>(null);

  // Sync the active chord onto the fretboard; restore on stop.
  useEffect(() => {
    const entry =
      activeIndex !== null && activeIndex < chords.length ? chords[activeIndex] : undefined;
    const fretboard = useFretboardStore.getState();
    if (entry) {
      if (savedRef.current === null) {
        savedRef.current = { chordName: fretboard.chordName, chordRoot: fretboard.chordRoot };
      }
      // setChordName resets chordRoot, so it must come first.
      fretboard.setChordName(entry.chordName);
      fretboard.setChordRoot(entry.rootNote);
      // Stepping only drives the display — it NEVER plays audio (Story 7.2). The
      // "Play current chord" button in ProgressionBuilder is the only explicit trigger.
    } else if (savedRef.current !== null) {
      // Was playing, now stopped (cleared / deactivated) → restore the snapshot.
      fretboard.setChordName(savedRef.current.chordName);
      fretboard.setChordRoot(savedRef.current.chordRoot);
      savedRef.current = null;
    }
  }, [activeIndex, chords]);

  // ←/→ step through the progression, unless focus is in a form control.
  // Reads store actions via getState() so the listener is registered exactly once.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return;
        }
      }
      const store = useProgressionStore.getState();
      if (store.chords.length === 0) return;
      e.preventDefault();
      if (e.key === 'ArrowRight') store.next();
      else store.prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // On unmount, restore the pre-playback fretboard state if we ever took it over
  // (savedRef stays null when the user opened the builder but never stepped).
  useEffect(() => {
    return () => {
      if (savedRef.current) {
        const fretboard = useFretboardStore.getState();
        fretboard.setChordName(savedRef.current.chordName);
        fretboard.setChordRoot(savedRef.current.chordRoot);
        savedRef.current = null;
      }
    };
  }, []);
}
