import { render, act, waitFor } from '@testing-library/react';
import { useTuner } from './useTuner';
import { startTuner, TunerAccessError } from '@/lib/tunerEngine';
import { useTunerStore, DEFAULT_TUNER_STATE } from '@/stores/tunerStore';

vi.mock('@/lib/tunerEngine', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tunerEngine')>('@/lib/tunerEngine');
  return { ...actual, startTuner: vi.fn() };
});

function Harness() {
  useTuner();
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  useTunerStore.setState({ ...DEFAULT_TUNER_STATE });
});

describe('useTuner', () => {
  it('does not request the microphone while not listening', () => {
    render(<Harness />);
    expect(startTuner).not.toHaveBeenCalled();
  });

  it('requests the microphone when isListening becomes true', async () => {
    const stop = vi.fn();
    (startTuner as ReturnType<typeof vi.fn>).mockResolvedValue({ stop });
    render(<Harness />);
    act(() => {
      useTunerStore.setState({ isListening: true });
    });
    await waitFor(() => expect(startTuner).toHaveBeenCalledTimes(1));
  });

  it('writes detected notes from the onUpdate callback into the store', async () => {
    (startTuner as ReturnType<typeof vi.fn>).mockImplementation(async (onUpdate) => {
      onUpdate({ note: 'E', octave: 2, cents: 0, frequency: 82.41 });
      return { stop: vi.fn() };
    });
    render(<Harness />);
    act(() => {
      useTunerStore.setState({ isListening: true });
    });
    await waitFor(() =>
      expect(useTunerStore.getState().detectedNote).toEqual({ note: 'E', octave: 2, cents: 0, frequency: 82.41 }),
    );
  });

  it('stops the mic when isListening becomes false', async () => {
    const stop = vi.fn();
    (startTuner as ReturnType<typeof vi.fn>).mockResolvedValue({ stop });
    render(<Harness />);
    act(() => {
      useTunerStore.setState({ isListening: true });
    });
    await waitFor(() => expect(startTuner).toHaveBeenCalledTimes(1));
    act(() => {
      useTunerStore.setState({ isListening: false });
    });
    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  it('stops the mic on unmount', async () => {
    const stop = vi.fn();
    (startTuner as ReturnType<typeof vi.fn>).mockResolvedValue({ stop });
    const { unmount } = render(<Harness />);
    act(() => {
      useTunerStore.setState({ isListening: true });
    });
    await waitFor(() => expect(startTuner).toHaveBeenCalledTimes(1));
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('on mic access failure, sets the error code and turns isListening back off', async () => {
    (startTuner as ReturnType<typeof vi.fn>).mockRejectedValue(new TunerAccessError('permission-denied'));
    render(<Harness />);
    act(() => {
      useTunerStore.setState({ isListening: true });
    });
    await waitFor(() => expect(useTunerStore.getState().isListening).toBe(false));
    expect(useTunerStore.getState().error).toBe('permission-denied');
  });

  it('maps a non-TunerAccessError rejection to the "unknown" error code', async () => {
    (startTuner as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    render(<Harness />);
    act(() => {
      useTunerStore.setState({ isListening: true });
    });
    await waitFor(() => expect(useTunerStore.getState().error).toBe('unknown'));
  });

  it('does not leak the mic stream if isListening flips off before getUserMedia resolves', async () => {
    const stop = vi.fn();
    let resolveStart!: (handle: { stop: () => void }) => void;
    (startTuner as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveStart = resolve;
      }),
    );
    render(<Harness />);
    act(() => {
      useTunerStore.setState({ isListening: true });
    });
    act(() => {
      useTunerStore.setState({ isListening: false });
    });
    // Permission prompt resolves late, after the user already backed out.
    await act(async () => {
      resolveStart({ stop });
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
