import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetronomeControl from './MetronomeControl';
import { useMetronomeStore, DEFAULT_METRONOME_STATE, MIN_BPM, MAX_BPM } from '@/stores/metronomeStore';

// base-ui (Sheet) uses ResizeObserver internally — polyfill for jsdom
;(globalThis as Record<string, unknown>).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  useMetronomeStore.setState({ ...DEFAULT_METRONOME_STATE });
});

function renderControl(onOpenChange = vi.fn()) {
  render(<MetronomeControl open onOpenChange={onOpenChange} />);
  return onOpenChange;
}

describe('MetronomeControl', () => {
  it('shows the current tempo and beats per measure', () => {
    renderControl();
    expect(screen.getByText('100 BPM')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('Start toggles isPlaying and the button label flips to Stop', async () => {
    const user = userEvent.setup();
    renderControl();
    const startBtn = screen.getByRole('button', { name: 'Start' });
    await user.click(startBtn);
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('the + tempo button increases bpm by 1', async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
    expect(useMetronomeStore.getState().bpm).toBe(101);
    expect(screen.getByText('101 BPM')).toBeInTheDocument();
  });

  it('the − tempo button decreases bpm by 1', async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole('button', { name: 'Decrease tempo' }));
    expect(useMetronomeStore.getState().bpm).toBe(99);
  });

  it('tempo +/- buttons disable at the bpm bounds', () => {
    useMetronomeStore.setState({ bpm: MAX_BPM });
    renderControl();
    expect(screen.getByRole('button', { name: 'Increase tempo' })).toBeDisabled();
    act(() => {
      useMetronomeStore.setState({ bpm: MIN_BPM });
    });
    expect(screen.getByRole('button', { name: 'Decrease tempo' })).toBeDisabled();
  });

  it('adjusts beats per measure', async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole('button', { name: 'More beats per measure' }));
    expect(useMetronomeStore.getState().beatsPerMeasure).toBe(5);
    await user.click(screen.getByRole('button', { name: 'Fewer beats per measure' }));
    await user.click(screen.getByRole('button', { name: 'Fewer beats per measure' }));
    expect(useMetronomeStore.getState().beatsPerMeasure).toBe(3);
  });

  it('renders one beat-pulse dot per beatsPerMeasure', () => {
    useMetronomeStore.setState({ beatsPerMeasure: 3 });
    renderControl();
    expect(screen.getByRole('status', { name: 'Beat indicator' }).children).toHaveLength(3);
  });
});
