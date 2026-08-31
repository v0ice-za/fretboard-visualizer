import { useEffect, useRef } from 'react';
import { useProgressionStore } from '@/stores/progressionStore';
import { useFretboardStore } from '@/stores/fretboardStore';

/**
 * Drives the fretboard from the active progression chord and wires ←/→ stepping.
 *
 * The single writer into `fretboardStore` for progression playback: when a chord is
 * active it sets `rootNote` + `chordName` (the fretboard renders the shape from those —
 * see FretboardCanvas). Writing into the store and letting the canvas re-render from
 * synchronous state matches the architecture's "fretboard renders from Zustand state" rule.
 *
 * On first activation it snapshots the pre-playback `rootNote`/`chordName`; when playback
 * stops (progression cleared / deactivated) or the builder unmounts, it restores that
 * snapshot so the Scale Library view returns intact and never gets stranded on a chord.
 * If the user never stepped, it leaves the fretboard untouched.
 */
export function useProgressionPlayback() {
  const chords = useProgressionStore((s) => s.chords);
  const activeIndex = useProgressionStore((s) => s.activeIndex);
  const next = useProgressionStore((s) => s.next);
  const prev = useProgressionStore((s) => s.prev);

  const savedRef = useRef<{ rootNote: string; chordName: string | null } | null>(null);

  // Sync the active chord onto the fretboard; restore on stop.
  useEffect(() => {
    const entry = activeIndex !== null ? chords[activeIndex] : undefined;
    const fretboard = useFretboardStore.getState();
    if (entry) {
      if (savedRef.current === null) {
        savedRef.current = { rootNote: fretboard.rootNote, chordName: fretboard.chordName };
      }
      fretboard.setRootNote(entry.rootNote);
      fretboard.setChordName(entry.chordName);
    } else if (savedRef.current !== null) {
      // Was playing, now stopped (cleared / deactivated) → restore the snapshot.
      fretboard.setRootNote(savedRef.current.rootNote);
      fretboard.setChordName(savedRef.current.chordName);
      savedRef.current = null;
    }
  }, [activeIndex, chords]);

  // ←/→ step through the progression, unless focus is in a form control.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return;
        }
      }
      if (useProgressionStore.getState().chords.length === 0) return;
      e.preventDefault();
      if (e.key === 'ArrowRight') next();
      else prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  // On unmount, restore the pre-playback fretboard state if we ever took it over.
  useEffect(() => {
    return () => {
      if (savedRef.current) {
        const fretboard = useFretboardStore.getState();
        fretboard.setRootNote(savedRef.current.rootNote);
        fretboard.setChordName(savedRef.current.chordName);
        savedRef.current = null;
      }
    };
  }, []);
}
