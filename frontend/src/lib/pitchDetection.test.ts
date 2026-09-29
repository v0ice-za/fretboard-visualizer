import { autoCorrelate, frequencyToNote } from './pitchDetection';

const SAMPLE_RATE = 44100;

/** A synthetic sine wave at `frequency`, `seconds` long, for exercising the
 *  autocorrelation detector against a known, exact pitch. */
function sineBuffer(frequency: number, seconds = 0.05, amplitude = 0.5): Float32Array {
  const n = Math.floor(SAMPLE_RATE * seconds);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    buf[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }
  return buf;
}

describe('autoCorrelate', () => {
  it('detects a 440Hz sine wave (A4) within 1%', () => {
    const detected = autoCorrelate(sineBuffer(440), SAMPLE_RATE);
    expect(detected).toBeGreaterThan(0);
    expect(Math.abs(detected - 440) / 440).toBeLessThan(0.01);
  });

  it('detects a low guitar E2 string (82.41Hz) within 1%', () => {
    const detected = autoCorrelate(sineBuffer(82.41, 0.1), SAMPLE_RATE);
    expect(detected).toBeGreaterThan(0);
    expect(Math.abs(detected - 82.41) / 82.41).toBeLessThan(0.01);
  });

  it('detects a high guitar E4 string (329.63Hz) within 1%', () => {
    const detected = autoCorrelate(sineBuffer(329.63), SAMPLE_RATE);
    expect(detected).toBeGreaterThan(0);
    expect(Math.abs(detected - 329.63) / 329.63).toBeLessThan(0.01);
  });

  it('returns -1 for silence', () => {
    const silence = new Float32Array(2048); // all zeros
    expect(autoCorrelate(silence, SAMPLE_RATE)).toBe(-1);
  });

  it('returns -1 for a buffer below the noise-floor amplitude', () => {
    const quiet = sineBuffer(440, 0.05, 0.001);
    expect(autoCorrelate(quiet, SAMPLE_RATE)).toBe(-1);
  });
});

describe('frequencyToNote', () => {
  it('440Hz is exactly A4 at 0 cents', () => {
    expect(frequencyToNote(440)).toEqual({ note: 'A', octave: 4, cents: 0, frequency: 440 });
  });

  it('82.41Hz is E2 (the guitar low E string)', () => {
    const result = frequencyToNote(82.41);
    expect(result?.note).toBe('E');
    expect(result?.octave).toBe(2);
  });

  it('445Hz reads as A4, +20 cents sharp', () => {
    expect(frequencyToNote(445)).toEqual({ note: 'A', octave: 4, cents: 20, frequency: 445 });
  });

  it('415Hz reads as G#4, -1 cent (just flat of Ab4)', () => {
    expect(frequencyToNote(415)).toEqual({ note: 'G#', octave: 4, cents: -1, frequency: 415 });
  });

  it('returns null for zero, negative, or non-finite frequency', () => {
    expect(frequencyToNote(0)).toBeNull();
    expect(frequencyToNote(-1)).toBeNull();
    expect(frequencyToNote(NaN)).toBeNull();
    expect(frequencyToNote(Infinity)).toBeNull();
  });
});
