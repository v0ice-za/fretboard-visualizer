import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlBar from './ControlBar';
import { FREE_TUNINGS } from '@/data/freeTunings';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { CHROMATIC_NOTES } from '@/data/notes.js';
import { SCALE_NAMES } from '@/data/scales.js';
import { TUNINGS } from '@/data/tunings.js';

// base-ui uses ResizeObserver internally — polyfill for jsdom
(globalThis as Record<string, unknown>).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const DEFAULT_LAYOUT = {
  topBar: true,
  modeRow: false,
  sidePanel: false,
  bottomBar: false,
  libraryMode: 'drawer' as const,
};

beforeEach(() => {
  useFretboardStore.setState({
    ...DEFAULT_FRETBOARD_STATE,
    freeformMarks: [],
    freeformModeActive: false,
  });
  useLayoutStore.setState({ activeLayout: DEFAULT_LAYOUT });
});

const renderBar = () => render(<ControlBar />);

describe('ControlBar', () => {
  it('renders without crashing', () => {
    renderBar();
    expect(screen.getByLabelText('Tuning')).toBeInTheDocument();
  });

  it('FREE_TUNINGS exports exactly 7 free-tier tuning names', () => {
    expect(FREE_TUNINGS).toHaveLength(7);
    expect(FREE_TUNINGS).toContain('Standard E');
    expect(FREE_TUNINGS).toContain('Drop D');
    expect(FREE_TUNINGS).toContain('Open G');
    expect(FREE_TUNINGS).toContain('Open E');
    expect(FREE_TUNINGS).toContain('DADGAD');
    expect(FREE_TUNINGS).toContain('Half Step Down');
    expect(FREE_TUNINGS).toContain('Open D');
  });

  it('TuningSelect does NOT include a premium tuning (Drop B absent)', () => {
    expect(FREE_TUNINGS).not.toContain('Drop B');
  });

  it('every FREE_TUNINGS name is a valid key in TUNINGS', () => {
    FREE_TUNINGS.forEach(name => {
      expect(Object.prototype.hasOwnProperty.call(TUNINGS, name)).toBe(true);
    });
  });

  it('KeySelect has 12 chromatic-note options when opened', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByLabelText('Key'));
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(CHROMATIC_NOTES.length); // 12
  });

  it('ScaleSelect renders at least one option when opened', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByLabelText('Scale'));
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(SCALE_NAMES.length);
  });

  it('selecting Drop D from TuningSelect updates the store', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByLabelText('Tuning'));
    await user.click(await screen.findByRole('option', { name: 'Drop D' }));
    expect(useFretboardStore.getState().tuning).toBe('Drop D');
  });

  it('clicking note-name toggle flips noteNamesVisible from false to true', async () => {
    const user = userEvent.setup();
    renderBar();
    expect(useFretboardStore.getState().noteNamesVisible).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Toggle note names' }));
    expect(useFretboardStore.getState().noteNamesVisible).toBe(true);
  });
});

describe('ControlBar — Library button', () => {
  it('clicking Library button sets sidePanel to true', async () => {
    const user = userEvent.setup();
    render(<ControlBar />);
    await user.click(screen.getByRole('button', { name: 'Library' }));
    expect(useLayoutStore.getState().activeLayout.sidePanel).toBe(true);
  });

  it('clicking Library button again sets sidePanel back to false', async () => {
    const user = userEvent.setup();
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } });
    render(<ControlBar />);
    await user.click(screen.getByRole('button', { name: 'Library' }));
    expect(useLayoutStore.getState().activeLayout.sidePanel).toBe(false);
  });
});

describe('ControlBar — capo control', () => {
  it('renders a container with aria-label="Capo position"', () => {
    renderBar();
    expect(screen.getByLabelText('Capo position')).toBeInTheDocument();
  });

  it('shows "Capo: None" when capoPosition is 0', () => {
    useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, capoPosition: 0 });
    renderBar();
    expect(screen.getByText('Capo: None')).toBeInTheDocument();
  });

  it('shows "Capo: 5" when capoPosition is 5', () => {
    useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, capoPosition: 5 });
    renderBar();
    expect(screen.getByText('Capo: 5')).toBeInTheDocument();
  });
});
