import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSubscription } from './useSubscription';
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { apiClient } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), del: vi.fn() },
}));

const get = apiClient.get as unknown as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAuthStore.setState({ ...DEFAULT_AUTH });
  useSubscriptionStore.setState({ isPremium: false });
  vi.clearAllMocks();
});

describe('useSubscription', () => {
  it('maps status ACTIVE to isPremium true when authenticated', async () => {
    get.mockResolvedValue({ status: 'ACTIVE', currentPeriodEnd: null });
    useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a', name: null }, isAuthenticated: true });

    renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => expect(useSubscriptionStore.getState().isPremium).toBe(true));
    expect(get).toHaveBeenCalledWith('/subscriptions/me');
  });

  it('maps a non-ACTIVE status to isPremium false', async () => {
    get.mockResolvedValue({ status: 'NONE', currentPeriodEnd: null });
    useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a', name: null }, isAuthenticated: true });
    useSubscriptionStore.setState({ isPremium: true });

    renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => expect(useSubscriptionStore.getState().isPremium).toBe(false));
  });

  it('resets isPremium to false and does not fetch when unauthenticated', async () => {
    useSubscriptionStore.setState({ isPremium: true });

    renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => expect(useSubscriptionStore.getState().isPremium).toBe(false));
    expect(get).not.toHaveBeenCalled();
  });
});
