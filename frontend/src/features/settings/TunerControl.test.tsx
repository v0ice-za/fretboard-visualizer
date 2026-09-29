import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TunerControl from './TunerControl';
import { useTunerStore, DEFAULT_TUNER_STATE } from '@/stores/tunerStore';

// base-ui (Sheet) uses ResizeObserver internally — polyfill for jsdom
;(globalThis as Record<string, unknown>).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  useTunerStore.setState({ ...DEFAULT_TUNER_STATE });
});

function renderControl(onOpenChange = vi.fn()) {
  render(<TunerControl open onOpenChange={onOpenChange} />);
  return onOpenChange;
}

describe('TunerControl', () => {
  it('shows "Start Tuning" and no readout while stopped', () => {
    renderControl();
    expect(screen.getByRole('button', { name: /Start Tuning/i })).toBeInTheDocument();
    expect(screen.queryByText('Play a note…')).not.toBeInTheDocument();
  });

  it('Start Tuning sets isListening — button flips to Stop', async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole('button', { name: /Start Tuning/i }));
    expect(useTunerStore.getState().isListening).toBe(true);
    expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument();
  });

  it('shows "Play a note…" while listening with no detected note yet', () => {
    useTunerStore.setState({ isListening: true });
    renderControl();
    expect(screen.getByText('Play a note…')).toBeInTheDocument();
  });

  it('shows the detected note, octave, and cents', () => {
    useTunerStore.setState({
      isListening: true,
      detectedNote: { note: 'A', octave: 4, cents: 20, frequency: 445 },
    });
    renderControl();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('+20 cents')).toBeInTheDocument();
  });

  it('shows "in tune" at exactly 0 cents', () => {
    useTunerStore.setState({
      isListening: true,
      detectedNote: { note: 'E', octave: 2, cents: 0, frequency: 82.41 },
    });
    renderControl();
    expect(screen.getByText('in tune')).toBeInTheDocument();
  });

  it('shows a negative cents reading without a leading plus', () => {
    useTunerStore.setState({
      isListening: true,
      detectedNote: { note: 'G', octave: 4, cents: -1, frequency: 415 },
    });
    renderControl();
    expect(screen.getByText('-1 cents')).toBeInTheDocument();
  });

  it('shows the permission-denied error message and hides the readout', () => {
    useTunerStore.setState({ isListening: true, error: 'permission-denied' });
    renderControl();
    expect(screen.getByRole('alert')).toHaveTextContent(/Microphone access was denied/i);
    expect(screen.queryByText('Play a note…')).not.toBeInTheDocument();
  });

  it('closing the sheet stops listening', async () => {
    const onOpenChange = vi.fn();
    useTunerStore.setState({ isListening: true });
    render(<TunerControl open onOpenChange={onOpenChange} />);
    // Simulate the Sheet's own close (e.g. Escape/overlay click) by calling
    // the same onOpenChange(false) the Sheet would invoke.
    const user = userEvent.setup();
    await user.keyboard('{Escape}');
    expect(useTunerStore.getState().isListening).toBe(false);
  });
});
