import { useEffect, useRef } from 'react';
import { useMetronomeStore } from '@/stores/metronomeStore';
import { startMetronome, type MetronomeHandle } from '@/lib/metronome';

/**
 * Wires the metronome store to the Web Audio click scheduler: starts/stops/
 * restarts the click loop whenever `isPlaying`, `bpm`, or `beatsPerMeasure`
 * change, and mirrors the currently-sounding beat back into the store so a
 * visual pulse can follow it. Mount once, high in the tree (like
 * `useProgressionPlayback`) — the metronome control just reads/writes the
 * store, it doesn't own the audio loop itself.
 */
export function useMetronome(): void {
  const isPlaying = useMetronomeStore((s) => s.isPlaying);
  const bpm = useMetronomeStore((s) => s.bpm);
  const beatsPerMeasure = useMetronomeStore((s) => s.beatsPerMeasure);
  const setCurrentBeat = useMetronomeStore((s) => s.setCurrentBeat);
  const handleRef = useRef<MetronomeHandle | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      handleRef.current?.stop();
      handleRef.current = null;
      return;
    }
    const handle = startMetronome(bpm, beatsPerMeasure, setCurrentBeat);
    handleRef.current = handle;
    return () => {
      handle.stop();
      handleRef.current = null;
    };
  }, [isPlaying, bpm, beatsPerMeasure, setCurrentBeat]);
}
