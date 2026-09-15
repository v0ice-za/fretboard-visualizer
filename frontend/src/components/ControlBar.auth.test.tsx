import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import ControlBar from './ControlBar';
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAuthStore, DEFAULT_AUTH, selectIsAuthenticated } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { queryClient } from '@/lib/queryClient';
import { apiClient } from '@/lib/apiClient';
import { subscriptionQueryKey } from '@/hooks/useSubscription';

vi.mock('@/lib/apiClient', () => ({
  apiClient: { post: vi.fn().mockResolvedValue(undefined), get: vi.fn(), del: vi.fn() },
}));

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
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE });
  useLayoutStore.setState({ activeLayout: DEFAULT_LAYOUT });
  useAuthStore.setState({ ...DEFAULT_AUTH });
  useSubscriptionStore.setState({ isPremium: false });
  vi.clearAllMocks();
});

// ControlBar now reads custom tunings via TanStack Query — provide the app's client.
const renderBar = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <ControlBar />
    </QueryClientProvider>,
  );

describe('ControlBar — account/auth', () => {
  it('shows the "Sign in" affordance when unauthenticated', () => {
    renderBar();
    expect(screen.getByLabelText('Sign in')).toBeInTheDocument();
    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
  });

  it('shows the "Account" affordance when authenticated', () => {
    useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } });
    renderBar();
    expect(screen.getByLabelText('Account')).toBeInTheDocument();
  });

  it('logout clears both stores, removes the subscription query, and calls the endpoint', async () => {
    useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } });
    useSubscriptionStore.setState({ isPremium: true });
    const removeSpy = vi.spyOn(queryClient, 'removeQueries');
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByLabelText('Account'));
    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(selectIsAuthenticated(useAuthStore.getState())).toBe(false));
    expect(useSubscriptionStore.getState().isPremium).toBe(false);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: subscriptionQueryKey });
  });

  describe('theme picker (Story 4.5)', () => {
    it('the Account sheet includes the theme picker', async () => {
      useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } });
      const user = userEvent.setup();
      renderBar();

      await user.click(screen.getByLabelText('Account'));
      expect(await screen.findByText('Theme')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(6);
    });

    it('clicking a locked premium theme in the Account sheet opens the paywall card', async () => {
      useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } });
      useSubscriptionStore.setState({ isPremium: false });
      const user = userEvent.setup();
      renderBar();

      await user.click(screen.getByLabelText('Account'));
      await user.click(await screen.findByRole('option', { name: /Neon/ }));

      expect(await screen.findByTestId('paywall-card')).toBeInTheDocument();
    });
  });
});
