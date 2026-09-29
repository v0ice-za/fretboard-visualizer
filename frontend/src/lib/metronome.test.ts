import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { startMetronome } from './metronome';
import { getSharedAudioContext } from './audioEngine';

vi.mock('./audioEngine', () => ({ getSharedAudioContext: vi.fn() }));

/** A minimal fake AudioContext exposing only what metronome.ts calls, with a
 *  manually-advanceable `currentTime` so scheduling can be driven in lockstep
 *  with fake timers (Web Audio's real clock runs independently of JS timers,
 *  which real code relies on — this fake reproduces just enough of that). */
function createFakeContext() {
  let currentTime = 0;
  const oscillators: { frequency: { value: number }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    get currentTime() {
      return currentTime;
    },
    destination: {},
    createGain: vi.fn(() => ({
      gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createOscillator: vi.fn(() => {
      const osc = { frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }),
  };
  return {
    context: context as unknown as AudioContext,
    oscillators,
    advance(seconds: number) {
      currentTime += seconds;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('startMetronome', () => {
  it('returns a no-op handle when Web Audio is unavailable', () => {
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const handle = startMetronome(120, 4);
    expect(() => handle.stop()).not.toThrow();
  });

  it('schedules the first beat immediately as an accent (beat 0)', () => {
    const { context, oscillators } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    startMetronome(100, 4);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].frequency.value).toBe(1500); // accent pitch
  });

  it('schedules subsequent beats as non-accent as real time advances', () => {
    const { context, oscillators, advance } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    startMetronome(100, 4); // 0.6s per beat
    advance(0.6);
    vi.advanceTimersByTime(25);
    expect(oscillators).toHaveLength(2);
    expect(oscillators[1].frequency.value).toBe(1000); // non-accent
  });

  it('re-accents on the first beat of the next measure', () => {
    const { context, oscillators, advance } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    startMetronome(100, 2); // 2 beats per measure, 0.6s per beat
    advance(0.6);
    vi.advanceTimersByTime(25); // beat 1 (non-accent)
    advance(0.6);
    vi.advanceTimersByTime(25); // beat 0 of measure 2 (accent again)
    expect(oscillators.map((o) => o.frequency.value)).toEqual([1500, 1000, 1500]);
  });

  it('onBeat fires with the beat index modulo beatsPerMeasure', () => {
    const { context, advance } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const onBeat = vi.fn();
    startMetronome(100, 2, onBeat);
    vi.advanceTimersByTime(1); // let the immediate setTimeout(delay=0) fire
    expect(onBeat).toHaveBeenCalledWith(0);
    advance(0.6);
    vi.advanceTimersByTime(25);
    expect(onBeat).toHaveBeenCalledWith(1);
  });

  it('stop() halts scheduling — no further oscillators or onBeat calls after stopping', () => {
    const { context, oscillators, advance } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const onBeat = vi.fn();
    const handle = startMetronome(100, 4, onBeat);
    advance(0.6);
    vi.advanceTimersByTime(25);
    const countAtStop = oscillators.length;
    handle.stop();
    onBeat.mockClear();
    advance(5); // plenty of time for many more beats if scheduling continued
    vi.advanceTimersByTime(1000);
    expect(oscillators).toHaveLength(countAtStop);
    expect(onBeat).not.toHaveBeenCalled();
  });
});
