import { useEffect, useRef } from 'react';
import { useTunerStore } from '@/stores/tunerStore';
import { startTuner, TunerAccessError, type TunerHandle } from '@/lib/tunerEngine';

/**
 * Wires the tuner store to the mic-capture engine: requests the microphone
 * and starts the detection loop when `isListening` becomes true, releases it
 * when `isListening` becomes false or the component unmounts. Mount once,
 * high in the tree (like `useMetronome`) — `TunerControl` only reads/writes
 * the store, it doesn't own the mic stream itself.
 *
 * `getUserMedia` is async and can be denied, so a `cancelled` flag guards
 * against setting state (or leaking a mic stream) if `isListening` flips back
 * to false again before the permission prompt resolves.
 */
export function useTuner(): void {
  const isListening = useTunerStore((s) => s.isListening);
  const setDetectedNote = useTunerStore((s) => s.setDetectedNote);
  const setListening = useTunerStore((s) => s.setListening);
  const setError = useTunerStore((s) => s.setError);
  const handleRef = useRef<TunerHandle | null>(null);

  useEffect(() => {
    if (!isListening) {
      handleRef.current?.stop();
      handleRef.current = null;
      return;
    }

    let cancelled = false;
    startTuner((note) => {
      if (!cancelled) setDetectedNote(note);
    })
      .then((handle) => {
        if (cancelled) {
          handle.stop();
          return;
        }
        handleRef.current = handle;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof TunerAccessError ? err.code : 'unknown');
        setListening(false);
      });

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [isListening, setDetectedNote, setError, setListening]);
}
