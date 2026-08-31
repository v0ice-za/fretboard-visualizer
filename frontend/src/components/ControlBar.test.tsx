import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ControlBar from './ControlBar';
import { FREE_TUNINGS } from '@/data/freeTunings';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { CHROMATIC_NOTES } from '@/data/notes.js';
import { SCALE_NAMES } from '@/data/scales.js';
import { TUNINGS } from '@/data/tunings.js';
import type { CustomTuning } from '@/types/api';

// Controllable custom-tuning data (name must start with "mock" for the vi.mock factory).
const mockState: { tunings: CustomTuning[] | undefined } = { tunings: undefined };
vi.mock('@/hooks/useCustomTunings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCustomTunings')>();
  return { ...actual, useCustomTunings: () => ({ data: mockState.tunings }) };
});

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
  useSubscriptionStore.setState({ isPremium: false });
  mockState.tunings = undefined;
});

const renderBar = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ControlBar />
    </QueryClientProvider>,
  );
};

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

describe('ControlBar — custom tunings (premium)', () => {
  const CUSTOM: CustomTuning = {
    id: 1, name: 'My Drop C', strings: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'], createdAt: null,
  };

  it('non-premium: no "Create Custom Tuning" item in the tuning select', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByLabelText('Tuning'));
    await screen.findByRole('option', { name: 'Standard E' });
    expect(screen.queryByRole('option', { name: /Create Custom Tuning/ })).not.toBeInTheDocument();
  });

  it('premium: shows saved custom tunings and the Create item', async () => {
    const user = userEvent.setup();
    useSubscriptionStore.setState({ isPremium: true });
    mockState.tunings = [CUSTOM];
    renderBar();
    await user.click(screen.getByLabelText('Tuning'));
    expect(await screen.findByRole('option', { name: 'My Drop C' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Create Custom Tuning/ })).toBeInTheDocument();
  });

  it('premium: selecting a custom tuning sets it as the active tuning', async () => {
    const user = userEvent.setup();
    useSubscriptionStore.setState({ isPremium: true });
    mockState.tunings = [CUSTOM];
    renderBar();
    await user.click(screen.getByLabelText('Tuning'));
    await user.click(await screen.findByRole('option', { name: 'My Drop C' }));
    expect(useFretboardStore.getState().tuning).toBe('My Drop C');
  });

  it('premium: selecting "Create Custom Tuning" opens the creator sheet', async () => {
    const user = userEvent.setup();
    useSubscriptionStore.setState({ isPremium: true });
    renderBar();
    await user.click(screen.getByLabelText('Tuning'));
    await user.click(await screen.findByRole('option', { name: /Create Custom Tuning/ }));
    expect(await screen.findByText('Create Custom Tuning')).toBeInTheDocument();
    // The active tuning must NOT change to the sentinel value.
    expect(useFretboardStore.getState().tuning).toBe('Standard E');
  });
});

describe('ControlBar — Library button', () => {
  it('clicking Library button sets sidePanel to true', async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole('button', { name: 'Library' }));
    expect(useLayoutStore.getState().activeLayout.sidePanel).toBe(true);
  });

  it('clicking Library button again sets sidePanel back to false', async () => {
    const user = userEvent.setup();
    useLayoutStore.setState({ activeLayout: { ...DEFAULT_LAYOUT, sidePanel: true } });
    renderBar();
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
