/**
 * Web-Audio-clocked metronome click scheduler.
 *
 * Uses the standard "lookahead scheduler" pattern: a cheap `setInterval` tick
 * scans a short window ahead and schedules any due clicks against the audio
 * context's own sample-accurate clock, rather than relying on `setInterval`
 * timing directly for playback (which drifts under load). This is the
 * well-established fix for JS-timer jitter in Web Audio metronomes.
 *
 * Free feature — deliberately independent of the premium chord-audio gate in
 * `playChord.ts`; shares the app's single AudioContext (via
 * `getSharedAudioContext`) but uses its own gain node, so its volume is not
 * coupled to the premium chord-preview volume control.
 */
import { getSharedAudioContext } from './audioEngine';

const CLICK_SECONDS = 0.05;
const LOOKAHEAD_MS = 25; // scheduler tick interval
const SCHEDULE_AHEAD_SECONDS = 0.1; // how far past `now` to schedule audio events

export interface MetronomeHandle {
  stop: () => void;
}

/**
 * Starts the click loop at `bpm`, accenting beat 1 of every `beatsPerMeasure`.
 * `onBeat` fires (best-effort, scheduled via `setTimeout`) close to when each
 * beat actually sounds, so a caller can drive a visual pulse. Returns a handle
 * to stop the loop; a no-op handle if Web Audio is unavailable (SSR, jsdom,
 * locked-down browsers) — callers never need to guard.
 */
export function startMetronome(
  bpm: number,
  beatsPerMeasure: number,
  onBeat?: (beatIndex: number) => void
): MetronomeHandle {
  // Validate inputs to prevent division by zero and NaN propagation.
  if (!Number.isFinite(bpm) || bpm <= 0) {
    console.error('Metronome: BPM must be a positive number');
    return { stop: () => {} };
  }
  if (!Number.isFinite(beatsPerMeasure) || beatsPerMeasure <= 0) {
    console.error('Metronome: beatsPerMeasure must be a positive number');
    return { stop: () => {} };
  }

  const context = getSharedAudioContext();
  if (!context) return { stop: () => {} };

  // Check audio context is in a runnable state.
  if (context.state === 'closed') {
    console.error('Metronome: AudioContext is closed');
    return { stop: () => {} };
  }

  // Validate context.currentTime is valid (prevent NaN in scheduler).
  if (!Number.isFinite(context.currentTime)) {
    console.error('Metronome: Invalid audio context time');
    return { stop: () => {} };
  }

  const gain = context.createGain();
  gain.gain.value = 0.5;
  gain.connect(context.destination);

  let nextNoteTime = context.currentTime;
  let beatIndex = 0;
  let stopped = false;

  const scheduleClick = (time: number, accent: boolean) => {
    // Guard: do not schedule if the loop is stopped or context is closed.
    if (stopped || context.state === 'closed') return;
    try {
      const osc = context.createOscillator();
      osc.frequency.value = accent ? 1500 : 1000;
      const clickGain = context.createGain();
      clickGain.gain.setValueAtTime(accent ? 1 : 0.6, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_SECONDS);
      osc.connect(clickGain);
      clickGain.connect(gain);
      osc.start(time);
      osc.stop(time + CLICK_SECONDS);
    } catch {
      // Silence errors from oscillator scheduling (context closed, etc.).
    }
  };

  const tick = () => {
    if (stopped) return;
    const secondsPerBeat = 60 / bpm;
    while (nextNoteTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const beat = beatIndex % beatsPerMeasure;
      scheduleClick(nextNoteTime, beat === 0);
      if (onBeat) {
        const delayMs = Math.max(0, (nextNoteTime - context.currentTime) * 1000);
        setTimeout(() => {
          if (!stopped) onBeat(beat);
        }, delayMs);
      }
      nextNoteTime += secondsPerBeat;
      beatIndex++;
    }
  };

  tick();
  // Handle environments where setInterval is unavailable (jsdom, workers).
  const intervalId = typeof window !== 'undefined' && window.setInterval
    ? window.setInterval(tick, LOOKAHEAD_MS)
    : null;

  return {
    stop: () => {
      if (stopped) return; // Guard against multiple calls to stop().
      stopped = true;
      if (intervalId !== null && typeof window !== 'undefined' && window.clearInterval) {
        window.clearInterval(intervalId);
      }
      gain.disconnect();
    },
  };
}
