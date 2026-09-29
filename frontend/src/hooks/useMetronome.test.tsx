import { render, act } from '@testing-library/react';
import { useMetronome } from './useMetronome';
import { startMetronome } from '@/lib/metronome';
import { useMetronomeStore, DEFAULT_METRONOME_STATE } from '@/stores/metronomeStore';

vi.mock('@/lib/metronome', () => ({ startMetronome: vi.fn() }));

function Harness() {
  useMetronome();
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  useMetronomeStore.setState({ ...DEFAULT_METRONOME_STATE });
});

describe('useMetronome', () => {
  it('does not start the click loop while stopped', () => {
    render(<Harness />);
    expect(startMetronome).not.toHaveBeenCalled();
  });

  it('starts the click loop when isPlaying becomes true, with the current bpm/beatsPerMeasure', () => {
    const stop = vi.fn();
    (startMetronome as ReturnType<typeof vi.fn>).mockReturnValue({ stop });
    render(<Harness />);
    act(() => {
      useMetronomeStore.setState({ isPlaying: true, bpm: 90, beatsPerMeasure: 3 });
    });
    expect(startMetronome).toHaveBeenCalledWith(90, 3, expect.any(Function));
  });

  it('stops the previous loop and starts a new one when bpm changes while playing', () => {
    const stopA = vi.fn();
    const stopB = vi.fn();
    (startMetronome as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ stop: stopA })
      .mockReturnValueOnce({ stop: stopB });
    render(<Harness />);
    act(() => {
      useMetronomeStore.setState({ isPlaying: true, bpm: 100 });
    });
    act(() => {
      useMetronomeStore.setState({ bpm: 140 });
    });
    expect(stopA).toHaveBeenCalledTimes(1);
    expect(startMetronome).toHaveBeenNthCalledWith(2, 140, 4, expect.any(Function));
  });

  it('stops the click loop when isPlaying becomes false', () => {
    const stop = vi.fn();
    (startMetronome as ReturnType<typeof vi.fn>).mockReturnValue({ stop });
    render(<Harness />);
    act(() => {
      useMetronomeStore.setState({ isPlaying: true });
    });
    act(() => {
      useMetronomeStore.setState({ isPlaying: false });
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops the click loop on unmount', () => {
    const stop = vi.fn();
    (startMetronome as ReturnType<typeof vi.fn>).mockReturnValue({ stop });
    const { unmount } = render(<Harness />);
    act(() => {
      useMetronomeStore.setState({ isPlaying: true });
    });
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('the onBeat callback passed to startMetronome writes currentBeat back to the store', () => {
    (startMetronome as ReturnType<typeof vi.fn>).mockImplementation((_bpm, _beats, onBeat) => {
      onBeat(2);
      return { stop: vi.fn() };
    });
    render(<Harness />);
    act(() => {
      useMetronomeStore.setState({ isPlaying: true });
    });
    expect(useMetronomeStore.getState().currentBeat).toBe(2);
  });
});
