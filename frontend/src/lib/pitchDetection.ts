/**
 * Pure pitch-detection math for the chromatic tuner — no Web Audio dependency,
 * so it's directly testable with synthetic sample buffers.
 */
import { CHROMATIC_NOTES } from '@/data/notes.js';

const A4_FREQUENCY = 440;
const A4_MIDI_NUMBER = 69;
const RMS_SILENCE_THRESHOLD = 0.01;

/**
 * Autocorrelation pitch detector (the standard technique for monophonic
 * signals like a single plucked guitar string). Trims low-amplitude edges
 * from the buffer first, correlates the signal against shifted copies of
 * itself to find the repeating period, then refines that period with
 * parabolic interpolation between the 3 samples around the correlation peak
 * for sub-sample accuracy. Returns -1 when the buffer is too quiet to
 * confidently detect a pitch (silence, noise floor) or no clear period is
 * found.
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  // Validate inputs to prevent division by zero and invalid results.
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return -1;

  const size = buffer.length;

  let rms = 0;
  for (let i = 0; i < size; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / size);
  if (rms < RMS_SILENCE_THRESHOLD) return -1;

  // Trim near-silent leading/trailing edges so the correlation window is
  // centered on genuine signal. Threshold of 0.2 (~-14dB) filters noise floor
  // while retaining soft plucks. Increase if signal is weak; decrease if false positives.
  const threshold = 0.2;
  let start = 0;
  let end = size - 1;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) >= threshold) {
      start = i;
      break;
    }
  }
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[size - 1 - i]) >= threshold) {
      end = size - 1 - i;
      break;
    }
  }
  const trimmed = buffer.subarray(start, end + 1);
  const n = trimmed.length;
  if (n < 8) return -1;

  const correlations = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    correlations[lag] = sum;
  }

  // Skip the initial downslope from lag 0 (always the highest, trivial,
  // correlation) to find the first genuine peak after it.
  let d = 0;
  while (d < n - 1 && correlations[d] > correlations[d + 1]) d++;

  let maxValue = -Infinity;
  let maxLag = -1;
  for (let lag = d; lag < n; lag++) {
    if (correlations[lag] > maxValue) {
      maxValue = correlations[lag];
      maxLag = lag;
    }
  }
  if (maxLag <= 0 || maxLag >= n - 1) return -1;

  // Parabolic interpolation around the peak for sub-sample period accuracy.
  const y1 = correlations[maxLag - 1];
  const y2 = correlations[maxLag];
  const y3 = correlations[maxLag + 1];
  const a = (y1 + y3 - 2 * y2) / 2;
  const b = (y3 - y1) / 2;
  const refinedLag = a !== 0 ? maxLag - b / (2 * a) : maxLag;

  if (refinedLag <= 0) return -1;
  return sampleRate / refinedLag;
}

export interface DetectedNote {
  note: string;
  octave: number;
  /** Cents deviation from the nearest note's exact pitch, in [-50, 50]. */
  cents: number;
  frequency: number;
}

/**
 * Maps a frequency to the nearest chromatic note, its octave, and how many
 * cents sharp (+) or flat (-) the input is from that note's exact pitch.
 * Returns null for a non-positive/invalid frequency (the "no pitch detected"
 * case from `autoCorrelate`).
 */
export function frequencyToNote(frequency: number): DetectedNote | null {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;

  const midiNumber = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI_NUMBER;
  const rounded = Math.round(midiNumber);
  let cents = Math.round((midiNumber - rounded) * 100);
  // Clamp cents to [-50, 50] range (should always be true, but guard against rounding errors).
  cents = Math.max(-50, Math.min(50, cents));

  // Validate CHROMATIC_NOTES is array-like before indexing.
  const noteIndex = ((rounded % 12) + 12) % 12;
  const note = Array.isArray(CHROMATIC_NOTES) ? CHROMATIC_NOTES[noteIndex] : 'C';
  const octave = Math.floor(rounded / 12) - 1;

  return { note, octave, cents, frequency };
}
