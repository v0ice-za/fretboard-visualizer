import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ControlBar from './ControlBar';
import { FREE_TUNINGS } from '@/data/freeTunings';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
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

// Mock the HTTP boundary so the real rename/delete mutation hooks run against spies.
const mockApiClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ apiClient: mockApiClient, default: mockApiClient }));

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
  mockApiClient.patch.mockReset().mockResolvedValue(undefined);
  mockApiClient.del.mockReset().mockResolvedValue(undefined);
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

describe('ControlBar — rename/delete actions (Task 9)', () => {
  const CUSTOM: CustomTuning = {
    id: 7, name: 'My Drop C', strings: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'], createdAt: null,
  };

  // Premium user with `My Drop C` custom tuning active.
  const setupActiveCustom = () => {
    useSubscriptionStore.setState({ isPremium: true });
    mockState.tunings = [CUSTOM];
    useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, tuning: 'My Drop C' });
  };

  it('non-premium: no rename/delete action buttons', () => {
    mockState.tunings = [CUSTOM];
    useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, tuning: 'My Drop C' });
    renderBar();
    expect(screen.queryByRole('button', { name: 'Rename tuning' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete tuning' })).not.toBeInTheDocument();
  });

  it('premium + predefined tuning active: no rename/delete buttons', () => {
    useSubscriptionStore.setState({ isPremium: true });
    mockState.tunings = [CUSTOM];
    // Active tuning is the predefined default (Standard E), not a custom one.
    renderBar();
    expect(screen.queryByRole('button', { name: 'Rename tuning' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete tuning' })).not.toBeInTheDocument();
  });

  it('premium + custom tuning active: shows rename and delete buttons', () => {
    setupActiveCustom();
    renderBar();
    expect(screen.getByRole('button', { name: 'Rename tuning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete tuning' })).toBeInTheDocument();
  });

  it('rename: opens a sheet with the current name prefilled', async () => {
    const user = userEvent.setup();
    setupActiveCustom();
    renderBar();
    await user.click(screen.getByRole('button', { name: 'Rename tuning' }));
    const input = await screen.findByPlaceholderText('New tuning name');
    expect(input).toHaveValue('My Drop C');
  });

  it('rename: submitting issues PATCH with the new name and existing strings', async () => {
    const user = userEvent.setup();
    setupActiveCustom();
    renderBar();
    await user.click(screen.getByRole('button', { name: 'Rename tuning' }));
    const input = await screen.findByPlaceholderText('New tuning name');
    await user.clear(input);
    await user.type(input, 'My Drop B');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockApiClient.patch).toHaveBeenCalledWith('/tunings/7', {
      name: 'My Drop B',
      strings: CUSTOM.strings,
    });
  });

  it('delete: confirmation sheet names the tuning and warns when it is in use', async () => {
    const user = userEvent.setup();
    setupActiveCustom();
    renderBar();
    await user.click(screen.getByRole('button', { name: 'Delete tuning' }));
    // Active custom tuning → confirmation names it, warns it is in use, and notes irreversibility.
    expect(await screen.findByText(/Delete "My Drop C"\?/)).toBeInTheDocument();
    expect(screen.getByText(/currently in use/)).toBeInTheDocument();
    expect(screen.getByText(/This cannot be undone\./)).toBeInTheDocument();
  });

  it('delete: confirming issues DELETE and falls back to Standard E', async () => {
    const user = userEvent.setup();
    setupActiveCustom();
    renderBar();
    await user.click(screen.getByRole('button', { name: 'Delete tuning' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(mockApiClient.del).toHaveBeenCalledWith('/tunings/7');
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

describe('ControlBar — overhaul affordance (Story 5.2)', () => {
  it('action buttons carry visible desktop labels', () => {
    renderBar();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Draw')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('account label reads "Account" when authenticated', () => {
    try {
      useAuthStore.setState({
        user: { id: 1, name: 'Voice', email: 'v@example.com' },
        accessToken: 'tok',
      });
      renderBar();
      expect(screen.getByText('Account')).toBeInTheDocument();
    } finally {
      useAuthStore.getState().clearAuth();
    }
  });

  it('replaces native title tooltips (no title attribute on action buttons)', () => {
    useThemeStore.setState({ theme: 'dark' });
    useSubscriptionStore.setState({ isPremium: true });
    mockState.tunings = [{ id: 7, name: 'My Drop C', strings: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'], createdAt: null }];
    useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE, tuning: 'My Drop C' });
    renderBar();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'Toggle note names' })).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'Toggle freeform mode' })).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'Library' })).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'Rename tuning' })).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'Delete tuning' })).not.toHaveAttribute('title');
  });

  it('note-name toggle still flips store state after the restyle', async () => {
    const user = userEvent.setup();
    renderBar();
    expect(useFretboardStore.getState().noteNamesVisible).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Toggle note names' }));
    expect(useFretboardStore.getState().noteNamesVisible).toBe(true);
  });
});
