import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { startTuner } from './tunerEngine';
import { getSharedAudioContext } from './audioEngine';
import { autoCorrelate, frequencyToNote } from './pitchDetection';

vi.mock('./audioEngine', () => ({ getSharedAudioContext: vi.fn() }));
vi.mock('./pitchDetection', () => ({ autoCorrelate: vi.fn(), frequencyToNote: vi.fn() }));

function createFakeContext(sampleRate = 44100) {
  const analyser = { fftSize: 0, getFloatTimeDomainData: vi.fn() };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    sampleRate,
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
  };
  return { context: context as unknown as AudioContext, analyser, source };
}

function createFakeStream() {
  const track = { stop: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track };
}

let rafCallback: FrameRequestCallback | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  rafCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('startTuner', () => {
  it('rejects with "unsupported" when getUserMedia is unavailable', async () => {
    vi.stubGlobal('navigator', { mediaDevices: {} });
    await expect(startTuner(vi.fn())).rejects.toMatchObject({ code: 'unsupported' });
  });

  it('rejects with "unsupported" when there is no shared AudioContext', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(startTuner(vi.fn())).rejects.toMatchObject({ code: 'unsupported' });
  });

  it('rejects with "permission-denied" when the user denies mic access', async () => {
    const { context } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    await expect(startTuner(vi.fn())).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rejects with "no-device" when no microphone exists', async () => {
    const { context } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('none', 'NotFoundError'));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    await expect(startTuner(vi.fn())).rejects.toMatchObject({ code: 'no-device' });
  });

  it('rejects with "unknown" for any other getUserMedia failure', async () => {
    const { context } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const getUserMedia = vi.fn().mockRejectedValue(new Error('boom'));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    await expect(startTuner(vi.fn())).rejects.toMatchObject({ code: 'unknown' });
  });

  it('on success, immediately runs one detection pass and calls onUpdate', async () => {
    const { context, analyser } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const { stream } = createFakeStream();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    (autoCorrelate as ReturnType<typeof vi.fn>).mockReturnValue(440);
    (frequencyToNote as ReturnType<typeof vi.fn>).mockReturnValue({ note: 'A', octave: 4, cents: 0, frequency: 440 });

    const onUpdate = vi.fn();
    await startTuner(onUpdate);

    expect(analyser.getFloatTimeDomainData).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ note: 'A', octave: 4, cents: 0, frequency: 440 });
  });

  it('calls onUpdate(null) when autoCorrelate finds no pitch', async () => {
    const { context } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const { stream } = createFakeStream();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    (autoCorrelate as ReturnType<typeof vi.fn>).mockReturnValue(-1);

    const onUpdate = vi.fn();
    await startTuner(onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(null);
    expect(frequencyToNote).not.toHaveBeenCalled();
  });

  it('stop() cancels the animation frame loop, disconnects the source, and stops mic tracks', async () => {
    const { context, source } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const { stream, track } = createFakeStream();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    (autoCorrelate as ReturnType<typeof vi.fn>).mockReturnValue(-1);

    const handle = await startTuner(vi.fn());
    handle.stop();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(source.disconnect).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it('stop() is safe to call twice', async () => {
    const { context } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const { stream, track } = createFakeStream();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    (autoCorrelate as ReturnType<typeof vi.fn>).mockReturnValue(-1);

    const handle = await startTuner(vi.fn());
    handle.stop();
    handle.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it('does not call onUpdate again after stop() even if a frame was already scheduled', async () => {
    const { context } = createFakeContext();
    (getSharedAudioContext as ReturnType<typeof vi.fn>).mockReturnValue(context);
    const { stream } = createFakeStream();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    (autoCorrelate as ReturnType<typeof vi.fn>).mockReturnValue(-1);

    const onUpdate = vi.fn();
    const handle = await startTuner(onUpdate);
    onUpdate.mockClear();
    handle.stop();
    // The rAF loop scheduled a next frame before stopping; firing it manually
    // must be a no-op now that `stopped` is true.
    rafCallback?.(0);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
