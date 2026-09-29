/**
 * Chromatic tuner engine: microphone capture + a `requestAnimationFrame` loop
 * feeding live samples through `autoCorrelate`/`frequencyToNote`.
 *
 * Free feature — reuses the app's single shared `AudioContext` (via
 * `getSharedAudioContext`) but owns its own capture graph. Always releases
 * the microphone (`MediaStreamTrack.stop()`) when stopped, not just on
 * disconnect, so the browser's mic-in-use indicator clears promptly.
 */
import { getSharedAudioContext } from './audioEngine';
import { autoCorrelate, frequencyToNote, type DetectedNote } from './pitchDetection';

const FFT_SIZE = 2048;

export type TunerErrorCode = 'permission-denied' | 'no-device' | 'unsupported' | 'unknown';

export class TunerAccessError extends Error {
  code: TunerErrorCode;
  constructor(code: TunerErrorCode) {
    super(code);
    this.code = code;
  }
}

export interface TunerHandle {
  stop: () => void;
}

function normalizeGetUserMediaError(err: unknown): TunerAccessError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return new TunerAccessError('permission-denied');
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return new TunerAccessError('no-device');
    }
  }
  return new TunerAccessError('unknown');
}

/**
 * Requests microphone access and starts the detection loop, calling
 * `onUpdate` with the detected note on every animation frame (or `null` when
 * the input is too quiet/ambiguous to read a pitch). Rejects with a
 * `TunerAccessError` when the microphone can't be used (permission denied,
 * no device, or Web Audio/getUserMedia unsupported) — callers should map
 * `error.code` to user-facing copy rather than a raw error message.
 */
export async function startTuner(onUpdate: (note: DetectedNote | null) => void): Promise<TunerHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new TunerAccessError('unsupported');
  }
  const context = getSharedAudioContext();
  if (!context) throw new TunerAccessError('unsupported');

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    throw normalizeGetUserMediaError(err);
  }

  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;

  // Validate and correct FFT size in case the context constrains it.
  const actualFFTSize = analyser.fftSize;
  if (actualFFTSize !== FFT_SIZE) {
    console.warn(`Analyser FFT size adjusted from ${FFT_SIZE} to ${actualFFTSize}`);
  }

  try {
    source.connect(analyser);
  } catch (err) {
    throw new TunerAccessError('unsupported');
  }

  // Use actual FFT size for buffer allocation to match analyser output.
  const buffer = new Float32Array(actualFFTSize);
  let stopped = false;
  let rafId = 0;

  const loop = () => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(buffer);
    const freq = autoCorrelate(buffer, context.sampleRate);
    try {
      onUpdate(freq > 0 ? frequencyToNote(freq) : null);
    } catch (e) {
      console.error('Tuner onUpdate callback threw:', e);
      // Continue looping; do not crash the detection loop.
    }
    rafId = requestAnimationFrame(loop);
  };
  loop();

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      source.disconnect();
      // Stop tracks safely. Only call stop() if readyState exists and is live,
      // or if readyState is undefined (missing in mocks), call stop anyway.
      stream.getTracks().forEach((track) => {
        if (typeof track.readyState === 'undefined' || track.readyState === 'live') {
          track.stop();
        }
      });
    },
  };
}
